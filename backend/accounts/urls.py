from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroView, PerfilView, UsuarioAdminViewSet

router = DefaultRouter()
router.register('usuarios', UsuarioAdminViewSet, basename='usuario')

urlpatterns = [
    path('registro/', RegistroView.as_view(), name='registro'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('', include(router.urls)),
]
