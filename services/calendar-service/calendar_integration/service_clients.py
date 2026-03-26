import json
from urllib import error, request

from django.conf import settings


def _decode_response(response):
    body = response.read().decode("utf-8")
    if not body:
        return None
    return json.loads(body)


def task_service_request(method, path, authorization_header="", payload=None):
    url = f"{settings.TASK_SERVICE_URL}{path}"
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if authorization_header:
        req.add_header("Authorization", authorization_header)

    try:
        with request.urlopen(req, timeout=20) as response:
            return _decode_response(response)
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise RuntimeError(
            f"Task service request failed: {method} {path} -> {exc.code} {body}"
        ) from exc


def export_tasks(authorization_header):
    return task_service_request("GET", "/internal/tasks/export/", authorization_header) or []


def create_task(authorization_header, payload):
    return task_service_request("POST", "/tasks/", authorization_header, payload)


def update_task(authorization_header, task_id, payload):
    return task_service_request(
        "PUT",
        f"/tasks/{task_id}/",
        authorization_header,
        payload,
    )


def delete_task(authorization_header, task_id):
    return task_service_request(
        "DELETE",
        f"/tasks/{task_id}/",
        authorization_header,
    )


def update_task_calendar_sync(authorization_header, task_id, payload):
    return task_service_request(
        "PATCH",
        f"/internal/tasks/{task_id}/calendar-sync/",
        authorization_header,
        payload,
    )


def clear_task_calendar_sync(authorization_header):
    return task_service_request(
        "POST",
        "/internal/tasks/calendar-sync/clear/",
        authorization_header,
        {},
    )
