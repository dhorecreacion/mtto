from django.contrib import admin
from .models import Zona, Lugar, Seccion, Equipo, MantenimientoComponente


class AuditoriaAdminMixin:
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        else:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)  # type: ignore[misc]


@admin.register(Zona)
class ZonaAdmin(AuditoriaAdminMixin, admin.ModelAdmin):
    list_display = ('nombre', 'activo')


@admin.register(Lugar)
class LugarAdmin(AuditoriaAdminMixin, admin.ModelAdmin):
    list_display = ('nombre', 'zona', 'activo')
    list_filter = ('zona',)


@admin.register(Seccion)
class SeccionAdmin(AuditoriaAdminMixin, admin.ModelAdmin):
    list_display = ('nombre', 'lugar', 'activo')
    list_filter = ('lugar__zona', 'lugar')


class ComponenteInline(AuditoriaAdminMixin, admin.TabularInline):
    model = MantenimientoComponente
    extra = 1


@admin.register(Equipo)
class EquipoAdmin(AuditoriaAdminMixin, admin.ModelAdmin):
    list_display = ('codigo_activo', 'nombre', 'seccion', 'categoria_mantenimiento', 'estado_operativo')
    list_filter = ('categoria_mantenimiento', 'estado_operativo', 'criticidad')
    search_fields = ('codigo_activo', 'nombre', 'serie')
    inlines = [ComponenteInline]
