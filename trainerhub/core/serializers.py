from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Settings, FocusStat, JournalEntry, PokemonProgress, XPLog

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name"]


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = ["goal_minutes", "theme", "partner_pokemon"]


class FocusStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = FocusStat
        fields = ["date", "minutes", "sessions", "xp_gained"]


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ["date", "text", "mood", "tags", "media"]


class PokemonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PokemonProgress
        fields = ["pokemon_id", "xp", "level", "captured_at", "sessions_contributed"]


class XPLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPLog
        fields = ["ts", "delta", "reason"]
