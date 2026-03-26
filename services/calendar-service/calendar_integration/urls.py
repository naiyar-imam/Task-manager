from django.urls import path

from .views import (
    ApiRootView,
    GoogleCalendarAuthorizeView,
    GoogleCalendarCallbackView,
    GoogleCalendarDisconnectView,
    GoogleCalendarStatusView,
    GoogleCalendarSyncView,
    HealthView,
)


urlpatterns = [
    path("", ApiRootView.as_view(), name="calendar-root"),
    path("health/", HealthView.as_view(), name="calendar-health"),
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
