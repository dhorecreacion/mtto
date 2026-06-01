from django.contrib import admin
from .models import Zona, Lugar, Seccion, Equipo, MantenimientoComponente

@admin.register(Zona)
class ZonaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')

@admin.register(Lugar)
class LugarAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'zona', 'activo')
    list_filter = ('zona',)

@admin.register(Seccion)
class SeccionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'lugar', 'activo')
    list_filter = ('lugar__zona', 'lugar')

class ComponenteInline(admin.TabularInline):
    model = MantenimientoComponente
    extra = 1 # Para agregar componentes rápido desde el perfil del equipo

@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ('codigo_activo', 'nombre', 'seccion', 'categoria_mantenimiento', 'estado_operativo')
    list_filter = ('categoria_mantenimiento', 'estado_operativo', 'criticidad')
    search_fields = ('codigo_activo', 'nombre', 'serie')
    inlines = [ComponenteInline] # Permite agregar los quemadores o motores dentro de la misma pantalla del Horno

    # Automatizar el usuario creador en el admin
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        else:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)