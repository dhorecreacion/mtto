from django.db import models


class SeguimientoPredictivo(models.Model):
    equipo_id         = models.UUIDField()
    codigo_activo     = models.CharField(max_length=50)
    equipo_nombre     = models.CharField(max_length=200)
    categoria_mantenimiento = models.CharField(max_length=20)
    criticidad        = models.CharField(max_length=20)
    programa_id       = models.UUIDField(null=True)
    anio              = models.IntegerField(null=True)
    mes_planificado   = models.IntegerField(null=True)
    estado_programa   = models.CharField(max_length=20, null=True)
    score_salud_ultimo = models.DecimalField(max_digits=3, decimal_places=2, null=True)
    requiere_tercero  = models.BooleanField(null=True)
    informe_id        = models.UUIDField(null=True)
    fecha_informe     = models.DateField(null=True)
    estado_informe    = models.CharField(max_length=20, null=True)
    hallazgos_generales = models.TextField(null=True)
    tecnico_username  = models.CharField(max_length=150, null=True)
    tecnico_nombre    = models.CharField(max_length=300, null=True)
    zona_nombre       = models.CharField(max_length=100, null=True)
    lugar_nombre      = models.CharField(max_length=150, null=True)
    seccion_nombre    = models.CharField(max_length=150, null=True)

    class Meta:
        managed = False
        db_table = 'vista_seguimiento_predictivo'


class CorrectivosPendientes(models.Model):
    orden_id          = models.UUIDField()
    codigo_orden      = models.CharField(max_length=8)
    codigo_activo     = models.CharField(max_length=50)
    equipo_nombre     = models.CharField(max_length=200)
    descripcion_falla = models.TextField()
    tipo_ejecucion    = models.CharField(max_length=20)
    estado            = models.CharField(max_length=30)
    costo_total       = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_resolucion  = models.DateTimeField(null=True)
    proveedor_nombre  = models.CharField(max_length=150, null=True)
    proveedor_especialidad = models.CharField(max_length=100, null=True)
    tecnico_username  = models.CharField(max_length=150, null=True)
    tecnico_nombre    = models.CharField(max_length=300, null=True)
    fecha_creacion    = models.DateTimeField()
    dias_abierto      = models.IntegerField(null=True)
    zona_nombre       = models.CharField(max_length=100, null=True)

    class Meta:
        managed = False
        db_table = 'vista_correctivos_pendientes'


class TasaBajas(models.Model):
    mes               = models.DateTimeField()
    anio              = models.FloatField()
    mes_numero        = models.FloatField()
    zona_nombre       = models.CharField(max_length=100)
    lugar_nombre      = models.CharField(max_length=150)
    seccion_nombre    = models.CharField(max_length=150)
    equipo_saliente_codigo = models.CharField(max_length=50)
    equipo_saliente_nombre = models.CharField(max_length=200)
    equipo_saliente_marca  = models.CharField(max_length=100, null=True)
    equipo_entrante_codigo = models.CharField(max_length=50)
    equipo_entrante_nombre = models.CharField(max_length=200)
    motivo_cambio     = models.TextField()
    tecnico_username  = models.CharField(max_length=150)
    tecnico_nombre    = models.CharField(max_length=300)
    fecha_reemplazo   = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'vista_tasa_bajas'
