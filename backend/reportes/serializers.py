from rest_framework import serializers
from .models import SeguimientoPredictivo, CorrectivosPendientes, TasaBajas


class SeguimientoPredictivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeguimientoPredictivo
        fields = '__all__'


class CorrectivosPendientesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorrectivosPendientes
        fields = '__all__'


class TasaBajasSerializer(serializers.ModelSerializer):
    class Meta:
        model = TasaBajas
        fields = '__all__'
