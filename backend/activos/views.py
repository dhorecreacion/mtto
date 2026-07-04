from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
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

    @action(detail=False, methods=['get'], url_path='plantilla-excel')
    def plantilla_excel(self, request):
        """Descarga la plantilla de carga masiva con desplegables y catálogos."""
        from .excel_carga import generar_plantilla_equipos
        try:
            buf = generar_plantilla_equipos()
        except Exception as e:
            return Response({'error': f'Error al generar la plantilla: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="PLANTILLA_CARGA_EQUIPOS.xlsx"'
        return response

    @action(detail=False, methods=['post'], url_path='importar-excel')
    def importar_excel(self, request):
        """Recibe la plantilla llenada (multipart, campo "archivo") y crea los equipos. Solo admin."""
        from .excel_carga import importar_equipos
        if not request.user.is_staff:
            return Response({'error': 'Solo el administrador puede importar equipos.'}, status=status.HTTP_403_FORBIDDEN)
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'error': 'Adjunta el archivo Excel en el campo "archivo".'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            resultado = importar_equipos(archivo, request.user)
        except Exception as e:
            return Response({'error': f'No se pudo leer el archivo: {e}'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(resultado)


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
