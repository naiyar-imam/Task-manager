from django.conf import settings
from django.http import HttpResponse
from django.views.generic import TemplateView


class FrontendAppView(TemplateView):
    template_name = "index.html"

    def get(self, request, *args, **kwargs):
        if not (settings.FRONTEND_BUILD_DIR / self.template_name).exists():
            return HttpResponse(
                "UI bundle not found. Run `npm install` and `npm run build` in /frontend once, then reload this monolith.",
                status=503,
            )

        return super().get(request, *args, **kwargs)
