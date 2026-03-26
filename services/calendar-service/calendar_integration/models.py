from django.db import models


class GoogleCalendarConnection(models.Model):
    user_id = models.PositiveBigIntegerField(unique=True, db_index=True)
    username = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    calendar_id = models.CharField(max_length=255, default="primary")
    calendar_summary = models.CharField(max_length=255, blank=True)
    calendar_timezone = models.CharField(max_length=100, blank=True)
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_uri = models.URLField(default="https://oauth2.googleapis.com/token")
    scope = models.TextField(blank=True)
    expiry = models.DateTimeField(null=True, blank=True)
    sync_token = models.TextField(blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return f"Google Calendar ({self.user_id})"
