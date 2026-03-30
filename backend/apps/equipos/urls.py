from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipoViewSet

router = DefaultRouter()
router.register('equipos', EquipoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
