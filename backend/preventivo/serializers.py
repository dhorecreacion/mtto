from rest_framework import serializers
from .models import ProgramaMantenimiento, InformeMantenimiento, MantenimientoDetalleScore, EvidenciaFoto


class ProgramaMantenimientoSerializer(serializers.ModelSerializer):
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)

    class Meta:
        model = ProgramaMantenimiento
        fields = [
            'id', 'equipo', 'equipo_nombre', 'anio', 'mes_planificado',
            'estado', 'score_salud_ultimo', 'requiere_tercero',
        ]
        # requiere_tercero es denormalizado: lo calcula el servidor al derivar
        read_only_fields = ['requiere_tercero', 'score_salud_ultimo']


class DetalleScoreSerializer(serializers.ModelSerializer):
    componente_nombre = serializers.CharField(source='componente.nombre_componente', read_only=True)

    class Meta:
        model = MantenimientoDetalleScore
        fields = [
            'id', 'componente', 'componente_nombre',
            'score_inicial', 'intervencion', 'detalle_intervencion',
            'score_valor', 'observacion_tecnica',
            'requiere_tercero', 'derivado', 'orden_derivada',
        ]
        read_only_fields = ['derivado', 'orden_derivada']

    def validate(self, data):
        def actual(campo, default=None):
            if campo in data:
                return data[campo]
            return getattr(self.instance, campo, default)

        score_inicial = actual('score_inicial')
        intervencion = actual('intervencion', False)
        score_final = actual('score_valor')

        # Si no se informó score inicial, se asume igual al final (registro simple)
        if score_inicial is None:
            data['score_inicial'] = score_final
        # Sin intervención, el estado final es el encontrado
        elif not intervencion and score_inicial != score_final:
            data['score_valor'] = score_inicial

        # "Requiere tercero" solo tiene sentido si quedó sin resolver (final 4-5)
        if actual('requiere_tercero', False) and (data.get('score_valor') or score_final) < 4:
            raise serializers.ValidationError(
                {'requiere_tercero': 'Solo aplica cuando el score final es 4 o 5 (no resuelto).'}
            )

        return data


class EvidenciaFotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaFoto
        fields = ['id', 'foto', 'tipo', 'descripcion', 'created_at']
        read_only_fields = ['created_at']


class InformeMantenimientoSerializer(serializers.ModelSerializer):
    detalles_score = DetalleScoreSerializer(many=True, read_only=True)
    evidencias = EvidenciaFotoSerializer(many=True, read_only=True)
    tecnico_nombre = serializers.CharField(source='tecnico.get_full_name', read_only=True)
    equipo_nombre = serializers.SerializerMethodField()
    mes = serializers.SerializerMethodField()

    class Meta:
        model = InformeMantenimiento
        fields = [
            'id', 'programa', 'equipo_nombre', 'mes', 'tecnico', 'tecnico_nombre', 'supervisor',
            'fecha', 'hora_inicio', 'hora_fin', 'hallazgos_generales',
            'estado_informe', 'comentario_rechazo',
            'detalles_score', 'evidencias',
        ]
        read_only_fields = ['tecnico', 'supervisor']

    def get_equipo_nombre(self, obj):
        return obj.programa.equipo.nombre if obj.programa else None

    def get_mes(self, obj):
        return obj.programa.mes_planificado if obj.programa else None

    def create(self, validated_data):
        validated_data['tecnico'] = self.context['request'].user
        return super().create(validated_data)
