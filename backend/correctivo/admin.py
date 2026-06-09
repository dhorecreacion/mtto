from django.contrib import admin
from .models import ProveedorTercero, OrdenCorrectiva, HistorialReemplazo

@admin.register(ProveedorTercero)
class ProveedorTerceroAdmin(admin.ModelAdmin):
    list_display = ('razon_social', 'ruc', 'especialidad', 'telefono', 'activo')
    search_fields = ('razon_social', 'ruc')

    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        else:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)

@admin.register(OrdenCorrectiva)
class OrdenCorrectivaAdmin(admin.ModelAdmin):
    list_display = ('id', 'equipo', 'tipo_ejecucion', 'estado', 'costo_total')
    list_filter = ('estado', 'tipo_ejecucion', 'fecha_resolucion')
    search_fields = ('equipo__codigo_activo', 'descripcion_falla')
    
    # Agrupar campos visualmente en el admin
    fieldsets = (
        ('Origen de la Falla', {
            'fields': ('equipo', 'informe_origen', 'descripcion_falla')
        }),
        ('Triaje y Asignación', {
            'fields': ('tipo_ejecucion', 'tecnico_interno', 'proveedor', 'estado')
        }),
        ('Resolución', {
            'fields': ('diagnostico_tecnico', 'repuestos_utilizados', 'costo_total', 'fecha_resolucion')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        else:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)

@admin.register(HistorialReemplazo)
class HistorialReemplazoAdmin(admin.ModelAdmin):
    list_display = ('seccion', 'equipo_saliente', 'equipo_entrante', 'fecha_reemplazo', 'tecnico')
    search_fields = ('seccion__nombre', 'equipo_saliente__codigo_activo', 'equipo_entrante__codigo_activo')
    readonly_fields = ('fecha_reemplazo',)

    def save_model(self, request, obj, form, change):
        if not change and not obj.tecnico_id:
            obj.tecnico = request.user
        super().save_model(request, obj, form, change)