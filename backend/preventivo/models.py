import uuid
import datetime
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from activos.models import ModeloAuditoria, Equipo, MantenimientoComponente
from django.core.validators import MinValueValidator, MaxValueValidator

# ============================================================
# 1. EL CALENDARIO (Programa Anual)
# ============================================================

class ProgramaMantenimiento(ModeloAuditoria):
    class EstadoPrograma(models.TextChoices):
        PLANIFICADO       = 'PLANIFICADO',       'Planificado'
        EJECUTADO         = 'EJECUTADO',         'Ejecutado'
        ATRASADO          = 'ATRASADO',          'Atrasado'
        PENDIENTE_TERCERO = 'PENDIENTE_TERCERO', 'Pendiente de Tercero'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name='programaciones')
    anio = models.IntegerField()
    mes_planificado = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    estado = models.CharField(max_length=20, choices=EstadoPrograma.choices, default=EstadoPrograma.PLANIFICADO)

    score_salud_ultimo = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    requiere_tercero = models.BooleanField(default=False)
    proveedor_asignado = models.ForeignKey(
        'correctivo.ProveedorTercero',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='programas_asignados'
    )

    class Meta(ModeloAuditoria.Meta):
        unique_together = ('equipo', 'anio', 'mes_planificado')

    def clean(self):
        if hasattr(self, 'equipo') and self.equipo.categoria_mantenimiento != Equipo.Categoria.INDUSTRIAL:
            raise ValidationError(
                {'equipo': 'Solo se puede programar mantenimiento preventivo a equipos INDUSTRIAL.'}
            )

    def __str__(self):
        return f"{self.equipo.codigo_activo} - {self.anio}/{self.mes_planificado} ({self.estado})"

# ============================================================
# 2. EL REPORTE DEL TÉCNICO (Cabecera del FORM-DHO-061)
# ============================================================

class InformeMantenimiento(ModeloAuditoria):
    class EstadoInforme(models.TextChoices):
        BORRADOR = 'BORRADOR', 'Borrador'
        ENVIADO = 'ENVIADO', 'Enviado a Revisión'
        APROBADO = 'APROBADO', 'Aprobado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Puede ser nulo si el mantenimiento no estaba planificado
    programa = models.ForeignKey(ProgramaMantenimiento, on_delete=models.SET_NULL, null=True, blank=True, related_name='informes')
    
    tecnico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='informes_tecnico')
    supervisor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='informes_supervisor')
    
    fecha = models.DateField(default=datetime.date.today)
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    
    # Textos generales del técnico
    hallazgos_generales = models.TextField(null=True, blank=True)
    estado_informe = models.CharField(max_length=20, choices=EstadoInforme.choices, default=EstadoInforme.BORRADOR)
    comentario_rechazo = models.TextField(null=True, blank=True)
    # Evita que la derivación automática (score 5) genere órdenes duplicadas al re-aprobar
    correctivo_auto_generado = models.BooleanField(default=False)

    def __str__(self):
        return f"Informe {self.id} - {self.fecha}"

# ============================================================
# 3. MOTOR PREDICTIVO (Los Scores 1 al 5)
# ============================================================

class MantenimientoDetalleScore(ModeloAuditoria):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    informe = models.ForeignKey(InformeMantenimiento, on_delete=models.CASCADE, related_name='detalles_score')
    componente = models.ForeignKey(MantenimientoComponente, on_delete=models.RESTRICT, related_name='historial_scores')
    
    # El dato maestro: 1 (Excelente) a 5 (Falla)
    score_valor = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    observacion_tecnica = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.componente.nombre_componente}: Score {self.score_valor}"

# ============================================================
# 4. RESPALDO VISUAL (Antes y Después)
# ============================================================

class EvidenciaFoto(models.Model):
    class TipoFoto(models.TextChoices):
        ANTES = 'ANTES', 'Antes'
        DESPUES = 'DESPUES', 'Después'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    informe = models.ForeignKey(InformeMantenimiento, on_delete=models.CASCADE, related_name='evidencias')
    foto = models.ImageField(upload_to='evidencias_mantenimiento/%Y/%m/')
    tipo = models.CharField(max_length=20, choices=TipoFoto.choices)
    descripcion = models.CharField(max_length=255, null=True, blank=True) # Para que el técnico explique la foto
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Foto {self.tipo} - Informe {self.informe.id}"