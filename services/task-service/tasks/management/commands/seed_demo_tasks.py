from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tasks.models import Task


DEMO_TASKS = [
    {
        "title": "Design Landing Page",
        "description": "Finalize the hero section, CTA hierarchy, and responsive layout polish.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.HIGH,
        "due_days": 0,
        "due_hour": 16,
        "created_days": 9,
    },
    {
        "title": "Write Project Report",
        "description": "Document the project goals, architecture, APIs, and evaluation notes.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.MEDIUM,
        "due_days": 2,
        "due_hour": 14,
        "created_days": 8,
    },
    {
        "title": "Team Meeting Notes",
        "description": "Summarize blockers, stakeholder decisions, and next sprint action items.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.LOW,
        "due_days": 3,
        "due_hour": 11,
        "created_days": 6,
    },
    {
        "title": "UI Design Review",
        "description": "Review the dashboard card hierarchy, chart readability, and mobile layout.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.HIGH,
        "due_days": 0,
        "due_hour": 15,
        "created_days": 5,
    },
    {
        "title": "Client Meeting",
        "description": "Prepare talking points and demo flow for the client sync.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.MEDIUM,
        "due_days": 1,
        "due_hour": 11,
        "created_days": 4,
    },
    {
        "title": "Report Submission",
        "description": "Submit the polished final academic report to the evaluation portal.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.HIGH,
        "due_days": -2,
        "due_hour": 18,
        "created_days": 10,
    },
    {
        "title": "Code Deployment",
        "description": "Prepare the production deployment checklist and release notes.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.HIGH,
        "due_days": -1,
        "due_hour": 19,
        "created_days": 7,
    },
    {
        "title": "Homepage Redesign",
        "description": "Refresh the homepage layout with stronger messaging.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.MEDIUM,
        "due_days": -2,
        "due_hour": 17,
        "created_days": 13,
        "completed_days": 2,
    },
    {
        "title": "API Integration",
        "description": "Connect the dashboard widgets to the analytics and stats endpoints.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.HIGH,
        "due_days": -3,
        "due_hour": 15,
        "created_days": 15,
        "completed_days": 3,
    },
    {
        "title": "Analytics Dashboard",
        "description": "Validate chart data mapping for status distribution and trend visualizations.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.MEDIUM,
        "due_days": -5,
        "due_hour": 13,
        "created_days": 17,
        "completed_days": 4,
    },
    {
        "title": "Onboarding Flow",
        "description": "Improve the registration and login flow with better feedback.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.LOW,
        "due_days": 5,
        "due_hour": 12,
        "created_days": 4,
    },
    {
        "title": "Database Optimization",
        "description": "Review query performance around filters and aggregation endpoints.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.HIGH,
        "due_days": 2,
        "due_hour": 17,
        "created_days": 8,
    },
]


class Command(BaseCommand):
    help = "Seed demo tasks for a specific auth-service user id."

    def add_arguments(self, parser):
        parser.add_argument("--user-id", type=int, required=True)
        parser.add_argument("--wipe", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        user_id = options["user_id"]
        should_wipe = options["wipe"]

        if should_wipe:
            Task.objects.filter(user_id=user_id).delete()

        now = timezone.localtime()
        seeded_count = 0

        for index, spec in enumerate(DEMO_TASKS):
            due_date = (now + timedelta(days=spec["due_days"])).replace(
                hour=spec["due_hour"],
                minute=0,
                second=0,
                microsecond=0,
            )
            created_at = now - timedelta(days=spec["created_days"], hours=index % 5)

            task, _ = Task.objects.update_or_create(
                user_id=user_id,
                title=spec["title"],
                defaults={
                    "description": spec["description"],
                    "status": spec["status"],
                    "priority": spec["priority"],
                    "due_date": due_date,
                },
            )

            if spec["status"] == Task.Status.COMPLETED:
                completed_at = (now - timedelta(days=spec["completed_days"])).replace(
                    hour=18 - (index % 4),
                    minute=30,
                    second=0,
                    microsecond=0,
                )
                updated_at = completed_at
            elif spec["status"] == Task.Status.IN_PROGRESS:
                completed_at = None
                updated_at = min(now, created_at + timedelta(days=1, hours=6))
            else:
                completed_at = None
                updated_at = min(now, created_at + timedelta(hours=8))

            Task.objects.filter(pk=task.pk).update(
                created_at=created_at,
                updated_at=updated_at,
                completed_at=completed_at,
            )
            seeded_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {seeded_count} demo tasks for auth-service user id {user_id}."
            )
        )
