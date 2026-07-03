from rest_framework import serializers
from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'rol', 'telefono', 'firma_digital', 'firma_trazos']
        read_only_fields = ['id']


class RegistroUsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ['username', 'email', 'first_name', 'last_name', 'rol', 'telefono', 'password']

    def create(self, validated_data):
        return Usuario.objects.create_user(**validated_data)


class UsuarioAdminSerializer(serializers.ModelSerializer):
    """CRUD de usuarios para el administrador. La contraseña es opcional al editar."""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'rol', 'telefono', 'is_active', 'password']
        read_only_fields = ['id']

    def _sincronizar_staff(self, usuario, rol):
        # rol ADMIN ↔ is_staff para que coincidan permisos de frontend y backend
        usuario.is_staff = (rol == Usuario.Rol.ADMIN)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria al crear.'})
        usuario = Usuario(**validated_data)
        self._sincronizar_staff(usuario, validated_data.get('rol'))
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if 'rol' in validated_data:
            self._sincronizar_staff(instance, validated_data['rol'])
        if password:
            instance.set_password(password)
        instance.save()
        return instance
