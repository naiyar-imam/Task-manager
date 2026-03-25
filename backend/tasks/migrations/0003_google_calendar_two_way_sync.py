from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0002_google_calendar_integration"),
    ]

    operations = [
        migrations.AddField(
            model_name="googlecalendarconnection",
            name="last_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="googlecalendarconnection",
            name="sync_token",
            field=models.TextField(blank=True),
        ),
    ]
