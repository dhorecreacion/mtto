from django.contrib import admin


from django.contrib.auth.admin import UserAdmin
from .models import Usuario 


@admin.register(Usuario)
class CustomerUserAdmin(UserAdmin):
    
    fieldsets = list(UserAdmin.fieldsets) + [
        ('Datos de Mantenimiento', {'fields': ('rol', 'telefono', 'firma_digital')}),
    ]
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'is_staff')
    list_filter = ('rol', 'is_staff', 'is_active')



# Register your models here.
