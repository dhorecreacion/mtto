from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SeguimientoPredictivoViewSet, CorrectivosPendientesViewSet, TasaBajasViewSet

router = DefaultRouter()
router.register('seguimiento-predictivo', SeguimientoPredictivoViewSet, basename='seguimiento')
router.register('correctivos-pendientes', CorrectivosPendientesViewSet, basename='correctivos-pendientes')
router.register('tasa-bajas', TasaBajasViewSet, basename='tasa-bajas')

urlpatterns = [
    path('', include(router.urls)),
]
