from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from activos.models import ModeloAuditoria, Equipo, Seccion
from preventivo.models import InformeMantenimiento
from decimal import Decimal
import uuid

# ============================================================
# 1. GESTIÓN DE PROVEEDORES (TERCEROS)
# ============================================================

class ProveedorTercero(ModeloAuditoria):
    razon_social = models.CharField(max_length=150)
    ruc = models.CharField(max_length=20, unique=True)
    especialidad = models.CharField(max_length=100) # Ej: Refrigeración, Electromecánica
    contacto_nombre = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.razon_social} ({self.ruc})"

# ============================================================
# 2. ÓRDENES CORRECTIVAS (Triaje y Emergencias)
# ============================================================

class OrdenCorrectiva(ModeloAuditoria):
    class TipoEjecucion(models.TextChoices):
        INTERNO = 'INTERNO', 'Personal Interno'
        TERCERO = 'TERCERO', 'Proveedor Tercero'

    class EstadoOrden(models.TextChoices):
        PENDIENTE = 'PENDIENTE', 'Pendiente'
        EN_PROCESO = 'EN_PROCESO', 'En Proceso'
        ESPERANDO_REPUESTO = 'ESPERANDO_REPUESTO', 'Esperando Repuesto'
        ESPERANDO_TERCERO = 'ESPERANDO_TERCERO', 'Esperando Tercero'
        COMPLETADO = 'COMPLETADO', 'Completado'
        CANCELADO = 'CANCELADO', 'Cancelado'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipo = models.ForeignKey(Equipo, on_delete=models.RESTRICT, related_name='ordenes_correctivas')
    
    # Si la falla nació de un preventivo (Score 4 o 5), se enlaza aquí
    informe_origen = models.ForeignKey(InformeMantenimiento, on_delete=models.SET_NULL, null=True, blank=True, related_name='correctivos_derivados')
    
    # La decisión del Supervisor:
    tipo_ejecucion = models.CharField(max_length=20, choices=TipoEjecucion.choices, default=TipoEjecucion.INTERNO)
    
    # Asignaciones según el tipo:
    tecnico_interno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes_asignadas')
    proveedor = models.ForeignKey(ProveedorTercero, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes_tercerizadas')
    
    descripcion_falla = models.TextField()
    diagnostico_tecnico = models.TextField(blank=True, null=True)
    repuestos_utilizados = models.TextField(blank=True, null=True)
    
    # Clave para el reporte de Costos (CAPEX/OPEX)
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    estado = models.CharField(max_length=30, choices=EstadoOrden.choices, default=EstadoOrden.PENDIENTE)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)

    # La falla dejó el equipo fuera de servicio: suspende sus preventivos
    # pendientes (STANDBY) hasta que la orden se complete o cancele.
    equipo_inoperativo = models.BooleanField(default=False)

    ESTADOS_CERRADOS = (EstadoOrden.COMPLETADO, EstadoOrden.CANCELADO)

    @property
    def inoperatividad_vigente(self):
        """True mientras esta orden mantiene al equipo fuera de servicio."""
        return self.activo and self.equipo_inoperativo and self.estado not in self.ESTADOS_CERRADOS

    def suspender_preventivos(self):
        """Equipo -> EN_REPARACION; sus programas PLANIFICADO del mes actual
        en adelante -> STANDBY. Los ya ATRASADO de meses previos se conservan
        (se incumplieron antes de la falla)."""
        from django.utils import timezone
        from preventivo.models import ProgramaMantenimiento

        hoy = timezone.localdate()
        ProgramaMantenimiento.objects.filter(
            equipo=self.equipo, activo=True,
            estado=ProgramaMantenimiento.EstadoPrograma.PLANIFICADO,
        ).filter(
            models.Q(anio__gt=hoy.year) | models.Q(anio=hoy.year, mes_planificado__gte=hoy.month)
        ).update(estado=ProgramaMantenimiento.EstadoPrograma.STANDBY)

        if self.equipo.estado_operativo == Equipo.EstadoOperativo.EN_USO:
            self.equipo.estado_operativo = Equipo.EstadoOperativo.EN_REPARACION
            self.equipo.save(update_fields=['estado_operativo'])

    def reactivar_preventivos(self, fecha_retorno=None):
        """Al cerrar la orden: equipo -> EN_USO y los programas STANDBY desde
        el mes de retorno vuelven a PLANIFICADO. Los meses transcurridos parado
        quedan en STANDBY como registro histórico. No hace nada si otra orden
        sigue manteniendo al equipo inoperativo."""
        from django.utils import timezone
        from preventivo.models import ProgramaMantenimiento

        otras_vigentes = OrdenCorrectiva.objects.filter(
            equipo=self.equipo, activo=True, equipo_inoperativo=True,
        ).exclude(pk=self.pk).exclude(estado__in=self.ESTADOS_CERRADOS)
        if otras_vigentes.exists():
            return

        retorno = fecha_retorno or timezone.localdate()
        ProgramaMantenimiento.objects.filter(
            equipo=self.equipo, activo=True,
            estado=ProgramaMantenimiento.EstadoPrograma.STANDBY,
        ).filter(
            models.Q(anio__gt=retorno.year) | models.Q(anio=retorno.year, mes_planificado__gte=retorno.month)
        ).update(estado=ProgramaMantenimiento.EstadoPrograma.PLANIFICADO)

        if self.equipo.estado_operativo == Equipo.EstadoOperativo.EN_REPARACION:
            self.equipo.estado_operativo = Equipo.EstadoOperativo.EN_USO
            self.equipo.save(update_fields=['estado_operativo'])

    def __str__(self):
        return f"OT-{self.id.hex[:6].upper()} | {self.equipo.codigo_activo} ({self.estado})"

