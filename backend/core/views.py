from datetime import date as date_cls, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import Throttled
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Confirmation, Event, Flag, Follow, Neighborhood, NewsItem, Notice, Reminder, Report, get_profile
from .serializers import (
    EventSerializer, MeSerializer, NeighborhoodSerializer, NoticeSerializer, RegisterSerializer, ReportSerializer,
)

User = get_user_model()


def _float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": MeSerializer(user).data}, status=201)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class NeighborhoodViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Neighborhood.objects.all()
    serializer_class = NeighborhoodSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def follow(self, request, pk=None):
        """Segue ou deixa de seguir o bairro (para receber avisos de pauta)."""
        hood = self.get_object()
        existing = Follow.objects.filter(user=request.user, neighborhood=hood)
        if existing.exists():
            existing.delete()
        else:
            Follow.objects.create(user=request.user, neighborhood=hood)
        return Response(self.get_serializer(hood).data)


class NoticesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notice.objects.filter(user=request.user).select_related("news", "news__neighborhood")
        return Response({
            "unread": qs.filter(read=False).count(),
            "items": NoticeSerializer(qs[:30], many=True).data,
        })

    def post(self, request):
        Notice.objects.filter(user=request.user, read=False).update(read=True)
        return Response({"unread": 0})


class ReportViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ReportSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = Report.objects.select_related("neighborhood", "author").annotate(confirmations_total=Count("confirmations"))
        tab = self.request.query_params.get("tab")
        if tab == "verificados":
            qs = qs.filter(status__in=[Report.VERIFICADO, Report.COMUNIDADE])
        elif tab == "analise":
            qs = qs.filter(status=Report.EM_ANALISE)
        elif tab == "meus":
            qs = qs.filter(author=self.request.user) if self.request.user.is_authenticated else qs.none()
        elif self.action == "list":
            qs = qs.exclude(status=Report.DESCARTADO)
        return qs.order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["user_lat"] = _float(self.request.query_params.get("lat"))
        ctx["user_lng"] = _float(self.request.query_params.get("lng"))
        return ctx

    def perform_create(self, serializer):
        user = self.request.user
        recent = Report.objects.filter(author=user, created_at__gte=timezone.now() - timedelta(hours=1)).count()
        if recent >= services.MAX_REPORTS_PER_HOUR:
            raise Throttled(detail="Limite de relatos por hora atingido. Tente de novo mais tarde.")
        lat, lng = serializer.validated_data["latitude"], serializer.validated_data["longitude"]
        report = serializer.save(author=user, neighborhood=services.nearest_neighborhood(lat, lng))
        passed, notes = services.run_triage(report)
        report.triage_passed = passed
        report.triage_notes = "\n".join(notes)
        report.save(update_fields=["triage_passed", "triage_notes"])

    def _fresh(self, report):
        return self.get_serializer(self.get_queryset().get(pk=report.pk)).data

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        report = self.get_object()
        lat, lng = _float(request.data.get("lat")), _float(request.data.get("lng"))
        if lat is None or lng is None:
            return Response({"detail": "Ative a localização para confirmar."}, status=400)
        if report.author_id == request.user.id:
            return Response({"detail": "Você não pode confirmar o próprio relato."}, status=400)
        if report.status == Report.DESCARTADO or not report.triage_passed:
            return Response({"detail": "Este relato ainda não pode ser confirmado."}, status=400)
        if services.haversine_m(lat, lng, report.latitude, report.longitude) > services.CONFIRM_RADIUS_M:
            return Response({"detail": "Só moradores a até 1,5 km do local podem confirmar."}, status=403)
        existing = Confirmation.objects.filter(report=report, user=request.user)
        if existing.exists():
            existing.delete()
        else:
            Confirmation.objects.create(report=report, user=request.user, weight=get_profile(request.user).weight)
        services.refresh_community_status(report)
        return Response(self._fresh(report))

    @action(detail=True, methods=["post"])
    def flag(self, request, pk=None):
        report = self.get_object()
        Flag.objects.get_or_create(report=report, user=request.user, defaults={"reason": request.data.get("reason", "")[:200]})
        if report.flags.count() >= services.FLAGS_TO_REVIEW and report.status == Report.COMUNIDADE:
            report.status = Report.EM_ANALISE
            report.save(update_fields=["status"])
        return Response({"detail": "Denúncia registrada. A redação vai revisar."})

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Apenas a redação pode validar relatos."}, status=403)
        report = self.get_object()
        act = request.data.get("action")
        if act not in ("approve", "reject"):
            return Response({"detail": "Use action = approve ou reject."}, status=400)
        services.apply_review(report, request.user, act == "approve", request.data.get("note", ""))
        return Response(self._fresh(report))


class MapItemsView(APIView):
    """Itens da região (notícias, pautas, alertas e relatos) para o Mapa e o Início."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat, lng = _float(request.query_params.get("lat")), _float(request.query_params.get("lng"))
        radius_m = (_float(request.query_params.get("radius_km")) or 2.0) * 1000
        only_verified = request.query_params.get("only_verified") == "1"
        ids = [int(x) for x in request.query_params.get("neighborhoods", "").split(",") if x.isdigit()]
        items = []

        news = NewsItem.objects.select_related("neighborhood").exclude(latitude=None)
        reports = Report.objects.exclude(status=Report.DESCARTADO).select_related("neighborhood")
        if ids:
            news, reports = news.filter(neighborhood_id__in=ids), reports.filter(neighborhood_id__in=ids)

        for n in news:
            items.append({
                "type": n.kind, "id": n.id, "title": n.title, "category": n.category,
                "neighborhood": n.neighborhood.name if n.neighborhood else "",
                "latitude": n.latitude, "longitude": n.longitude, "live": n.is_live,
                "program": n.program, "airs_at": n.airs_at,
                "verification": "verificado", "created_at": n.published_at,
            })
        for r in reports:
            items.append({
                "type": "relato", "id": r.id, "title": r.title, "category": r.get_category_display(),
                "neighborhood": r.neighborhood.name if r.neighborhood else "",
                "latitude": r.latitude, "longitude": r.longitude, "live": False,
                "program": "", "airs_at": None,
                "verification": {Report.VERIFICADO: "verificado", Report.COMUNIDADE: "comunidade"}.get(r.status, "analise"),
                "created_at": r.created_at,
            })

        result = []
        for it in items:
            if only_verified and it["verification"] == "analise":
                continue
            if lat is not None and lng is not None and not ids:
                d = services.haversine_m(lat, lng, it["latitude"], it["longitude"])
                if d > radius_m:
                    continue
                it["distance_m"] = int(d)
            result.append(it)
        result.sort(key=lambda i: (not i["live"], -i["created_at"].timestamp()))
        return Response(result)


class EventViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Event.objects.select_related("neighborhood")
        raw = self.request.query_params.get("date")
        if raw:
            try:
                qs = qs.filter(starts_at__date=date_cls.fromisoformat(raw))
            except ValueError:
                qs = qs.none()
        return qs

    @action(detail=True, methods=["post"])
    def reminder(self, request, pk=None):
        event = self.get_object()
        existing = Reminder.objects.filter(user=request.user, event=event)
        if existing.exists():
            existing.delete()
        else:
            Reminder.objects.create(user=request.user, event=event)
        return Response(self.get_serializer(event).data)
