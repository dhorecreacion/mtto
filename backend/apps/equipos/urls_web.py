from django.urls import path
from . import views_web

urlpatterns = [
    path('', views_web.dashboard, name='dashboard'),
    path('equipos/', views_web.lista_equipos, name='equipos_lista'),
]
