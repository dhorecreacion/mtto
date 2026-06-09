from rest_framework import viewsets, permissions, mixins
from rest_framework.viewsets import GenericViewSet
from .models import SeguimientoPredictivo, CorrectivosPendientes, TasaBajas
from .serializers import SeguimientoPredictivoSerializer, CorrectivosPendientesSerializer, TasaBajasSerializer


class ReadOnlyViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]


class SeguimientoPredictivoViewSet(ReadOnlyViewSet):
    serializer_class = SeguimientoPredictivoSerializer

    def get_queryset(self):
        qs = SeguimientoPredictivo.objects.all()
        anio = self.request.query_params.get('anio')
        equipo = self.request.query_params.get('equipo')
        zona = self.request.query_params.get('zona')
        if anio:
            qs = qs.filter(anio=anio)
        if equipo:
            qs = qs.filter(equipo_id=equipo)
        if zona:
            qs = qs.filter(zona_nombre__icontains=zona)
        return qs


class CorrectivosPendientesViewSet(ReadOnlyViewSet):
    serializer_class = CorrectivosPendientesSerializer

    def get_queryset(self):
        qs = CorrectivosPendientes.objects.all()
        estado = self.request.query_params.get('estado')
        tipo = self.request.query_params.get('tipo')
        if estado:
            qs = qs.filter(estado=estado)
        if tipo:
            qs = qs.filter(tipo_ejecucion=tipo)
        return qs


class TasaBajasViewSet(ReadOnlyViewSet):
    serializer_class = TasaBajasSerializer

    def get_queryset(self):
        qs = TasaBajas.objects.all()
        anio = self.request.query_params.get('anio')
        zona = self.request.query_params.get('zona')
        if anio:
            qs = qs.filter(anio=anio)
        if zona:
            qs = qs.filter(zona_nombre__icontains=zona)
        return qs
