from django.contrib.auth import get_user_model
from rest_framework import viewsets, permissions, mixins, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Settings, FocusStat, JournalEntry, PokemonProgress, XPLog
from .serializers import (
    UserSerializer,
    SettingsSerializer,
    FocusStatSerializer,
    JournalEntrySerializer,
    PokemonProgressSerializer,
    XPLogSerializer,
)

User = get_user_model()


class MeViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user_data = UserSerializer(request.user).data
        settings, _ = Settings.objects.get_or_create(user=request.user)
        data = {
            "user": user_data,
            "settings": SettingsSerializer(settings).data,
        }
        return Response(data)


class SettingsViewSet(mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    serializer_class = SettingsSerializer

    def get_object(self):
        obj, _ = Settings.objects.get_or_create(user=self.request.user)
        return obj


class FocusStatViewSet(viewsets.ModelViewSet):
    serializer_class = FocusStatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FocusStat.objects.filter(user=self.request.user).order_by("-date")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "date"

    def get_queryset(self):
        return JournalEntry.objects.filter(user=self.request.user).order_by("-date")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PokemonProgressViewSet(viewsets.ModelViewSet):
    serializer_class = PokemonProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pokemon_id"

    def get_queryset(self):
        return PokemonProgress.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"])
    def gain_xp(self, request):
        pokemon_id = request.data.get("pokemon_id")
        delta = int(request.data.get("delta", 0))
        prog, _ = PokemonProgress.objects.get_or_create(user=request.user, pokemon_id=pokemon_id)
        prog.xp += delta
        prog.level = calculate_level(prog.xp)
        prog.save()
        XPLog.objects.create(user=request.user, delta=delta, reason=f"XP for {pokemon_id}")
        return Response(PokemonProgressSerializer(prog).data)


class XPLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = XPLogSerializer

    def get_queryset(self):
        return XPLog.objects.filter(user=self.request.user).order_by("-ts")


# Helper for level thresholds
LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250]


def calculate_level(xp: int) -> int:
    level = 1
    for idx, thresh in enumerate(LEVEL_THRESHOLDS, start=1):
        if xp >= thresh:
            level = idx
    return level


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        password = request.data.get("password")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get("email")
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=serializer.validated_data.get("first_name", ""),
            last_name=serializer.validated_data.get("last_name", ""),
        )
        headers = self.get_success_headers(serializer.data)
        return Response(UserSerializer(user).data, headers=headers)
