from django.contrib.auth.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed the demo auth user for the microservice setup."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="nehasharma")
        parser.add_argument("--email", default="neha@example.com")
        parser.add_argument("--password", default="Demo@12345")

    def handle(self, *args, **options):
        username = options["username"]
        email = options["email"]
        password = options["password"]

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

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Demo user {action}: {username}"))
        self.stdout.write(self.style.SUCCESS(f"User ID: {user.id}"))
        self.stdout.write(self.style.SUCCESS(f"Password: {password}"))
