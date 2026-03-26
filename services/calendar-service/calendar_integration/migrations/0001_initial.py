from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="GoogleCalendarConnection",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("user_id", models.PositiveBigIntegerField(db_index=True, unique=True)),
                ("username", models.CharField(blank=True, max_length=150)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("calendar_id", models.CharField(default="primary", max_length=255)),
                ("calendar_summary", models.CharField(blank=True, max_length=255)),
                ("calendar_timezone", models.CharField(blank=True, max_length=100)),
                ("access_token", models.TextField(blank=True)),
                ("refresh_token", models.TextField(blank=True)),
                ("token_uri", models.URLField(default="https://oauth2.googleapis.com/token")),
                ("scope", models.TextField(blank=True)),
                ("expiry", models.DateTimeField(blank=True, null=True)),
                ("sync_token", models.TextField(blank=True)),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                ("connected_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ("-updated_at",),
            },
        ),
    ]
