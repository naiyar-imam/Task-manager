from datetime import datetime, time, timedelta
from urllib.parse import quote
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core import signing
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google_auth_oauthlib.flow import Flow

from .models import GoogleCalendarConnection, Task

GOOGLE_OAUTH_STATE_SALT = "google-calendar-oauth"
GOOGLE_OAUTH_STATE_MAX_AGE = 600
GOOGLE_SYNC_APP_ID = "ai-task-dashboard"
GOOGLE_SYNC_MARKER = "-- Synced by AI-Powered Task Management Dashboard --"
GOOGLE_SYNC_PAGE_SIZE = 250
GOOGLE_ALL_DAY_TASK_HOUR = 18
SUPPORTED_GOOGLE_EVENT_TYPES = {"default"}


def google_calendar_is_configured():
    return all(
        [
            settings.GOOGLE_CLIENT_ID,
            settings.GOOGLE_CLIENT_SECRET,
            settings.GOOGLE_CALENDAR_REDIRECT_URI,
            settings.FRONTEND_BASE_URL,
        ]
    )


def get_missing_google_calendar_settings():
    missing = []
    if not settings.GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if not settings.GOOGLE_CLIENT_SECRET:
        missing.append("GOOGLE_CLIENT_SECRET")
    if not settings.GOOGLE_CALENDAR_REDIRECT_URI:
        missing.append("GOOGLE_CALENDAR_REDIRECT_URI")
    if not settings.FRONTEND_BASE_URL:
        missing.append("FRONTEND_BASE_URL")
    return missing


def build_google_client_config():
    return {
        "web": {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_CALENDAR_REDIRECT_URI],
            "javascript_origins": [settings.FRONTEND_BASE_URL],
        }
    }


def build_google_oauth_flow(state=None):
    flow = Flow.from_client_config(
        build_google_client_config(),
        scopes=settings.GOOGLE_CALENDAR_SCOPES,
        state=state,
    )
    flow.redirect_uri = settings.GOOGLE_CALENDAR_REDIRECT_URI
    return flow


def build_oauth_state(user_id):
    return signing.dumps({"user_id": user_id}, salt=GOOGLE_OAUTH_STATE_SALT)


def parse_oauth_state(state):
    return signing.loads(
        state,
        salt=GOOGLE_OAUTH_STATE_SALT,
        max_age=GOOGLE_OAUTH_STATE_MAX_AGE,
    )


def persist_credentials(connection, credentials):
    connection.access_token = credentials.token or ""
    connection.refresh_token = credentials.refresh_token or connection.refresh_token
    connection.token_uri = credentials.token_uri or connection.token_uri
    connection.scope = " ".join(credentials.scopes or settings.GOOGLE_CALENDAR_SCOPES)
    connection.expiry = credentials.expiry
    connection.save(
        update_fields=[
            "access_token",
            "refresh_token",
            "token_uri",
            "scope",
            "expiry",
            "updated_at",
        ]
    )


def build_credentials(connection):
    credentials = Credentials(
        token=connection.access_token,
        refresh_token=connection.refresh_token,
        token_uri=connection.token_uri,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=connection.scope.split() or settings.GOOGLE_CALENDAR_SCOPES,
    )

    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())
        persist_credentials(connection, credentials)

    return credentials


def get_calendar_service(connection):
    credentials = build_credentials(connection)
    return build("calendar", "v3", credentials=credentials, cache_discovery=False)


def sync_calendar_metadata(connection):
    service = get_calendar_service(connection)
    calendar = service.calendars().get(calendarId=connection.calendar_id).execute()
    connection.calendar_summary = calendar.get("summary", "")
    connection.calendar_timezone = calendar.get("timeZone", "") or settings.TIME_ZONE
    connection.save(update_fields=["calendar_summary", "calendar_timezone", "updated_at"])
    return connection


def create_or_update_connection(user, credentials):
    connection, _ = GoogleCalendarConnection.objects.get_or_create(
        user=user,
        defaults={"calendar_id": settings.GOOGLE_CALENDAR_ID},
    )

    fields_to_update = ["updated_at"]
    if connection.calendar_id != settings.GOOGLE_CALENDAR_ID:
        connection.calendar_id = settings.GOOGLE_CALENDAR_ID
        connection.sync_token = ""
        connection.last_synced_at = None
        fields_to_update.extend(["calendar_id", "sync_token", "last_synced_at"])

    if fields_to_update != ["updated_at"]:
        connection.save(update_fields=fields_to_update)

    persist_credentials(connection, credentials)
    return sync_calendar_metadata(connection)


