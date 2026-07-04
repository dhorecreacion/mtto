from django.db import models
from django.conf import settings
import uuid

# 1. MODELO BASE (Para Auditoría y Borrado Lógico)
class ModeloAuditoria(models.Model):
    activo = models.BooleanField(default=True)
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name="%(class)s_creados")
    modificado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="%(class)s_modificados")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True # Esto evita que Django cree una tabla para este modelo

# ============================================================
# 2. JERARQUÍA GEOGRÁFICA
# ============================================================

class Zona(ModeloAuditoria):
    nombre = models.CharField(max_length=100, unique=True) # Ej: Reservada, Agua Dulce
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

class Lugar(ModeloAuditoria):
    zona = models.ForeignKey(Zona, on_delete=models.RESTRICT, related_name='lugares')
    nombre = models.CharField(max_length=150) # Ej: Módulo Plata
    descripcion = models.TextField(blank=True, null=True)

    class Meta(ModeloAuditoria.Meta):
        unique_together = ('zona', 'nombre')

    def __str__(self):
        return f"{self.zona.nombre} - {self.nombre}"

class Seccion(ModeloAuditoria):
    lugar = models.ForeignKey(Lugar, on_delete=models.RESTRICT, related_name='secciones')
    nombre = models.CharField(max_length=150) # Ej: Cuarto 101, Cocina Caliente
    descripcion = models.TextField(blank=True, null=True)

    class Meta(ModeloAuditoria.Meta):
    
        unique_together = ('lugar', 'nombre')
    def __str__(self):
        return f"{self.lugar.nombre} - {self.nombre}"

# ============================================================
# 3. MAESTRO DE EQUIPOS
# ============================================================

class Equipo(ModeloAuditoria):
    class Condicion(models.TextChoices):
        BUENA = 'BUENA', 'Buena'
        INTERMEDIA = 'INTERMEDIA', 'Intermedia'
        MALA = 'MALA', 'Mala'

    class Criticidad(models.TextChoices):
        ALTA = 'ALTA', 'Alta'
        MEDIA = 'MEDIA', 'Media'
        BAJA = 'BAJA', 'Baja'

    class Frecuencia(models.TextChoices):
        MENSUAL = 'MENSUAL', 'Mensual'
        BIMENSUAL = 'BIMENSUAL', 'Bimensual'
        TRIMESTRAL = 'TRIMESTRAL', 'Trimestral'

    class Categoria(models.TextChoices):
        INDUSTRIAL = 'INDUSTRIAL', 'Industrial (Predictivo)'
        REEMPLAZABLE = 'REEMPLAZABLE', 'Reemplazable (Swaps)'

    class EstadoOperativo(models.TextChoices):
        EN_USO = 'EN_USO', 'En Uso'
        EN_REPARACION = 'EN_REPARACION', 'En Reparación'
        EN_ALMACEN = 'EN_ALMACEN', 'En Almacén'
        DADO_DE_BAJA = 'DADO_DE_BAJA', 'Dado de Baja'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Seccion permite nulos porque si está en el almacén o dado de baja, no tiene cuarto asignado
    seccion = models.ForeignKey(Seccion, on_delete=models.RESTRICT, related_name='equipos', null=True, blank=True) 
    
    codigo_activo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=200)
    serie = models.CharField(max_length=100, blank=True, null=True)
    marca = models.CharField(max_length=100, blank=True, null=True)
    modelo = models.CharField(max_length=100, blank=True, null=True)
    
    condicion = models.CharField(max_length=12, choices=Condicion.choices)
    criticidad = models.CharField(max_length=20, choices=Criticidad.choices, default=Criticidad.MEDIA)
    
    # Frecuencia puede ser nula para las estufas/camarotes (Reemplazables)
    frecuencia = models.CharField(max_length=15, choices=Frecuencia.choices, blank=True, null=True)
    
    # Nuevos campos del modelo híbrido
    categoria_mantenimiento = models.CharField(max_length=20, choices=Categoria.choices, default=Categoria.INDUSTRIAL)
    estado_operativo = models.CharField(max_length=20, choices=EstadoOperativo.choices, default=EstadoOperativo.EN_USO)

    foto_ficha = models.ImageField(upload_to='equipos_fichas/', blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"[{self.codigo_activo}] {self.nombre}"

# ============================================================
# 4. COMPONENTES (Para el Mantenimiento Predictivo)
# ============================================================

class MantenimientoComponente(ModeloAuditoria):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name='componentes')
    nombre_componente = models.CharField(max_length=100) # Ej: Motor, Quemador
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.equipo.nombre} - {self.nombre_componente}"