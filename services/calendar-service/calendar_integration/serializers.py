from rest_framework import serializers

from .models import GoogleCalendarConnection


class GoogleCalendarConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleCalendarConnection
        fields = (
            "calendar_id",
            "calendar_summary",
            "calendar_timezone",
            "last_synced_at",
            "connected_at",
            "updated_at",
        )
