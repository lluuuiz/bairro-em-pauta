from django.contrib import admin, messages

from . import services
from .models import Confirmation, Event, Flag, Neighborhood, NewsItem, Profile, Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """Painel da redação: fila de relatos para validar."""
    list_display = ("id", "title", "category", "neighborhood", "status", "triage_passed", "community_score", "created_at")
    list_filter = ("status", "triage_passed", "category", "neighborhood")
    search_fields = ("title", "description")
    readonly_fields = ("triage_notes", "community_score", "reviewed_by", "reviewed_at", "created_at")
    actions = ["approve", "reject"]

    @admin.action(description="Verificar relatos selecionados (selo da redação)")
    def approve(self, request, queryset):
        for r in queryset.exclude(status=Report.VERIFICADO):
            services.apply_review(r, request.user, True, "Verificado pela redação")
        self.message_user(request, "Relatos verificados.", messages.SUCCESS)

    @admin.action(description="Descartar relatos selecionados (falso ou sem comprovação)")
    def reject(self, request, queryset):
        for r in queryset.exclude(status=Report.DESCARTADO):
            services.apply_review(r, request.user, False, "Descartado pela redação")
        self.message_user(request, "Relatos descartados.", messages.WARNING)


admin.site.register([Neighborhood, NewsItem, Event, Profile, Confirmation, Flag])
