from django.contrib import admin
from django.urls import include, path, re_path

from .views import FrontendAppView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("tasks.urls")),
    re_path(r"^(?!api/|admin/|static/).*$", FrontendAppView.as_view(), name="frontend"),
]
