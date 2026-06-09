from django.contrib import admin
from .models import ProgramaMantenimiento, InformeMantenimiento, MantenimientoDetalleScore, EvidenciaFoto


class AuditoriaAdminMixin:
    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
        else:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)  # type: ignore[misc]


@admin.register(ProgramaMantenimiento)
class ProgramaMantenimientoAdmin(AuditoriaAdminMixin, admin.ModelAdmin):
    list_display = ('equipo', 'anio', 'mes_planificado', 'estado', 'score_salud_ultimo', 'requiere_tercero')
    list_filter = ('anio', 'mes_planificado', 'estado', 'requiere_tercero')
    search_fields = ('equipo__codigo_activo', 'equipo__nombre')


class DetalleScoreInline(AuditoriaAdminMixin, admin.TabularInline):
    model = MantenimientoDetalleScore
    extra = 1


class EvidenciaFotoInline(admin.TabularInline):
    model = EvidenciaFoto
    extra = 2


@admin.register(InformeMantenimiento)
class InformeMantenimientoAdmin(AuditoriaAdminMixin, admin.ModelAdmin):
    list_display = ('id', 'tecnico', 'fecha', 'estado_informe')
    list_filter = ('estado_informe', 'fecha', 'tecnico')
    inlines = [EvidenciaFotoInline, DetalleScoreInline]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.creado_por = request.user
            if not obj.tecnico_id:
                obj.tecnico = request.user
        else:
            obj.modificado_por = request.user
        super().save_model(request, obj, form, change)
