from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Rol(models.TextChoices):
        TECNICO = 'tecnico', 'Técnico'
        SUPERVISOR = 'supervisor', 'Supervisor'

    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.TECNICO)

    def is_supervisor(self):
        return self.rol == self.Rol.SUPERVISOR
