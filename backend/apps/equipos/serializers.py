from rest_framework import serializers
from .models import Equipo


class EquipoSerializer(serializers.ModelSerializer):
    zona_display = serializers.CharField(source='get_zona_display', read_only=True)

    class Meta:
        model = Equipo
        fields = ['id', 'codigo', 'nombre', 'zona', 'zona_display', 'marca', 'modelo']