def build_task_event_payload(task, calendar_timezone):
    due_at = timezone.localtime(task.due_date)
    end_at = due_at + timedelta(hours=1)
    task_url = f"{settings.FRONTEND_BASE_URL}/tasks?search={quote(task.title)}"

    description_lines = []
    if task.description:
        description_lines.append(task.description.strip())
        description_lines.append("")

    description_lines.extend(
        [
            GOOGLE_SYNC_MARKER,
            f"Status: {task.get_status_display()}",
            f"Priority: {task.get_priority_display()}",
            "Managed in: AI-Powered Task Management Dashboard",
            f"Workspace link: {task_url}",
        ]
    )

    return {
        "summary": task.title,
        "description": "\n".join(description_lines),
        "start": {
            "dateTime": due_at.isoformat(),
            "timeZone": calendar_timezone or settings.TIME_ZONE,
        },
        "end": {
            "dateTime": end_at.isoformat(),
            "timeZone": calendar_timezone or settings.TIME_ZONE,
        },
        "source": {
            "title": "AI-Powered Task Management Dashboard",
            "url": task_url,
        },
        "extendedProperties": {
            "private": {
                "app": GOOGLE_SYNC_APP_ID,
                "taskId": str(task.id),
                "status": task.status,
                "priority": task.priority,
            }
        },
        "reminders": {
            "useDefault": False,
            "overrides": [{"method": "popup", "minutes": 30}],
        },
    }


def clean_task_description(description):
    if not description:
        return ""

    if GOOGLE_SYNC_MARKER in description:
        return description.split(GOOGLE_SYNC_MARKER, 1)[0].rstrip()

    lines = description.splitlines()
    footer_prefixes = (
        "Status:",
        "Priority:",
        "Managed in:",
        "Workspace link:",
    )

    while lines and not lines[-1].strip():
        lines.pop()

    while lines and any(lines[-1].startswith(prefix) for prefix in footer_prefixes):
        lines.pop()

    while lines and not lines[-1].strip():
        lines.pop()

    return "\n".join(lines).strip()


def parse_google_due_date(event, fallback_timezone):
    start_data = event.get("start") or {}
    timezone_name = start_data.get("timeZone") or fallback_timezone or settings.TIME_ZONE
    event_timezone = ZoneInfo(timezone_name)

    date_time_value = start_data.get("dateTime")
    if date_time_value:
        due_at = parse_datetime(date_time_value)
        if due_at is None:
            raise ValueError("Invalid Google Calendar dateTime value.")
        if timezone.is_naive(due_at):
            due_at = timezone.make_aware(due_at, event_timezone)
        return due_at.astimezone(event_timezone)

    date_value = start_data.get("date")
    if date_value:
        event_date = parse_date(date_value)
        if event_date is None:
            raise ValueError("Invalid Google Calendar date value.")
        due_naive = datetime.combine(
            event_date,
            time(hour=GOOGLE_ALL_DAY_TASK_HOUR),
        )
        return timezone.make_aware(due_naive, event_timezone)

    raise ValueError("Google Calendar event does not include a start time.")


def build_task_values_from_event(event, connection):
    private_props = ((event.get("extendedProperties") or {}).get("private") or {})
    valid_statuses = {choice for choice, _ in Task.Status.choices}
    valid_priorities = {choice for choice, _ in Task.Priority.choices}

    title = (event.get("summary") or "Untitled Google Event").strip()
    description = clean_task_description(event.get("description", ""))
    due_date = parse_google_due_date(event, connection.calendar_timezone)
    status = private_props.get("status")
    priority = private_props.get("priority")

    return {
        "title": title or "Untitled Google Event",
        "description": description,
        "due_date": due_date,
        "status": status if status in valid_statuses else None,
        "priority": priority if priority in valid_priorities else None,
        "google_calendar_event_id": event.get("id", ""),
        "google_calendar_event_link": event.get("htmlLink", ""),
        "google_calendar_last_synced_at": timezone.now(),
    }


def find_existing_task_for_event(user, event):
    event_id = event.get("id", "")
    private_props = ((event.get("extendedProperties") or {}).get("private") or {})
    raw_task_id = private_props.get("taskId", "")

    task = None
    if event_id:
        task = user.tasks.filter(google_calendar_event_id=event_id).first()

    if not task and raw_task_id.isdigit():
        task = user.tasks.filter(pk=int(raw_task_id)).first()

    return task, private_props


