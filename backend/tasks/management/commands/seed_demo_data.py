from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tasks.models import Task


DEMO_TASKS = [
    {
        "title": "Design Landing Page",
        "description": "Finalize the dark hero section, CTA hierarchy, and responsive layout polish.",
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
        "description": "Prepare talking points, demo flow, and feedback capture notes for the client sync.",
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
        "description": "Prepare the production deployment checklist and release note summary.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.HIGH,
        "due_days": -1,
        "due_hour": 19,
        "created_days": 7,
    },
    {
        "title": "Homepage Redesign",
        "description": "Refresh the homepage layout with stronger messaging and visual rhythm.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.MEDIUM,
        "due_days": -2,
        "due_hour": 17,
        "created_days": 13,
        "completed_days": 2,
    },
    {
        "title": "API Integration",
        "description": "Connect the dashboard widgets to the DRF analytics and stats endpoints.",
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
        "description": "Improve the registration and login flow with better feedback and layout clarity.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.LOW,
        "due_days": 5,
        "due_hour": 12,
        "created_days": 4,
    },
    {
        "title": "Database Optimization",
        "description": "Review query performance around filters, sorting, and aggregation endpoints.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.HIGH,
        "due_days": 2,
        "due_hour": 17,
        "created_days": 8,
    },
    {
        "title": "Sprint Planning",
        "description": "Break the remaining work into crisp, realistic delivery milestones.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.LOW,
        "due_days": -7,
        "due_hour": 10,
        "created_days": 20,
        "completed_days": 7,
    },
    {
        "title": "User Interview Notes",
        "description": "Capture insights from usability sessions and translate them into product changes.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.MEDIUM,
        "due_days": -8,
        "due_hour": 16,
        "created_days": 18,
        "completed_days": 6,
    },
    {
        "title": "Marketing Assets",
        "description": "Create short copy snippets and visuals for showcasing the dashboard in a portfolio.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.MEDIUM,
        "due_days": 4,
        "due_hour": 13,
        "created_days": 3,
    },
    {
        "title": "Mobile QA Pass",
        "description": "Test responsive cards, sidebar behavior, and modal usability on smaller screens.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.HIGH,
        "due_days": 1,
        "due_hour": 18,
        "created_days": 4,
    },
    {
        "title": "Payment Gateway Audit",
        "description": "Review edge-case states and secure handling patterns for future billing work.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.HIGH,
        "due_days": -4,
        "due_hour": 14,
        "created_days": 11,
    },
    {
        "title": "Notification Center",
        "description": "Polish notification badges, preview items, and visual emphasis states.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.MEDIUM,
        "due_days": -2,
        "due_hour": 11,
        "created_days": 9,
        "completed_days": 1,
    },
    {
        "title": "Calendar Sync",
        "description": "Plan the upcoming calendar integration and due-date sync behavior.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.LOW,
        "due_days": 7,
        "due_hour": 10,
        "created_days": 2,
    },
    {
        "title": "Performance Benchmark",
        "description": "Measure the dashboard render path and interaction smoothness after cleanup.",
        "status": Task.Status.IN_PROGRESS,
        "priority": Task.Priority.HIGH,
        "due_days": 3,
        "due_hour": 16,
        "created_days": 5,
    },
    {
        "title": "Team Retrospective",
        "description": "Reflect on wins, friction points, and quality improvements for the next cycle.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.LOW,
        "due_days": -9,
        "due_hour": 12,
        "created_days": 22,
        "completed_days": 8,
    },
    {
        "title": "Content Review",
        "description": "Review the case study narrative, captions, and app copy before submission.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.MEDIUM,
        "due_days": 0,
        "due_hour": 18,
        "created_days": 3,
    },
    {
        "title": "Security Checklist",
        "description": "Confirm auth flow expectations, protected routes, and API permission boundaries.",
        "status": Task.Status.PENDING,
        "priority": Task.Priority.HIGH,
        "due_days": -3,
        "due_hour": 12,
        "created_days": 8,
    },
    {
        "title": "Prepare Demo Walkthrough",
        "description": "Create a smooth test script for showing the dashboard, analytics, and CRUD flow.",
        "status": Task.Status.COMPLETED,
        "priority": Task.Priority.MEDIUM,
        "due_days": -1,
        "due_hour": 17,
        "created_days": 6,
        "completed_days": 1,
    },
]


class Command(BaseCommand):
    help = "Seed a polished demo user and task dataset for local testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            default="nehasharma",
            help="Username for the demo account.",
        )
        parser.add_argument(
            "--email",
            default="neha@example.com",
            help="Email for the demo account.",
        )
        parser.add_argument(
            "--password",
            default="Demo@12345",
            help="Password for the demo account.",
        )
        parser.add_argument(
            "--wipe",
            action="store_true",
            help="Delete existing tasks for the demo user before reseeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        username = options["username"]
        email = options["email"]
        password = options["password"]
        should_wipe = options["wipe"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": "Neha",
                "last_name": "Sharma",
            },
        )

        user.email = email
        user.first_name = "Neha"
        user.last_name = "Sharma"
        user.set_password(password)
        user.save()

        if should_wipe:
            Task.objects.filter(user=user).delete()

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

            defaults = {
                "description": spec["description"],
                "status": spec["status"],
                "priority": spec["priority"],
                "due_date": due_date,
            }

            task, _ = Task.objects.update_or_create(
                user=user,
                title=spec["title"],
                defaults=defaults,
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

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Demo user {action}: {username}"))
        self.stdout.write(self.style.SUCCESS(f"Password: {password}"))
        self.stdout.write(self.style.SUCCESS(f"Seeded {seeded_count} demo tasks."))
        self.stdout.write("Use --wipe if you want to reset the demo dataset cleanly.")
