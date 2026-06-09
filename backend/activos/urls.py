from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers
from .views import ZonaViewSet, LugarViewSet, SeccionViewSet, EquipoViewSet, ComponenteViewSet

router = DefaultRouter()
router.register('zonas', ZonaViewSet)
router.register('lugares', LugarViewSet)
router.register('secciones', SeccionViewSet)
router.register('equipos', EquipoViewSet)

# Rutas anidadas: /equipos/{equipo_pk}/componentes/
equipos_router = nested_routers.NestedDefaultRouter(router, 'equipos', lookup='equipo')
equipos_router.register('componentes', ComponenteViewSet, basename='equipo-componentes')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(equipos_router.urls)),
]
