from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AnalyticsView,
    ApiRootView,
    CustomTokenObtainPairView,
    GoogleCalendarAuthorizeView,
    GoogleCalendarCallbackView,
    GoogleCalendarDisconnectView,
    GoogleCalendarStatusView,
    GoogleCalendarSyncView,
    HealthView,
    MeView,
    RegisterView,
    StatsView,
    TaskDetailView,
    TaskListCreateView,
)


urlpatterns = [
    path("", ApiRootView.as_view(), name="api-root"),
    path("health/", HealthView.as_view(), name="health"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("tasks/", TaskListCreateView.as_view(), name="task-list-create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task-detail"),
    path("stats/", StatsView.as_view(), name="stats"),
    path("analytics/", AnalyticsView.as_view(), name="analytics"),
    path(
        "integrations/google/authorize/",
        GoogleCalendarAuthorizeView.as_view(),
        name="google-calendar-authorize",
    ),
    path(
        "integrations/google/callback/",
        GoogleCalendarCallbackView.as_view(),
        name="google-calendar-callback",
    ),
    path(
        "integrations/google/status/",
        GoogleCalendarStatusView.as_view(),
        name="google-calendar-status",
    ),
    path(
        "integrations/google/sync/",
        GoogleCalendarSyncView.as_view(),
        name="google-calendar-sync",
    ),
    path(
        "integrations/google/disconnect/",
        GoogleCalendarDisconnectView.as_view(),
        name="google-calendar-disconnect",
    ),
]
