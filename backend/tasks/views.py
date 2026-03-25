from datetime import datetime, timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponseRedirect
from django.db.models import Case, Count, IntegerField, Q, When
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .google_calendar import (
    build_google_oauth_flow,
    build_oauth_state,
    create_or_update_connection,
    delete_task_from_google_calendar,
    get_missing_google_calendar_settings,
    google_calendar_is_configured,
    parse_oauth_state,
    sync_all_tasks_to_google_calendar,
    sync_calendar_metadata,
    sync_task_to_google_calendar,
)
from .models import GoogleCalendarConnection, Task
from .serializers import (
    GoogleCalendarConnectionSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
    TaskSerializer,
    TaskTokenObtainPairSerializer,
    UserSerializer,
)


def build_summary(queryset, now):
    today = now.date()
    return queryset.aggregate(
        total=Count("id"),
        completed=Count("id", filter=Q(status=Task.Status.COMPLETED)),
        pending=Count("id", filter=Q(status=Task.Status.PENDING)),
        in_progress=Count("id", filter=Q(status=Task.Status.IN_PROGRESS)),
        overdue=Count(
            "id",
            filter=Q(due_date__lt=now) & ~Q(status=Task.Status.COMPLETED),
        ),
        today=Count("id", filter=Q(due_date__date=today)),
        upcoming=Count(
            "id",
            filter=Q(due_date__date__gt=today) & ~Q(status=Task.Status.COMPLETED),
        ),
    )


class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "name": "AI-Powered Task Management Dashboard API",
                "status": "ok",
                "docs_hint": "Use /api/auth/, /api/tasks/, /api/stats/, /api/analytics/, and /api/integrations/google/ endpoints.",
            }
        )


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            RegisterResponseSerializer.build(user),
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TaskTokenObtainPairSerializer


class TaskQueryMixin:
    valid_tabs = {"all", "today", "upcoming", "completed", "overdue"}
    valid_statuses = {choice for choice, _ in Task.Status.choices}
    valid_priorities = {choice for choice, _ in Task.Priority.choices}

    def get_base_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def filter_queryset(self, queryset):
        queryset = queryset.select_related("user")
        status_value = self.request.query_params.get("status")
        priority_value = self.request.query_params.get("priority")
        search_value = self.request.query_params.get("search")
        tab = self.request.query_params.get("tab", "all")
        ordering = self.request.query_params.get("ordering", "due_date")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        now = timezone.localtime()
        today = now.date()

        if tab not in self.valid_tabs:
            raise serializers.ValidationError({"tab": "Invalid tab filter supplied."})

        if status_value:
            statuses = [item.strip() for item in status_value.split(",") if item.strip()]
            invalid_statuses = sorted(set(statuses) - self.valid_statuses)
            if invalid_statuses:
                raise serializers.ValidationError(
                    {"status": f"Invalid status values: {', '.join(invalid_statuses)}"}
                )
            queryset = queryset.filter(status__in=statuses)

        if priority_value:
            priorities = [
                item.strip() for item in priority_value.split(",") if item.strip()
            ]
            invalid_priorities = sorted(set(priorities) - self.valid_priorities)
            if invalid_priorities:
                raise serializers.ValidationError(
                    {
                        "priority": (
                            f"Invalid priority values: {', '.join(invalid_priorities)}"
                        )
                    }
                )
            queryset = queryset.filter(priority__in=priorities)

        if search_value:
            queryset = queryset.filter(
                Q(title__icontains=search_value)
                | Q(description__icontains=search_value)
            )

        if tab == "today":
            queryset = queryset.filter(due_date__date=today)
        elif tab == "upcoming":
            queryset = queryset.filter(due_date__date__gt=today).exclude(
                status=Task.Status.COMPLETED
            )
        elif tab == "completed":
            queryset = queryset.filter(status=Task.Status.COMPLETED)
        elif tab == "overdue":
            queryset = queryset.filter(
                due_date__lt=now,
            ).exclude(status=Task.Status.COMPLETED)

        parsed_date_from = parse_date(date_from) if date_from else None
        parsed_date_to = parse_date(date_to) if date_to else None

        if parsed_date_from:
            queryset = queryset.filter(due_date__date__gte=parsed_date_from)
        if parsed_date_to:
            queryset = queryset.filter(due_date__date__lte=parsed_date_to)

        return self.apply_ordering(queryset, ordering)

    def apply_ordering(self, queryset, ordering):
        ordering = ordering or "due_date"
        descending = ordering.startswith("-")
        field = ordering[1:] if descending else ordering

        if field == "priority":
            priority_order = Case(
                When(priority=Task.Priority.HIGH, then=3),
                When(priority=Task.Priority.MEDIUM, then=2),
                When(priority=Task.Priority.LOW, then=1),
                default=0,
                output_field=IntegerField(),
            )
            queryset = queryset.annotate(priority_rank=priority_order)
            return queryset.order_by(
                "-priority_rank" if descending else "priority_rank",
                "due_date",
            )

        if field == "status":
            status_order = Case(
                When(status=Task.Status.PENDING, then=1),
                When(status=Task.Status.IN_PROGRESS, then=2),
                When(status=Task.Status.COMPLETED, then=3),
                default=0,
                output_field=IntegerField(),
            )
            queryset = queryset.annotate(status_rank=status_order)
            return queryset.order_by(
                "-status_rank" if descending else "status_rank",
                "due_date",
            )

        valid_fields = {"title", "created_at", "updated_at", "due_date"}
        if field not in valid_fields:
            field = "due_date"
            descending = False

        prefix = "-" if descending else ""
        return queryset.order_by(f"{prefix}{field}", "-created_at")


