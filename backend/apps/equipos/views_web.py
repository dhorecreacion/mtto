from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from .models import Equipo


@login_required
def dashboard(request):
    return render(request, 'dashboard.html')


@login_required
def lista_equipos(request):
    equipos = Equipo.objects.filter(activo=True)
    return render(request, 'equipos/lista.html', {'equipos': equipos})
