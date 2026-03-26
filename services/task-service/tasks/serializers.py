from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(
        source="get_priority_display",
        read_only=True,
    )
    google_calendar_synced = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "status_display",
            "priority",
            "priority_display",
            "due_date",
            "created_at",
            "updated_at",
            "completed_at",
            "is_overdue",
            "google_calendar_synced",
            "google_calendar_event_id",
            "google_calendar_event_link",
            "google_calendar_last_synced_at",
        )
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "completed_at",
            "is_overdue",
            "google_calendar_synced",
            "google_calendar_event_id",
            "google_calendar_event_link",
            "google_calendar_last_synced_at",
        )

    def get_google_calendar_synced(self, obj):
        return bool(obj.google_calendar_event_id)


class TaskCalendarSyncSerializer(serializers.Serializer):
    google_calendar_event_id = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
    )
    google_calendar_event_link = serializers.URLField(required=False, allow_blank=True)
    google_calendar_last_synced_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
    )
