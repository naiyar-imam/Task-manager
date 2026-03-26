from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    RegisterResponseSerializer,
    RegisterSerializer,
    ServiceTokenObtainPairSerializer,
    UserSerializer,
)


class ApiRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "service": "auth-service",
                "status": "ok",
                "routes": [
                    "/health/",
                    "/register/",
                    "/login/",
                    "/refresh/",
                    "/me/",
                ],
            }
        )


class HealthView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "auth-service"})


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
    serializer_class = ServiceTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
