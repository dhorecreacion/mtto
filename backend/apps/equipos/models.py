from django.db import models


class Zona(models.TextChoices):
    PANADERIA = 'panaderia', 'Panadería'
    COCINA_CALIENTE = 'cocina_caliente', 'Cocina Caliente'
    CARNICOS = 'carnicos', 'Cárnicos'
    COMEDOR = 'comedor', 'Comedor'
    PASADIZO = 'pasadizo', 'Pasadizo'
    ALMACEN = 'almacen', 'Almacén'


class Equipo(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=100)
    zona = models.CharField(max_length=20, choices=Zona.choices)
    marca = models.CharField(max_length=50, blank=True)
    modelo = models.CharField(max_length=50, blank=True)
    numero_serie = models.CharField(max_length=100, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['zona', 'nombre']
        verbose_name = 'Equipo'
        verbose_name_plural = 'Equipos'

    def __str__(self):
        return f'{self.codigo} — {self.nombre} ({self.get_zona_display()})'
