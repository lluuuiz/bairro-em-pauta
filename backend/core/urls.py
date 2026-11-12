from django.urls import include, path
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("reports", views.ReportViewSet, basename="report")
router.register("events", views.EventViewSet, basename="event")
router.register("neighborhoods", views.NeighborhoodViewSet, basename="neighborhood")

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view()),
    path("auth/login/", obtain_auth_token),
    path("me/", views.MeView.as_view()),
    path("map/", views.MapItemsView.as_view()),
    path("", include(router.urls)),
]
