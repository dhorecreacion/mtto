from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import ProgramaMantenimientoViewSet, InformeMantenimientoViewSet, DetalleScoreViewSet, EvidenciaFotoViewSet

router = DefaultRouter()
router.register('programas', ProgramaMantenimientoViewSet, basename='programa')
router.register('informes', InformeMantenimientoViewSet, basename='informe')

# Rutas anidadas: /informes/{informe_pk}/scores/ y /informes/{informe_pk}/fotos/
informes_router = nested_routers.NestedDefaultRouter(router, 'informes', lookup='informe')
informes_router.register('scores', DetalleScoreViewSet, basename='informe-scores')
informes_router.register('fotos', EvidenciaFotoViewSet, basename='informe-fotos')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(informes_router.urls)),
]
