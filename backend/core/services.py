"""Regras do sistema de verificação: triagem automática, confirmação da comunidade e validação da redação."""
import math
from datetime import timedelta

from django.utils import timezone

from .models import Neighborhood, Report, get_profile

MAX_AUTHOR_DISTANCE_M = 2000   # autor precisa estar perto do local informado
CONFIRM_RADIUS_M = 1500        # só quem está perto confirma
COMMUNITY_THRESHOLD = 3.0      # soma dos pesos para "confirmado pela comunidade"
DUPLICATE_RADIUS_M = 300
DUPLICATE_WINDOW_HOURS = 3
MAX_REPORTS_PER_HOUR = 5
FLAGS_TO_REVIEW = 3

SENSATIONAL_TERMS = (
    "compartilhe",
    "repasse",
    "todo mundo precisa saber",
    "a mídia não mostra",
    "a midia nao mostra",
    "vão esconder",
    "vao esconder",
    "urgente!!!",
)


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_neighborhood(lat, lng):
    best, best_d = None, None
    for n in Neighborhood.objects.all():
        d = haversine_m(lat, lng, n.latitude, n.longitude)
        if best_d is None or d < best_d:
            best, best_d = n, d
    return best


def run_triage(report):
    """Etapa 1: checagens automáticas. Retorna (passou, notas)."""
    notes, passed = [], True
    text = f"{report.title} {report.description}".lower()

    if report.author_latitude is None or report.author_longitude is None:
        passed = False
        notes.append("Sem localização do autor: não foi possível conferir o local.")
    else:
        d = haversine_m(report.author_latitude, report.author_longitude, report.latitude, report.longitude)
        if d > MAX_AUTHOR_DISTANCE_M:
            passed = False
            notes.append(f"Autor a {int(d)} m do local informado (máximo {MAX_AUTHOR_DISTANCE_M} m).")
        else:
            notes.append(f"Localização conferida (autor a {int(d)} m do local).")

    if len(report.description.strip()) < 10:
        passed = False
        notes.append("Descrição muito curta.")

    if any(t in text for t in SENSATIONAL_TERMS) or text.count("!") >= 3:
        passed = False
        notes.append("Linguagem sensacionalista ou de corrente.")

    notes.append("Foto ou vídeo anexado." if report.photo else "Sem foto ou vídeo: confiança menor.")

    since = timezone.now() - timedelta(hours=DUPLICATE_WINDOW_HOURS)
    candidates = (
        Report.objects.exclude(pk=report.pk)
        .exclude(status=Report.DESCARTADO)
        .filter(category=report.category, created_at__gte=since)
    )
    for other in candidates:
        if haversine_m(report.latitude, report.longitude, other.latitude, other.longitude) <= DUPLICATE_RADIUS_M:
            notes.append(f"Possível duplicado do relato #{other.pk}.")
            break

    return passed, notes


def refresh_community_status(report):
    """Etapa 2: soma o peso das confirmações e atualiza o status."""
    score = sum(report.confirmations.values_list("weight", flat=True))
    report.community_score = score
    if report.status == Report.EM_ANALISE and report.triage_passed and score >= COMMUNITY_THRESHOLD:
        report.status = Report.COMUNIDADE
    elif report.status == Report.COMUNIDADE and score < COMMUNITY_THRESHOLD:
        report.status = Report.EM_ANALISE
    report.save(update_fields=["community_score", "status"])


def adjust_reputation(user, delta):
    profile = get_profile(user)
    profile.reputation = max(0, profile.reputation + delta)
    profile.save(update_fields=["reputation"])


def apply_review(report, staff_user, approve, note=""):
    """Etapa 3: validação da redação. Ajusta a reputação de quem enviou e de quem confirmou."""
    report.reviewed_by = staff_user
    report.reviewed_at = timezone.now()
    report.review_note = note[:240]
    if approve:
        report.status = Report.VERIFICADO
        adjust_reputation(report.author, +5)
        for c in report.confirmations.select_related("user"):
            adjust_reputation(c.user, +1)
    else:
        report.status = Report.DESCARTADO
        adjust_reputation(report.author, -10)
    report.save()
    return report
