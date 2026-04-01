import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote_plus

import dj_database_url


BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path):
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_env_list(key, default=""):
    value = os.getenv(key, default)
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def get_env_bool(key, default=False):
    value = os.getenv(key)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def get_env_int(key, default):
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def build_database_url():
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        return database_url

    postgres_db = os.getenv("POSTGRES_DB", "calendar_service").strip()
    postgres_user = os.getenv("POSTGRES_USER", "postgres").strip()
    postgres_password = os.getenv("POSTGRES_PASSWORD", "").strip()
    postgres_host = os.getenv("POSTGRES_HOST", "calendar-db").strip()
    postgres_port = os.getenv("POSTGRES_PORT", "5432").strip()

    credentials = quote_plus(postgres_user)
    if postgres_password:
        credentials = f"{credentials}:{quote_plus(postgres_password)}"

    return f"postgresql://{credentials}@{postgres_host}:{postgres_port}/{postgres_db}"


load_env_file(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "calendar-service-django-secret-key")
JWT_SIGNING_KEY = os.getenv("JWT_SIGNING_KEY", SECRET_KEY)
JWT_ISSUER = os.getenv("JWT_ISSUER", "task-manager-auth-service").strip()
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "task-manager-clients").strip()
DEBUG = get_env_bool("DEBUG", False)
ALLOWED_HOSTS = get_env_list(
    "ALLOWED_HOSTS",
    "calendar-service",
)
CSRF_TRUSTED_ORIGINS = get_env_list("CSRF_TRUSTED_ORIGINS")
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
TASK_SERVICE_URL = os.getenv("TASK_SERVICE_URL", "http://task-service:8000").rstrip("/")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_CALENDAR_REDIRECT_URI = os.getenv(
    "GOOGLE_CALENDAR_REDIRECT_URI",
    "",
)
GOOGLE_CALENDAR_ID = os.getenv("GOOGLE_CALENDAR_ID", "primary")
GOOGLE_CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "calendar_integration",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": dj_database_url.parse(
        build_database_url(),
        conn_max_age=600,
    )
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("TIME_ZONE", "Asia/Kolkata")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_X_FORWARDED_HOST = get_env_bool("USE_X_FORWARDED_HOST", True)

if get_env_bool("USE_PROXY_SSL_HEADER", True):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SECURE_SSL_REDIRECT = get_env_bool("SECURE_SSL_REDIRECT", False)
SESSION_COOKIE_SECURE = get_env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = get_env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = os.getenv(
    "SECURE_REFERRER_POLICY",
    "strict-origin-when-cross-origin",
)
X_FRAME_OPTIONS = os.getenv("X_FRAME_OPTIONS", "DENY")
SECURE_HSTS_SECONDS = get_env_int("SECURE_HSTS_SECONDS", 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = get_env_bool(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS",
    False,
)
SECURE_HSTS_PRELOAD = get_env_bool("SECURE_HSTS_PRELOAD", False)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "calendar_integration.authentication.ServiceJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

if DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    )
else:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
        "rest_framework.renderers.JSONRenderer",
    )

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=get_env_int("JWT_ACCESS_TOKEN_MINUTES", 60)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=get_env_int("JWT_REFRESH_TOKEN_DAYS", 7)),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "ALGORITHM": "HS256",
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "ISSUER": JWT_ISSUER,
    "AUDIENCE": JWT_AUDIENCE,
}
