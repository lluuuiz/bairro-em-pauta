from django.contrib.auth import get_user_model
from rest_framework import serializers

from . import services
from .models import Event, Follow, Neighborhood, Notice, Report, Reminder, get_profile

User = get_user_model()


class NeighborhoodSerializer(serializers.ModelSerializer):
    followed = serializers.SerializerMethodField()

    class Meta:
        model = Neighborhood
        fields = ["id", "name", "city", "latitude", "longitude", "followed"]

    def get_followed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Follow.objects.filter(user=request.user, neighborhood=obj).exists()


class NoticeSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="news.title")
    kind = serializers.CharField(source="news.kind")
    program = serializers.CharField(source="news.program")
    airs_at = serializers.DateTimeField(source="news.airs_at")
    category = serializers.CharField(source="news.category")
    neighborhood = serializers.CharField(source="news.neighborhood.name", default="")

    class Meta:
        model = Notice
        fields = ["id", "read", "created_at", "title", "kind", "program", "airs_at", "category", "neighborhood"]


class MeSerializer(serializers.ModelSerializer):
    reputation = serializers.SerializerMethodField()
    level = serializers.SerializerMethodField()
    level_label = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "is_staff", "reputation", "level", "level_label"]

    def get_reputation(self, obj):
        return get_profile(obj).reputation

    def get_level(self, obj):
        return get_profile(obj).level

    def get_level_label(self, obj):
        return get_profile(obj).level_label


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30)
    password = serializers.CharField(min_length=6, write_only=True)
    neighborhood = serializers.PrimaryKeyRelatedField(
        queryset=Neighborhood.objects.all(), required=False, allow_null=True
    )

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Esse nome de usuário já está em uso.")
        return value

    def create(self, data):
        user = User.objects.create_user(username=data["username"], password=data["password"])
        profile = get_profile(user)
        profile.neighborhood = data.get("neighborhood")
        profile.save(update_fields=["neighborhood"])
        return user


class ReportSerializer(serializers.ModelSerializer):
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    neighborhood_name = serializers.CharField(source="neighborhood.name", read_only=True, default="")
    confirmations_count = serializers.SerializerMethodField()
    confirmed_by_me = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    distance_m = serializers.SerializerMethodField()
    photo = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Report
        fields = [
            "id", "category", "category_label", "title", "description", "photo",
            "latitude", "longitude", "author_latitude", "author_longitude",
            "neighborhood", "neighborhood_name",
            "status", "status_label", "triage_passed", "triage_notes", "review_note",
            "confirmations_count", "confirmed_by_me", "is_mine", "distance_m", "created_at",
        ]
        read_only_fields = [
            "status", "triage_passed", "triage_notes", "review_note", "created_at", "neighborhood",
        ]
        extra_kwargs = {"author_latitude": {"write_only": True}, "author_longitude": {"write_only": True}}

    def _user(self):
        request = self.context.get("request")
        return request.user if request and request.user.is_authenticated else None

    def get_confirmations_count(self, obj):
        total = getattr(obj, "confirmations_total", None)
        return total if total is not None else obj.confirmations.count()

    def get_confirmed_by_me(self, obj):
        user = self._user()
        return bool(user and obj.confirmations.filter(user=user).exists())

    def get_is_mine(self, obj):
        user = self._user()
        return bool(user and obj.author_id == user.id)

    def get_distance_m(self, obj):
        lat, lng = self.context.get("user_lat"), self.context.get("user_lng")
        if lat is None or lng is None:
            return None
        return int(services.haversine_m(lat, lng, obj.latitude, obj.longitude))


class EventSerializer(serializers.ModelSerializer):
    neighborhood_name = serializers.CharField(source="neighborhood.name", read_only=True, default="")
    source_label = serializers.CharField(source="get_source_display", read_only=True)
    has_reminder = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = ["id", "title", "category", "neighborhood_name", "starts_at", "source", "source_label", "has_reminder"]

    def get_has_reminder(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Reminder.objects.filter(user=request.user, event=obj).exists()
