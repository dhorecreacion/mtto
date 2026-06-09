from rest_framework import viewsets, permissions
from core.mixins import SoftDeleteMixin
from .models import ProveedorTercero, OrdenCorrectiva, HistorialReemplazo
from .serializers import ProveedorTerceroSerializer, OrdenCorrectivaSerializer, HistorialReemplazoSerializer


class ProveedorTerceroViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProveedorTerceroSerializer
    queryset = ProveedorTercero.objects.filter(activo=True)

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)


class OrdenCorrectivaViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrdenCorrectivaSerializer

    def get_queryset(self):
        qs = OrdenCorrectiva.objects.filter(activo=True).select_related(
            'equipo', 'tecnico_interno', 'proveedor'
        ).order_by('-created_at')
        estado = self.request.query_params.get('estado')
        equipo = self.request.query_params.get('equipo')
        if estado:
            qs = qs.filter(estado=estado)
        if equipo:
            qs = qs.filter(equipo=equipo)
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)


class HistorialReemplazoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HistorialReemplazoSerializer
    http_method_names = ['get', 'post']  # los swaps no se editan ni borran

    def get_queryset(self):
        return HistorialReemplazo.objects.select_related(
            'seccion', 'equipo_saliente', 'equipo_entrante', 'tecnico'
        ).order_by('-fecha_reemplazo')
