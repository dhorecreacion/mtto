from rest_framework import serializers
from .models import ProveedorTercero, OrdenCorrectiva, HistorialReemplazo


class ProveedorTerceroSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProveedorTercero
        fields = ['id', 'razon_social', 'ruc', 'especialidad', 'contacto_nombre', 'telefono', 'activo']


class OrdenCorrectivaSerializer(serializers.ModelSerializer):
    equipo_nombre = serializers.CharField(source='equipo.nombre', read_only=True)
    tecnico_nombre = serializers.CharField(source='tecnico_interno.get_full_name', read_only=True)

    class Meta:
        model = OrdenCorrectiva
        fields = [
            'id', 'equipo', 'equipo_nombre', 'informe_origen',
            'tipo_ejecucion', 'tecnico_interno', 'tecnico_nombre',
            'proveedor', 'descripcion_falla', 'diagnostico_tecnico',
            'repuestos_utilizados', 'costo_total', 'estado', 'fecha_resolucion',
        ]

    def validate(self, data):
        # Combina lo que llega con lo existente (para updates parciales)
        def actual(campo):
            if campo in data:
                return data[campo]
            return getattr(self.instance, campo, None)

        tipo = actual('tipo_ejecucion')
        estado = actual('estado')

        # Estados contradictorios con el tipo de ejecución
        if estado == OrdenCorrectiva.EstadoOrden.ESPERANDO_TERCERO and tipo != OrdenCorrectiva.TipoEjecucion.TERCERO:
            raise serializers.ValidationError(
                {'estado': 'El estado "Esperando Tercero" solo aplica a órdenes tercerizadas.'}
            )

        # Normalización: cada tipo solo conserva su asignación válida
        if tipo == OrdenCorrectiva.TipoEjecucion.INTERNO:
            data['proveedor'] = None
        elif tipo == OrdenCorrectiva.TipoEjecucion.TERCERO:
            data['tecnico_interno'] = None

        return data


class HistorialReemplazoSerializer(serializers.ModelSerializer):
    equipo_saliente_codigo = serializers.CharField(source='equipo_saliente.codigo_activo', read_only=True)
    equipo_entrante_codigo = serializers.CharField(source='equipo_entrante.codigo_activo', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)

    class Meta:
        model = HistorialReemplazo
        fields = [
            'id', 'seccion', 'seccion_nombre',
            'equipo_saliente', 'equipo_saliente_codigo',
            'equipo_entrante', 'equipo_entrante_codigo',
            'motivo_cambio', 'tecnico', 'fecha_reemplazo',
        ]
        read_only_fields = ['fecha_reemplazo', 'tecnico']

    def validate(self, data):
        from activos.models import Equipo
        saliente = data.get('equipo_saliente')
        entrante = data.get('equipo_entrante')
        seccion = data.get('seccion')

        if saliente and saliente.categoria_mantenimiento != Equipo.Categoria.REEMPLAZABLE:
            raise serializers.ValidationError({'equipo_saliente': 'El equipo saliente debe ser REEMPLAZABLE.'})
        if entrante and entrante.categoria_mantenimiento != Equipo.Categoria.REEMPLAZABLE:
            raise serializers.ValidationError({'equipo_entrante': 'El equipo entrante debe ser REEMPLAZABLE.'})
        if saliente and entrante and saliente.id == entrante.id:
            raise serializers.ValidationError('El equipo entrante y saliente no pueden ser el mismo.')

        # El saliente debe estar EN_USO y pertenecer a la sección indicada
        if saliente:
            if saliente.estado_operativo != Equipo.EstadoOperativo.EN_USO:
                raise serializers.ValidationError({'equipo_saliente': 'El equipo saliente debe estar EN USO.'})
            if seccion and saliente.seccion_id != seccion.id:
                raise serializers.ValidationError({'equipo_saliente': 'El equipo saliente no pertenece a la sección indicada.'})

        # El entrante debe estar EN_ALMACEN (no en uso en otra sección)
        if entrante and entrante.estado_operativo != Equipo.EstadoOperativo.EN_ALMACEN:
            raise serializers.ValidationError({'equipo_entrante': 'El equipo entrante debe estar EN ALMACÉN.'})

        return data

    def create(self, validated_data):
        validated_data['tecnico'] = self.context['request'].user
        return super().create(validated_data)
