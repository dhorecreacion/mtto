from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProveedorTerceroViewSet, OrdenCorrectivaViewSet, HistorialReemplazoViewSet

router = DefaultRouter()
router.register('proveedores', ProveedorTerceroViewSet)
router.register('ordenes', OrdenCorrectivaViewSet, basename='orden')
router.register('swaps', HistorialReemplazoViewSet, basename='swap')

urlpatterns = [
    path('', include(router.urls)),
]
