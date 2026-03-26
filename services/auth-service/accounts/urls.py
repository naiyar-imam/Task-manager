from django.urls import path

from .views import (
    ApiRootView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    HealthView,
    MeView,
    RegisterView,
)


urlpatterns = [
    path("", ApiRootView.as_view(), name="auth-root"),
    path("health/", HealthView.as_view(), name="auth-health"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
]
