from django.urls import include, path


urlpatterns = [
    path("", include("calendar_integration.urls")),
]
