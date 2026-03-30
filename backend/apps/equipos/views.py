from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Equipo
from .serializers import EquipoSerializer


class EquipoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Equipo.objects.filter(activo=True)
    serializer_class = EquipoSerializer
    permission_classes = [IsAuthenticated]