class TaskListCreateView(TaskQueryMixin, generics.ListCreateAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return self.get_base_queryset()

    def perform_create(self, serializer):
        task = serializer.save(user=self.request.user)
        try:
            sync_task_to_google_calendar(task)
        except Exception:
            pass


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        task = serializer.save()
        try:
            sync_task_to_google_calendar(task)
        except Exception:
            pass

    def perform_destroy(self, instance):
        try:
            delete_task_from_google_calendar(instance)
        except Exception:
            pass
        instance.delete()


class StatsView(APIView):
    def get(self, request):
        now = timezone.localtime()
        queryset = Task.objects.filter(user=request.user)
        return Response(build_summary(queryset, now))


class AnalyticsView(APIView):
    def get(self, request):
        queryset = Task.objects.filter(user=request.user)
        now = timezone.localtime()
        requested_days = request.query_params.get("days", "7")

        try:
            days = int(requested_days)
        except ValueError:
            days = 7

        if days not in {7, 14, 30, 90}:
            days = 7

        start_date = now.date() - timedelta(days=days - 1)

        status_distribution = queryset.aggregate(
            pending=Count("id", filter=Q(status=Task.Status.PENDING)),
            in_progress=Count("id", filter=Q(status=Task.Status.IN_PROGRESS)),
            completed=Count("id", filter=Q(status=Task.Status.COMPLETED)),
            overdue=Count(
                "id",
                filter=Q(due_date__lt=now) & ~Q(status=Task.Status.COMPLETED),
            ),
        )

        priority_distribution = queryset.aggregate(
            low=Count("id", filter=Q(priority=Task.Priority.LOW)),
            medium=Count("id", filter=Q(priority=Task.Priority.MEDIUM)),
            high=Count("id", filter=Q(priority=Task.Priority.HIGH)),
        )

        trend = []
        for index in range(days):
            current_date = start_date + timedelta(days=index)
            next_date = current_date + timedelta(days=1)
            current_start = timezone.make_aware(
                datetime.combine(current_date, datetime.min.time()),
                timezone.get_current_timezone(),
            )
            current_end = timezone.make_aware(
                datetime.combine(next_date, datetime.min.time()),
                timezone.get_current_timezone(),
            )
            trend.append(
                {
                    "date": current_date.isoformat(),
                    "created": queryset.filter(
                        created_at__gte=current_start,
                        created_at__lt=current_end,
                    ).count(),
                    "completed": queryset.filter(
                        completed_at__gte=current_start,
                        completed_at__lt=current_end,
                    ).count(),
                    "due": queryset.filter(
                        due_date__date=current_date,
                    ).count(),
                    "overdue": queryset.filter(
                        due_date__lt=current_end,
                    )
                    .exclude(status=Task.Status.COMPLETED)
                    .count(),
                }
            )

        upcoming_deadlines = TaskSerializer(
            queryset.filter(due_date__gte=now)
            .exclude(status=Task.Status.COMPLETED)
            .order_by("due_date")[:5],
            many=True,
        ).data

        recent_tasks = queryset.order_by("-updated_at")[:6]
        recent_activity = []
        for task in recent_tasks:
            if task.status == Task.Status.COMPLETED and task.completed_at:
                action = "Completed"
                timestamp = task.completed_at
            elif task.updated_at and task.updated_at > task.created_at:
                action = "Updated"
                timestamp = task.updated_at
            else:
                action = "Created"
                timestamp = task.created_at

            recent_activity.append(
                {
                    "id": task.id,
                    "title": task.title,
                    "action": action,
                    "timestamp": timezone.localtime(timestamp).isoformat(),
                    "status": task.status,
                    "priority": task.priority,
                }
            )

        overdue_tasks = TaskSerializer(
            queryset.filter(due_date__lt=now)
            .exclude(status=Task.Status.COMPLETED)
            .order_by("due_date")[:10],
            many=True,
        ).data

        return Response(
            {
                "summary": build_summary(queryset, now),
                "status_distribution": status_distribution,
                "priority_distribution": priority_distribution,
                "trend": trend,
                "upcoming_deadlines": upcoming_deadlines,
                "recent_activity": recent_activity,
                "overdue_tasks": overdue_tasks,
            }
        )


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

        flow = build_google_oauth_flow(state=build_oauth_state(request.user.id))
        authorization_kwargs = {
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
        }
        if request.user.email:
            authorization_kwargs["login_hint"] = request.user.email

        authorization_url, _ = flow.authorization_url(
            **authorization_kwargs,
        )
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
            user = User.objects.get(pk=state_data["user_id"])
            flow = build_google_oauth_flow(state=state)
            flow.fetch_token(code=code)
            create_or_update_connection(user, flow.credentials)
            sync_summary = sync_all_tasks_to_google_calendar(user)
        except Exception as exc:
            return HttpResponseRedirect(
                f"{frontend_settings_url}?{urlencode({'google_calendar': 'error', 'reason': str(exc)[:120]})}"
            )

        return HttpResponseRedirect(
            f"{frontend_settings_url}?{urlencode({'google_calendar': 'connected', 'synced': sync_summary['created'] + sync_summary['updated'], 'imported': sync_summary['imported_created'] + sync_summary['imported_updated'], 'exported': sync_summary['exported_created'] + sync_summary['exported_updated']})}"
        )


class GoogleCalendarStatusView(APIView):
    def get(self, request):
        configured = google_calendar_is_configured()
        connection = GoogleCalendarConnection.objects.filter(user=request.user).first()

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

        connection = GoogleCalendarConnection.objects.filter(user=request.user).first()
        if not connection:
            return Response(
                {"detail": "Connect Google Calendar before running a sync."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sync_summary = sync_all_tasks_to_google_calendar(request.user)
        return Response(sync_summary)


class GoogleCalendarDisconnectView(APIView):
    def delete(self, request):
        GoogleCalendarConnection.objects.filter(user=request.user).delete()
        Task.objects.filter(user=request.user).update(
            google_calendar_event_id="",
            google_calendar_event_link="",
            google_calendar_last_synced_at=None,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
