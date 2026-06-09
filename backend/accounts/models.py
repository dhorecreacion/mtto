from django.db import models
from django.contrib.auth.models import AbstractUser


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        TECNICO = 'TECNICO', 'Técnico'
        CLIENTE = 'CLIENTE', 'Cliente'

    rol = models.CharField(
        max_length=15,
        choices=Rol.choices,
        default=Rol.TECNICO
    )
    telefono = models.CharField(max_length=20, blank=True, null=True)


    #RUTAS FIRMA

    firma_digital = models.ImageField(upload_to='firmas_usuarios/',
                                      blank=True, null=True,
                                      help_text="Imagen generada desde trazos para estampar en PDF")
    firma_trazos = models.JSONField(blank=True, null=True,
                                    help_text="Coordenadas normalizadas [[[x,y],...],...]")


    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_rol_display()})"  # type: ignore[attr-defined]


# Create your models here.
