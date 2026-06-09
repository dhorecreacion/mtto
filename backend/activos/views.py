from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from core.mixins import SoftDeleteMixin
from .models import Zona, Lugar, Seccion, Equipo, MantenimientoComponente
from .serializers import ZonaSerializer, LugarSerializer, SeccionSerializer, EquipoSerializer, ComponenteSerializer


class ZonaViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Zona.objects.filter(activo=True).order_by('nombre')
    serializer_class = ZonaSerializer

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)


class LugarViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LugarSerializer
    queryset = Lugar.objects.filter(activo=True).select_related('zona').order_by('nombre')

    def get_queryset(self):
        qs = super().get_queryset()
        zona = self.request.query_params.get('zona')
        if zona:
            qs = qs.filter(zona=zona)
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)


class SeccionViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SeccionSerializer
    queryset = Seccion.objects.filter(activo=True).select_related('lugar__zona').order_by('nombre')

    def get_queryset(self):
        qs = super().get_queryset()
        lugar = self.request.query_params.get('lugar')
        if lugar:
            qs = qs.filter(lugar=lugar)
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)


class EquipoViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EquipoSerializer
    queryset = Equipo.objects.filter(activo=True).select_related('seccion').prefetch_related('componentes').order_by('codigo_activo')

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        categoria = self.request.query_params.get('categoria')
        estado = self.request.query_params.get('estado')
        seccion = self.request.query_params.get('seccion')
        if categoria:
            qs = qs.filter(categoria_mantenimiento=categoria)
        if estado:
            qs = qs.filter(estado_operativo=estado)
        if seccion:
            qs = qs.filter(seccion=seccion)
        return qs


class ComponenteViewSet(SoftDeleteMixin, viewsets.ModelViewSet):
    serializer_class = ComponenteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MantenimientoComponente.objects.filter(
            equipo=self.kwargs['equipo_pk'],
            activo=True
        )

    def perform_create(self, serializer):
        equipo = Equipo.objects.get(pk=self.kwargs['equipo_pk'])
        serializer.save(equipo=equipo, creado_por=self.request.user)
