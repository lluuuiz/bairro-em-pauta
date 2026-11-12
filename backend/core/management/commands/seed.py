from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from core import services
from core.models import Confirmation, Event, Follow, Neighborhood, NewsItem, Report, get_profile

User = get_user_model()

BAIRROS = [
    ("Cidade Universitária", -8.0510, -34.9500),
    ("Torrões", -8.0600, -34.9300),
    ("Várzea", -8.0400, -34.9600),
    ("Iputinga", -8.0450, -34.9150),
]


class Command(BaseCommand):
    help = "Cria dados de exemplo (bairros, usuários, relatos, notícias e agenda)."

    def handle(self, *args, **opts):
        hoods = {}
        for name, lat, lng in BAIRROS:
            hoods[name], _ = Neighborhood.objects.get_or_create(name=name, defaults={"latitude": lat, "longitude": lng})

        if not User.objects.filter(username="redacao").exists():
            User.objects.create_superuser("redacao", "redacao@example.com", "redacao123")
        users = []
        for i, pts in enumerate([40, 12, 12, 3, 0], start=1):
            u, created = User.objects.get_or_create(username=f"morador{i}")
            if created:
                u.set_password("morador123")
                u.save()
            p = get_profile(u)
            p.reputation, p.neighborhood = pts, hoods["Cidade Universitária"]
            p.save()
            users.append(u)

        if Report.objects.exists():
            self.stdout.write("Relatos já existem; pulando exemplos.")
            return

        now = timezone.now()
        samples = [
            ("alagamento", "Água acumulada após a chuva dificulta a passagem", "Rua alagada na altura do número 120.", "Torrões", Report.VERIFICADO, 4, timedelta(minutes=25)),
            ("iluminacao", "Poste apagado perto do ponto de ônibus", "Poste apagado desde ontem à noite.", "Cidade Universitária", Report.COMUNIDADE, 3, timedelta(hours=2)),
            ("transito", "Semáforo piscando em cruzamento movimentado", "Semáforo amarelo piscando no cruzamento principal.", "Várzea", Report.EM_ANALISE, 0, timedelta(minutes=5)),
        ]
        for cat, title, desc, hood, status, n_conf, ago in samples:
            h = hoods[hood]
            r = Report.objects.create(
                author=users[0], category=cat, title=title, description=desc, neighborhood=h,
                latitude=h.latitude, longitude=h.longitude, author_latitude=h.latitude, author_longitude=h.longitude,
                triage_passed=True, triage_notes="Localização conferida.", status=Report.EM_ANALISE,
                created_at=now - ago,
            )
            for u in users[1:1 + n_conf]:
                Confirmation.objects.create(report=r, user=u, weight=get_profile(u).weight)
            services.refresh_community_status(r)
            if status == Report.VERIFICADO:
                r.status, r.reviewed_at = Report.VERIFICADO, now
                r.save(update_fields=["status", "reviewed_at"])

        cu = hoods["Cidade Universitária"]
        NewsItem.objects.create(kind="noticia", title="Equipe acompanha interdição de via perto da UFPE", category="Ao vivo",
                                neighborhood=cu, latitude=-8.0480, longitude=-34.9520, is_live=True, published_at=now - timedelta(minutes=8))
        today = timezone.localtime().replace(minute=0, second=0, microsecond=0)
        NewsItem.objects.create(kind="pauta", title="Reportagem sobre obras de drenagem", category="Serviços",
                                neighborhood=hoods["Várzea"], program="Telejornal local",
                                airs_at=today.replace(hour=9, minute=30))
        NewsItem.objects.create(kind="alerta", title="Previsão de chuva forte para o fim da tarde", category="Alerta",
                                neighborhood=cu, latitude=-8.0540, longitude=-34.9470)

        Event.objects.create(title="Feira de artesanato na praça do bairro", category="Cultura", neighborhood=hoods["Iputinga"],
                             starts_at=today.replace(hour=14), source=Event.REDACAO)
        Event.objects.create(title="Moradores debatem o transporte da região", category="Comunidade", neighborhood=cu,
                             starts_at=today.replace(hour=19, minute=15), source=Event.COMUNIDADE)
        Event.objects.create(title="Boletim do trânsito nos principais corredores", category="Trânsito", neighborhood=cu,
                             starts_at=(today + timedelta(days=1)).replace(hour=7), source=Event.REDACAO)
        Follow.objects.get_or_create(user=users[0], neighborhood=cu)
        self.stdout.write(self.style.SUCCESS("Dados de exemplo criados."))
