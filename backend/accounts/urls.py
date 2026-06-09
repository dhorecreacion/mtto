from django.urls import path
from .views import RegistroView, PerfilView, UsuarioListView

urlpatterns = [
    path('registro/', RegistroView.as_view(), name='registro'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('usuarios/', UsuarioListView.as_view(), name='usuarios'),
]
