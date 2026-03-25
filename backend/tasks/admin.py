from django.contrib import admin

from .models import GoogleCalendarConnection, Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "user",
        "status",
        "priority",
        "due_date",
        "google_calendar_last_synced_at",
        "created_at",
    )
    list_filter = ("status", "priority", "created_at")
    search_fields = ("title", "description", "user__username", "user__email")


@admin.register(GoogleCalendarConnection)
class GoogleCalendarConnectionAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "calendar_id",
        "calendar_summary",
        "calendar_timezone",
        "last_synced_at",
        "connected_at",
        "updated_at",
    )
    search_fields = ("user__username", "user__email", "calendar_summary", "calendar_id")