def find_matching_unsynced_task(user, title, due_date):
    time_window = timedelta(minutes=5)
    return (
        user.tasks.filter(
            google_calendar_event_id="",
            title__iexact=title,
            due_date__gte=due_date - time_window,
            due_date__lte=due_date + time_window,
        )
        .order_by("-updated_at")
        .first()
    )


def import_google_event_to_task(user, connection, event):
    task, private_props = find_existing_task_for_event(user, event)
    raw_task_id = private_props.get("taskId", "")
    event_status = event.get("status")
    event_type = event.get("eventType", "default")

    if event_status == "cancelled":
        if task:
            task.delete()
            return {"status": "deleted"}
        if raw_task_id.isdigit():
            return {"status": "skipped", "reason": "managed_event_missing_task"}
        return {"status": "skipped", "reason": "cancelled_event_not_mapped"}

    if event_type not in SUPPORTED_GOOGLE_EVENT_TYPES:
        return {"status": "skipped", "reason": "unsupported_event_type"}

    values = build_task_values_from_event(event, connection)

    if not task and raw_task_id.isdigit():
        return {"status": "skipped", "reason": "managed_event_missing_task"}

    if not task:
        task = find_matching_unsynced_task(user, values["title"], values["due_date"])

    if task:
        values["status"] = values["status"] or task.status
        values["priority"] = values["priority"] or task.priority
        update_fields = []
        for field_name, value in values.items():
            if getattr(task, field_name) != value:
                setattr(task, field_name, value)
                update_fields.append(field_name)

        if update_fields:
            task.save(update_fields=[*update_fields, "updated_at"])
            return {"status": "updated"}

        return {"status": "skipped", "reason": "no_local_changes"}

    values["status"] = values["status"] or Task.Status.PENDING
    values["priority"] = values["priority"] or Task.Priority.MEDIUM
    Task.objects.create(user=user, **values)
    return {"status": "created"}


