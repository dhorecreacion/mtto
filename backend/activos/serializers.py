from rest_framework import serializers
from .models import Zona, Lugar, Seccion, Equipo, MantenimientoComponente


class ZonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Zona
        fields = ['id', 'nombre', 'descripcion', 'activo']


class LugarSerializer(serializers.ModelSerializer):
    zona_nombre = serializers.CharField(source='zona.nombre', read_only=True)

    class Meta:
        model = Lugar
        fields = ['id', 'zona', 'zona_nombre', 'nombre', 'descripcion', 'activo']


class SeccionSerializer(serializers.ModelSerializer):
    lugar_nombre = serializers.CharField(source='lugar.nombre', read_only=True)

    class Meta:
        model = Seccion
        fields = ['id', 'lugar', 'lugar_nombre', 'nombre', 'descripcion', 'activo']


class ComponenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MantenimientoComponente
        fields = ['id', 'nombre_componente', 'descripcion']


class EquipoSerializer(serializers.ModelSerializer):
    componentes = ComponenteSerializer(many=True, read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)

    class Meta:
        model = Equipo
        fields = [
            'id', 'codigo_activo', 'nombre', 'serie', 'marca', 'modelo',
            'seccion', 'seccion_nombre', 'condicion', 'criticidad',
            'categoria_mantenimiento', 'estado_operativo', 'frecuencia',
            'foto_ficha', 'observaciones', 'activo', 'componentes',
        ]
