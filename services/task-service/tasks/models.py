from django.db import models
from django.utils import timezone


class Task(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    user_id = models.PositiveBigIntegerField(db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    priority = models.CharField(
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )
    due_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    google_calendar_event_id = models.CharField(max_length=255, blank=True)
    google_calendar_event_link = models.URLField(blank=True)
    google_calendar_last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("due_date", "-created_at")

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
            if update_fields is not None:
                update_fields = set(update_fields)
                update_fields.add("completed_at")
        if self.status != self.Status.COMPLETED and self.completed_at is not None:
            self.completed_at = None
            if update_fields is not None:
                update_fields = set(update_fields)
                update_fields.add("completed_at")
        if update_fields is not None:
            kwargs["update_fields"] = list(update_fields)
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        return self.status != self.Status.COMPLETED and self.due_date < timezone.now()

    def __str__(self):
        return f"{self.title} ({self.user_id})"
