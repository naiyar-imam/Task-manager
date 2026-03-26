from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .google_calendar import (
    build_callback_user,
    build_google_oauth_flow,
    build_oauth_state,
    create_or_update_connection,
    get_missing_google_calendar_settings,
    google_calendar_is_configured,
    parse_oauth_state,
    sync_all_tasks_to_google_calendar,
    sync_calendar_metadata,
)
from .models import GoogleCalendarConnection
from .serializers import GoogleCalendarConnectionSerializer
from .service_clients import clear_task_calendar_sync


class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "service": "calendar-service",
                "status": "ok",
                "routes": [
                    "/health/",
                    "/integrations/google/authorize/",
                    "/integrations/google/status/",
                    "/integrations/google/sync/",
                ],
            }
        )


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "calendar-service"})


class GoogleCalendarAuthorizeView(APIView):
    def get(self, request):
        if not google_calendar_is_configured():
            return Response(
                {
                    "detail": (
                        "Google Calendar is not configured yet. Add GOOGLE_CLIENT_ID, "
                        "GOOGLE_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        flow = build_google_oauth_flow(state=build_oauth_state(request.user))
        authorization_kwargs = {
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
        }
        if request.user.email:
            authorization_kwargs["login_hint"] = request.user.email

        authorization_url, _ = flow.authorization_url(**authorization_kwargs)
        return Response({"authorization_url": authorization_url})


class GoogleCalendarCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        frontend_settings_url = f"{settings.FRONTEND_BASE_URL}/settings"
        query_params = request.query_params

        if not google_calendar_is_configured():
            return HttpResponseRedirect(
                f"{frontend_settings_url}?{urlencode({'google_calendar': 'not_configured'})}"
            )

        if query_params.get("error"):
            return HttpResponseRedirect(
                f"{frontend_settings_url}?{urlencode({'google_calendar': 'error', 'reason': query_params.get('error')})}"
            )

        state = query_params.get("state")
        code = query_params.get("code")

        if not state or not code:
            return HttpResponseRedirect(
                f"{frontend_settings_url}?{urlencode({'google_calendar': 'error', 'reason': 'missing_code'})}"
            )

        try:
            state_data = parse_oauth_state(state)
            user = build_callback_user(state_data)
            flow = build_google_oauth_flow(state=state)
            flow.fetch_token(code=code)
            create_or_update_connection(user, flow.credentials)
        except Exception as exc:
            return HttpResponseRedirect(
                f"{frontend_settings_url}?{urlencode({'google_calendar': 'error', 'reason': str(exc)[:120]})}"
            )

        return HttpResponseRedirect(
            f"{frontend_settings_url}?{urlencode({'google_calendar': 'connected'})}"
        )


class GoogleCalendarStatusView(APIView):
    def get(self, request):
        configured = google_calendar_is_configured()
        connection = GoogleCalendarConnection.objects.filter(user_id=request.user.id).first()

        response = {
            "configured": configured,
            "missing_settings": get_missing_google_calendar_settings(),
            "connected": False,
            "calendar_id": "",
            "calendar_summary": "",
            "calendar_timezone": "",
            "last_synced_at": None,
            "connected_at": None,
            "updated_at": None,
        }

        if not connection:
            return Response(response)

        if configured:
            try:
                connection = sync_calendar_metadata(connection)
            except Exception:
                pass

        response.update(
            {
                "connected": bool(connection.access_token),
                **GoogleCalendarConnectionSerializer(connection).data,
            }
        )
        return Response(response)


class GoogleCalendarSyncView(APIView):
    def post(self, request):
        if not google_calendar_is_configured():
            return Response(
                {"detail": "Google Calendar is not configured on the backend."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        connection = GoogleCalendarConnection.objects.filter(user_id=request.user.id).first()
        if not connection:
            return Response(
                {"detail": "Connect Google Calendar before running a sync."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        authorization_header = request.headers.get("Authorization", "")
        if not authorization_header:
            return Response(
                {"detail": "Missing Authorization header."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sync_summary = sync_all_tasks_to_google_calendar(request.user, authorization_header)
        return Response(sync_summary)


class GoogleCalendarDisconnectView(APIView):
    def delete(self, request):
        GoogleCalendarConnection.objects.filter(user_id=request.user.id).delete()

        authorization_header = request.headers.get("Authorization", "")
        if authorization_header:
            try:
                clear_task_calendar_sync(authorization_header)
            except Exception:
                pass

        return Response(status=status.HTTP_204_NO_CONTENT)
