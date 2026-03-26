from datetime import datetime, time, timedelta
from types import SimpleNamespace
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

from .models import GoogleCalendarConnection
from .service_clients import (
    create_task,
    delete_task,
    export_tasks,
    update_task,
    update_task_calendar_sync,
)


GOOGLE_OAUTH_STATE_SALT = "google-calendar-oauth"
GOOGLE_OAUTH_STATE_MAX_AGE = 600
GOOGLE_SYNC_APP_ID = "ai-task-dashboard"
GOOGLE_SYNC_MARKER = "-- Synced by AI-Powered Task Management Dashboard --"
GOOGLE_SYNC_PAGE_SIZE = 250
GOOGLE_ALL_DAY_TASK_HOUR = 18
SUPPORTED_GOOGLE_EVENT_TYPES = {"default"}

STATUS_LABELS = {
    "pending": "Pending",
    "in_progress": "In Progress",
    "completed": "Completed",
}

PRIORITY_LABELS = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
}


def google_calendar_is_configured():
    return all(
        [
            settings.GOOGLE_CLIENT_ID,
            settings.GOOGLE_CLIENT_SECRET,
            settings.GOOGLE_CALENDAR_REDIRECT_URI,
            settings.FRONTEND_BASE_URL,
            settings.TASK_SERVICE_URL,
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
    if not settings.TASK_SERVICE_URL:
        missing.append("TASK_SERVICE_URL")
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


def build_oauth_state(user):
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }
    return signing.dumps(payload, salt=GOOGLE_OAUTH_STATE_SALT)


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
        user_id=user.id,
        defaults={
            "username": user.username,
            "email": user.email,
            "calendar_id": settings.GOOGLE_CALENDAR_ID,
        },
    )

    fields_to_update = []
    if connection.username != user.username:
        connection.username = user.username
        fields_to_update.append("username")
    if connection.email != user.email:
        connection.email = user.email
        fields_to_update.append("email")
    if connection.calendar_id != settings.GOOGLE_CALENDAR_ID:
        connection.calendar_id = settings.GOOGLE_CALENDAR_ID
        connection.sync_token = ""
        connection.last_synced_at = None
        fields_to_update.extend(["calendar_id", "sync_token", "last_synced_at"])

    if fields_to_update:
        fields_to_update.append("updated_at")
        connection.save(update_fields=fields_to_update)

    persist_credentials(connection, credentials)
    return sync_calendar_metadata(connection)


