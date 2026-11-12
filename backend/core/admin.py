from django.contrib import admin, messages

from . import services
from .models import Confirmation, Event, Flag, Follow, Neighborhood, NewsItem, Notice, Profile, Report


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


@admin.register(NewsItem)
class NewsItemAdmin(admin.ModelAdmin):
    """Aqui a redação cadastra notícias, alertas e as pautas dos telejornais."""
    list_display = ("title", "kind", "program", "neighborhood", "airs_at", "is_live", "published_at")
    list_filter = ("kind", "neighborhood", "is_live")
    fieldsets = (
        ("Conteúdo", {"fields": ("kind", "title", "category", "neighborhood", "is_live")}),
        ("Telejornal (para pautas)", {"fields": ("program", "airs_at")}),
        ("Localização (opcional: usa o centro do bairro)", {"fields": ("latitude", "longitude")}),
    )


admin.site.register([Neighborhood, Event, Profile, Confirmation, Flag, Follow, Notice])