# ============================================================
# 3. SWAPS / REEMPLAZOS (Estufas, Camarotes, etc.)
# ============================================================

class HistorialReemplazo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seccion = models.ForeignKey(Seccion, on_delete=models.RESTRICT, related_name='historial_cambios')
    
    equipo_saliente = models.ForeignKey(Equipo, on_delete=models.RESTRICT, related_name='reemplazos_como_saliente')
    equipo_entrante = models.ForeignKey(Equipo, on_delete=models.RESTRICT, related_name='reemplazos_como_entrante')
    
    motivo_cambio = models.TextField() # Ej: "Resistencia quemada, cambio total"
    tecnico = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name='swaps_realizados')
    fecha_reemplazo = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Swap en {self.seccion.nombre}: Salió {self.equipo_saliente.codigo_activo} -> Entró {self.equipo_entrante.codigo_activo}"

    def clean(self):
        for field, equipo in [('equipo_saliente', self.equipo_saliente if hasattr(self, 'equipo_saliente') else None),
                               ('equipo_entrante', self.equipo_entrante if hasattr(self, 'equipo_entrante') else None)]:
            if equipo and equipo.categoria_mantenimiento != Equipo.Categoria.REEMPLAZABLE:
                raise ValidationError(
                    {field: f'Solo se pueden hacer swaps de equipos REEMPLAZABLE. "{equipo.codigo_activo}" es INDUSTRIAL.'}
                )

    # Actualiza el estado de los equipos automáticamente al guardar el Swap.
    # Transacción: si algo falla, no queda inventario a medio actualizar.
    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new:
            # El equipo viejo pasa a DADO_DE_BAJA y pierde su sección
            self.equipo_saliente.estado_operativo = Equipo.EstadoOperativo.DADO_DE_BAJA
            self.equipo_saliente.seccion = None
            self.equipo_saliente.save(update_fields=['estado_operativo', 'seccion'])

            # El equipo nuevo pasa a EN_USO y se le asigna la sección del viejo
            self.equipo_entrante.estado_operativo = Equipo.EstadoOperativo.EN_USO
            self.equipo_entrante.seccion = self.seccion
            self.equipo_entrante.save(update_fields=['estado_operativo', 'seccion'])