from django.urls import path

from .views import (
    AnalyticsView,
    ApiRootView,
    HealthView,
    StatsView,
    TaskCalendarSyncClearView,
    TaskCalendarSyncDetailView,
    TaskDetailView,
    TaskExportView,
    TaskListCreateView,
)


urlpatterns = [
    path("", ApiRootView.as_view(), name="task-root"),
    path("health/", HealthView.as_view(), name="task-health"),
    path("tasks/", TaskListCreateView.as_view(), name="task-list-create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task-detail"),
    path("stats/", StatsView.as_view(), name="stats"),
    path("analytics/", AnalyticsView.as_view(), name="analytics"),
    path("internal/tasks/export/", TaskExportView.as_view(), name="task-export"),
    path(
        "internal/tasks/<int:pk>/calendar-sync/",
        TaskCalendarSyncDetailView.as_view(),
        name="task-calendar-sync-detail",
    ),
    path(
        "internal/tasks/calendar-sync/clear/",
        TaskCalendarSyncClearView.as_view(),
        name="task-calendar-sync-clear",
    ),
]
