from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import MantenimientoDetalleScore


def _recalcular_score_salud(informe):
    programa = informe.programa
    if programa is None:
        return

    # Solo promedia los scores del informe más reciente, no de todos
    ultimo_informe = programa.informes.order_by('-fecha').first()
    if ultimo_informe is None:
        return

    promedio = MantenimientoDetalleScore.objects.filter(
        informe=ultimo_informe
    ).aggregate(avg=Avg('score_valor'))['avg']

    programa.score_salud_ultimo = promedio
    programa.save(update_fields=['score_salud_ultimo'])


@receiver(post_save, sender=MantenimientoDetalleScore)
def actualizar_score_al_guardar(sender, instance, **kwargs):
    _recalcular_score_salud(instance.informe)


@receiver(post_delete, sender=MantenimientoDetalleScore)
def actualizar_score_al_eliminar(sender, instance, **kwargs):
    _recalcular_score_salud(instance.informe)
