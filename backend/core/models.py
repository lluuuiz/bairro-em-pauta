from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class Neighborhood(models.Model):
    name = models.CharField("bairro", max_length=80, unique=True)
    city = models.CharField("cidade", max_length=80, default="Recife")
    latitude = models.FloatField()
    longitude = models.FloatField()

    class Meta:
        ordering = ["name"]
        verbose_name = "bairro"

    def __str__(self):
        return self.name


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    neighborhood = models.ForeignKey(Neighborhood, null=True, blank=True, on_delete=models.SET_NULL)
    reputation = models.IntegerField("pontos de reputação", default=0)

    LEVELS = {1: ("Novo morador", 1.0), 2: ("Morador confiável", 1.5), 3: ("Morador referência", 2.0)}

    @property
    def level(self):
        if self.reputation >= 30:
            return 3
        if self.reputation >= 10:
            return 2
        return 1

    @property
    def level_label(self):
        return self.LEVELS[self.level][0]

    @property
    def weight(self):
        """Peso da confirmação: moradores com bom histórico pesam mais."""
        return self.LEVELS[self.level][1]

    def __str__(self):
        return f"{self.user} ({self.reputation} pts)"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)


def get_profile(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


class Report(models.Model):
    EM_ANALISE = "em_analise"
    COMUNIDADE = "comunidade"
    VERIFICADO = "verificado"
    DESCARTADO = "descartado"
    STATUS = [
        (EM_ANALISE, "Em análise"),
        (COMUNIDADE, "Confirmado pela comunidade"),
        (VERIFICADO, "Verificado pela redação"),
        (DESCARTADO, "Descartado"),
    ]
    CATEGORIES = [
        ("alagamento", "Alagamento"),
        ("iluminacao", "Iluminação"),
        ("transito", "Trânsito"),
        ("outro", "Outro"),
    ]

    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    category = models.CharField(max_length=20, choices=CATEGORIES)
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    neighborhood = models.ForeignKey(Neighborhood, null=True, blank=True, on_delete=models.SET_NULL)
    latitude = models.FloatField()
    longitude = models.FloatField()
    author_latitude = models.FloatField(null=True, blank=True)
    author_longitude = models.FloatField(null=True, blank=True)
    photo = models.ImageField(upload_to="reports/", blank=True)

    status = models.CharField(max_length=12, choices=STATUS, default=EM_ANALISE)
    triage_passed = models.BooleanField("passou na triagem", default=False)
    triage_notes = models.TextField("notas da triagem", blank=True)
    community_score = models.FloatField("peso das confirmações", default=0)
    review_note = models.CharField("nota da redação", max_length=240, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_reports"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "relato"

    def __str__(self):
        return f"#{self.pk} {self.title}"


class Confirmation(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="confirmations")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    weight = models.FloatField(default=1.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("report", "user")


class Flag(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name="flags")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    reason = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("report", "user")
        verbose_name = "denúncia"


class NewsItem(models.Model):
    NOTICIA, PAUTA, ALERTA = "noticia", "pauta", "alerta"
    KINDS = [(NOTICIA, "Notícia"), (PAUTA, "Pauta"), (ALERTA, "Alerta")]

    kind = models.CharField(max_length=10, choices=KINDS, default=NOTICIA)
    title = models.CharField(max_length=160)
    category = models.CharField(max_length=40, blank=True)
    neighborhood = models.ForeignKey(Neighborhood, null=True, blank=True, on_delete=models.SET_NULL)
    latitude = models.FloatField()
    longitude = models.FloatField()
    is_live = models.BooleanField("ao vivo", default=False)
    published_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-published_at"]
        verbose_name = "notícia da redação"


class Event(models.Model):
    REDACAO, COMUNIDADE = "redacao", "comunidade"
    SOURCES = [(REDACAO, "Pauta da redação"), (COMUNIDADE, "Confirmado pela comunidade")]

    title = models.CharField(max_length=160)
    category = models.CharField(max_length=40, blank=True)
    neighborhood = models.ForeignKey(Neighborhood, null=True, blank=True, on_delete=models.SET_NULL)
    starts_at = models.DateTimeField()
    source = models.CharField(max_length=10, choices=SOURCES, default=REDACAO)

    class Meta:
        ordering = ["starts_at"]
        verbose_name = "evento da agenda"


class Reminder(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="reminders")

    class Meta:
        unique_together = ("user", "event")
