"""
URL configuration for trainerhub project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from core.views import (
    MeViewSet,
    SettingsViewSet,
    FocusStatViewSet,
    JournalEntryViewSet,
    PokemonProgressViewSet,
    XPLogViewSet,
)

router = routers.DefaultRouter()
router.register(r"me", MeViewSet, basename="me")
router.register(r"settings", SettingsViewSet, basename="settings")
router.register(r"focus", FocusStatViewSet, basename="focus")
router.register(r"journal", JournalEntryViewSet, basename="journal")
router.register(r"pokemon", PokemonProgressViewSet, basename="pokemon")
router.register(r"xplog", XPLogViewSet, basename="xplog")

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from core.views import RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