def build_task_event_payload(task, calendar_timezone):
    due_at = parse_datetime(task["due_date"])
    if due_at is None:
        raise ValueError("Task due date could not be parsed.")

    due_at = timezone.localtime(due_at)
    end_at = due_at + timedelta(hours=1)
    task_url = f"{settings.FRONTEND_BASE_URL}/tasks?search={quote(task['title'])}"

    description_lines = []
    if task.get("description"):
        description_lines.append(task["description"].strip())
        description_lines.append("")

    description_lines.extend(
        [
            GOOGLE_SYNC_MARKER,
            f"Status: {STATUS_LABELS.get(task.get('status', ''), 'Pending')}",
            f"Priority: {PRIORITY_LABELS.get(task.get('priority', ''), 'Medium')}",
            "Managed in: AI-Powered Task Management Dashboard",
            f"Workspace link: {task_url}",
        ]
    )

    return {
        "summary": task["title"],
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
                "taskId": str(task["id"]),
                "status": task["status"],
                "priority": task["priority"],
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

    return description.strip()


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
        due_naive = datetime.combine(event_date, time(hour=GOOGLE_ALL_DAY_TASK_HOUR))
        return timezone.make_aware(due_naive, event_timezone)

    raise ValueError("Google Calendar event does not include a start time.")


def build_task_payload_from_event(event, connection):
    private_props = ((event.get("extendedProperties") or {}).get("private") or {})
    title = (event.get("summary") or "Untitled Google Event").strip() or "Untitled Google Event"
    description = clean_task_description(event.get("description", ""))
    due_date = parse_google_due_date(event, connection.calendar_timezone)

    status = private_props.get("status")
    if status not in STATUS_LABELS:
        status = "pending"

    priority = private_props.get("priority")
    if priority not in PRIORITY_LABELS:
        priority = "medium"

    return {
        "title": title,
        "description": description,
        "status": status,
        "priority": priority,
        "due_date": due_date.isoformat(),
    }


def build_sync_metadata_from_event(event):
    return {
        "google_calendar_event_id": event.get("id", ""),
        "google_calendar_event_link": event.get("htmlLink", ""),
        "google_calendar_last_synced_at": timezone.now().isoformat(),
    }


def find_existing_task_for_event(tasks, event):
    event_id = event.get("id", "")
    private_props = ((event.get("extendedProperties") or {}).get("private") or {})
    raw_task_id = private_props.get("taskId", "")

    task = None
    if event_id:
        task = next(
            (item for item in tasks if item.get("google_calendar_event_id") == event_id),
            None,
        )

    if task is None and raw_task_id.isdigit():
        task = next((item for item in tasks if item["id"] == int(raw_task_id)), None)

    return task, raw_task_id


def find_matching_unsynced_task(tasks, title, due_date):
    time_window = timedelta(minutes=5)
    for task in tasks:
        if task.get("google_calendar_event_id"):
            continue
        if task["title"].lower() != title.lower():
            continue
        task_due = parse_datetime(task["due_date"])
        if task_due is None:
            continue
        if abs(task_due - due_date) <= time_window:
            return task
    return None


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


def sync_tasks_from_google_calendar(connection, authorization_header):
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

    tasks = export_tasks(authorization_header)
    service = get_calendar_service(connection)
    change_set = list_google_event_changes(connection, service=service)

    summary["events_seen"] = len(change_set["events"])
    summary["incremental"] = change_set["incremental"]

    for event in change_set["events"]:
        try:
            event_status = event.get("status")
            event_type = event.get("eventType", "default")

            task, raw_task_id = find_existing_task_for_event(tasks, event)

            if event_status == "cancelled":
                if task:
                    delete_task(authorization_header, task["id"])
                    summary["imported_deleted"] += 1
                    tasks = export_tasks(authorization_header)
                else:
                    summary["skipped"] += 1
                continue

            if event_type not in SUPPORTED_GOOGLE_EVENT_TYPES:
                summary["skipped"] += 1
                continue

            task_payload = build_task_payload_from_event(event, connection)
            sync_payload = build_sync_metadata_from_event(event)

            if task is None and raw_task_id.isdigit():
                summary["skipped"] += 1
                continue

            if task is None:
                task = find_matching_unsynced_task(
                    tasks,
                    task_payload["title"],
                    parse_datetime(task_payload["due_date"]),
                )

            if task:
                updated_task = update_task(authorization_header, task["id"], task_payload)
                update_task_calendar_sync(
                    authorization_header,
                    updated_task["id"],
                    sync_payload,
                )
                summary["imported_updated"] += 1
            else:
                created_task = create_task(authorization_header, task_payload)
                update_task_calendar_sync(
                    authorization_header,
                    created_task["id"],
                    sync_payload,
                )
                summary["imported_created"] += 1

            tasks = export_tasks(authorization_header)
        except Exception as exc:
            summary["failed"] += 1
            if len(summary["errors"]) < 5:
                summary["errors"].append(
                    {"scope": "google_import", "event_id": event.get("id", ""), "error": str(exc)}
                )

    connection.sync_token = change_set["next_sync_token"] or connection.sync_token
    connection.last_synced_at = timezone.now()
    connection.save(update_fields=["sync_token", "last_synced_at", "updated_at"])
    return summary


def sync_task_to_google_calendar(task, connection=None, service=None):
    connection = connection or GoogleCalendarConnection.objects.filter(user_id=task["user_id"]).first()
    if not connection:
        return {"status": "skipped", "reason": "calendar_not_connected"}

    service = service or get_calendar_service(connection)
    payload = build_task_event_payload(task, connection.calendar_timezone)

    action = "created"
    event = None
    if task.get("google_calendar_event_id"):
        try:
            event = (
                service.events()
                .patch(
                    calendarId=connection.calendar_id,
                    eventId=task["google_calendar_event_id"],
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

    return {
        "status": action,
        "event_id": event.get("id", ""),
        "event_link": event.get("htmlLink", ""),
    }


def sync_tasks_to_google_calendar(connection, authorization_header):
    summary = {
        "exported_created": 0,
        "exported_updated": 0,
        "failed": 0,
        "errors": [],
    }

    tasks = export_tasks(authorization_header)
    service = get_calendar_service(connection)

    for task in tasks:
        try:
            result = sync_task_to_google_calendar(task, connection=connection, service=service)
            update_task_calendar_sync(
                authorization_header,
                task["id"],
                {
                    "google_calendar_event_id": result["event_id"],
                    "google_calendar_event_link": result["event_link"],
                    "google_calendar_last_synced_at": timezone.now().isoformat(),
                },
            )
            if result["status"] == "created":
                summary["exported_created"] += 1
            elif result["status"] == "updated":
                summary["exported_updated"] += 1
        except Exception as exc:
            summary["failed"] += 1
            if len(summary["errors"]) < 5:
                summary["errors"].append({"task": task["title"], "error": str(exc)})

    connection.last_synced_at = timezone.now()
    connection.save(update_fields=["last_synced_at", "updated_at"])
    return summary


def sync_all_tasks_to_google_calendar(user, authorization_header):
    connection = GoogleCalendarConnection.objects.filter(user_id=user.id).first()
    if connection is None:
        return {
            "imported_created": 0,
            "imported_updated": 0,
            "imported_deleted": 0,
            "exported_created": 0,
            "exported_updated": 0,
            "failed": 1,
            "errors": [{"scope": "google_calendar", "error": "not_connected"}],
        }

    connection = sync_calendar_metadata(connection)
    import_summary = sync_tasks_from_google_calendar(connection, authorization_header)
    export_summary = sync_tasks_to_google_calendar(connection, authorization_header)

    return {
        "created": import_summary["imported_created"] + export_summary["exported_created"],
        "updated": import_summary["imported_updated"] + export_summary["exported_updated"],
        "deleted": import_summary["imported_deleted"],
        "imported_created": import_summary["imported_created"],
        "imported_updated": import_summary["imported_updated"],
        "imported_deleted": import_summary["imported_deleted"],
        "exported_created": export_summary["exported_created"],
        "exported_updated": export_summary["exported_updated"],
        "skipped": import_summary["skipped"],
        "failed": import_summary["failed"] + export_summary["failed"],
        "events_seen": import_summary["events_seen"],
        "incremental": import_summary["incremental"],
        "errors": [*import_summary["errors"], *export_summary["errors"]][:5],
    }


def build_callback_user(state_data):
    return SimpleNamespace(
        id=state_data["user_id"],
        username=state_data.get("username", ""),
        email=state_data.get("email", ""),
        first_name=state_data.get("first_name", ""),
        last_name=state_data.get("last_name", ""),
    )
