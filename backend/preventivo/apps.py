from django.apps import AppConfig


class PreventivoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'preventivo'

    def ready(self):
        import preventivo.signals  # noqa: F401