def list_google_event_changes(connection, service=None):
    service = service or get_calendar_service(connection)
    query = {
        "calendarId": connection.calendar_id,
        "singleEvents": True,
        "showDeleted": True,
        "maxResults": GOOGLE_SYNC_PAGE_SIZE,
    }

    incremental = bool(connection.sync_token)
    if connection.sync_token:
        query["syncToken"] = connection.sync_token

    events = []
    page_token = None

    while True:
        try:
            response = service.events().list(pageToken=page_token, **query).execute()
        except HttpError as exc:
            if getattr(exc.resp, "status", None) == 410 and connection.sync_token:
                connection.sync_token = ""
                connection.last_synced_at = None
                connection.save(update_fields=["sync_token", "last_synced_at", "updated_at"])
                return list_google_event_changes(connection, service=service)
            raise

        events.extend(response.get("items", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            return {
                "events": events,
                "next_sync_token": response.get("nextSyncToken", ""),
                "incremental": incremental,
            }


def sync_tasks_from_google_calendar(user):
    summary = {
        "imported_created": 0,
        "imported_updated": 0,
        "imported_deleted": 0,
        "skipped": 0,
        "failed": 0,
        "events_seen": 0,
        "incremental": False,
        "errors": [],
    }

    if not google_calendar_is_configured():
        summary["errors"].append({"scope": "google_calendar", "error": "not_configured"})
        return summary

    connection = GoogleCalendarConnection.objects.filter(user=user).first()
    if not connection:
        summary["errors"].append({"scope": "google_calendar", "error": "not_connected"})
        return summary

    connection = sync_calendar_metadata(connection)
    service = get_calendar_service(connection)
    change_set = list_google_event_changes(connection, service=service)

    summary["events_seen"] = len(change_set["events"])
    summary["incremental"] = change_set["incremental"]

    for event in change_set["events"]:
        try:
            result = import_google_event_to_task(user, connection, event)
            status = result["status"]

            if status == "created":
                summary["imported_created"] += 1
            elif status == "updated":
                summary["imported_updated"] += 1
            elif status == "deleted":
                summary["imported_deleted"] += 1
            else:
                summary["skipped"] += 1
        except Exception as exc:
            summary["failed"] += 1
            if len(summary["errors"]) < 5:
                summary["errors"].append(
                    {
                        "scope": "google_import",
                        "event_id": event.get("id", ""),
                        "error": str(exc),
                    }
                )

    connection.sync_token = change_set["next_sync_token"] or connection.sync_token
    connection.last_synced_at = timezone.now()
    connection.save(update_fields=["sync_token", "last_synced_at", "updated_at"])
    return summary


def sync_task_to_google_calendar(task, connection=None, service=None):
    if not google_calendar_is_configured():
        return {"status": "skipped", "reason": "google_not_configured"}

    connection = connection or GoogleCalendarConnection.objects.filter(user=task.user).first()
    if not connection:
        return {"status": "skipped", "reason": "calendar_not_connected"}

    service = service or get_calendar_service(connection)
    payload = build_task_event_payload(task, connection.calendar_timezone)

    action = "created"
    event = None

    if task.google_calendar_event_id:
        try:
            event = (
                service.events()
                .patch(
                    calendarId=connection.calendar_id,
                    eventId=task.google_calendar_event_id,
                    body=payload,
                    sendUpdates="none",
                )
                .execute()
            )
            action = "updated"
        except HttpError as exc:
            if getattr(exc.resp, "status", None) != 404:
                raise

    if event is None:
        event = (
            service.events()
            .insert(
                calendarId=connection.calendar_id,
                body=payload,
                sendUpdates="none",
            )
            .execute()
        )

    Task.objects.filter(pk=task.pk).update(
        google_calendar_event_id=event.get("id", ""),
        google_calendar_event_link=event.get("htmlLink", ""),
        google_calendar_last_synced_at=timezone.now(),
    )

    return {"status": action, "event_id": event.get("id", "")}


def delete_task_from_google_calendar(task, connection=None, service=None):
    if not google_calendar_is_configured():
        return {"status": "skipped", "reason": "google_not_configured"}

    if not task.google_calendar_event_id:
        return {"status": "skipped", "reason": "event_not_synced"}

    connection = connection or GoogleCalendarConnection.objects.filter(user=task.user).first()
    if not connection:
        return {"status": "skipped", "reason": "calendar_not_connected"}

    service = service or get_calendar_service(connection)
    try:
        (
            service.events()
            .delete(
                calendarId=connection.calendar_id,
                eventId=task.google_calendar_event_id,
                sendUpdates="none",
            )
            .execute()
        )
    except HttpError as exc:
        if getattr(exc.resp, "status", None) != 404:
            raise

    Task.objects.filter(pk=task.pk).update(
        google_calendar_event_id="",
        google_calendar_event_link="",
        google_calendar_last_synced_at=timezone.now(),
    )
    return {"status": "deleted"}


def sync_tasks_to_google_calendar(user):
    summary = {
        "exported_created": 0,
        "exported_updated": 0,
        "skipped": 0,
        "failed": 0,
        "errors": [],
    }

    if not google_calendar_is_configured():
        summary["errors"].append({"scope": "google_calendar", "error": "not_configured"})
        return summary

    connection = GoogleCalendarConnection.objects.filter(user=user).first()
    if not connection:
        summary["errors"].append({"scope": "google_calendar", "error": "not_connected"})
        return summary

    connection = sync_calendar_metadata(connection)
    service = get_calendar_service(connection)

    for task in user.tasks.order_by("due_date", "-created_at"):
        try:
            result = sync_task_to_google_calendar(task, connection=connection, service=service)
            status = result["status"]
            if status == "created":
                summary["exported_created"] += 1
            elif status == "updated":
                summary["exported_updated"] += 1
            else:
                summary["skipped"] += 1
        except Exception as exc:
            summary["failed"] += 1
            if len(summary["errors"]) < 5:
                summary["errors"].append({"task": task.title, "error": str(exc)})

    connection.last_synced_at = timezone.now()
    connection.save(update_fields=["last_synced_at", "updated_at"])
    return summary


def sync_all_tasks_to_google_calendar(user):
    import_summary = sync_tasks_from_google_calendar(user)
    export_summary = sync_tasks_to_google_calendar(user)

    errors = [*import_summary["errors"], *export_summary["errors"]][:5]

    return {
        "created": import_summary["imported_created"] + export_summary["exported_created"],
        "updated": import_summary["imported_updated"] + export_summary["exported_updated"],
        "deleted": import_summary["imported_deleted"],
        "imported_created": import_summary["imported_created"],
        "imported_updated": import_summary["imported_updated"],
        "imported_deleted": import_summary["imported_deleted"],
        "exported_created": export_summary["exported_created"],
        "exported_updated": export_summary["exported_updated"],
        "skipped": import_summary["skipped"] + export_summary["skipped"],
        "failed": import_summary["failed"] + export_summary["failed"],
        "events_seen": import_summary["events_seen"],
        "incremental": import_summary["incremental"],
        "errors": errors,
    }
