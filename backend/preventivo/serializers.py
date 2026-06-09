from rest_framework import serializers
from .models import ProgramaMantenimiento, InformeMantenimiento, MantenimientoDetalleScore, EvidenciaFoto


class ProgramaMantenimientoSerializer(serializers.ModelSerializer):
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor_asignado.razon_social', read_only=True)

    class Meta:
        model = ProgramaMantenimiento
        fields = [
            'id', 'equipo', 'equipo_nombre', 'anio', 'mes_planificado',
            'estado', 'score_salud_ultimo', 'requiere_tercero',
            'proveedor_asignado', 'proveedor_nombre',
        ]


class DetalleScoreSerializer(serializers.ModelSerializer):
    componente_nombre = serializers.CharField(source='componente.nombre_componente', read_only=True)

    class Meta:
        model = MantenimientoDetalleScore
        fields = ['id', 'componente', 'componente_nombre', 'score_valor', 'observacion_tecnica']


class EvidenciaFotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaFoto
        fields = ['id', 'foto', 'tipo', 'descripcion', 'created_at']
        read_only_fields = ['created_at']


class InformeMantenimientoSerializer(serializers.ModelSerializer):
    detalles_score = DetalleScoreSerializer(many=True, read_only=True)
    evidencias = EvidenciaFotoSerializer(many=True, read_only=True)
    tecnico_nombre = serializers.CharField(source='tecnico.get_full_name', read_only=True)

    class Meta:
        model = InformeMantenimiento
        fields = [
            'id', 'programa', 'tecnico', 'tecnico_nombre', 'supervisor',
            'fecha', 'hora_inicio', 'hora_fin', 'hallazgos_generales',
            'estado_informe', 'comentario_rechazo', 'correctivo_auto_generado',
            'detalles_score', 'evidencias',
        ]
        read_only_fields = ['tecnico', 'supervisor', 'correctivo_auto_generado']

    def create(self, validated_data):
        validated_data['tecnico'] = self.context['request'].user
        return super().create(validated_data)
