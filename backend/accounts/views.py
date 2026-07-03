from rest_framework import generics, permissions, viewsets, status
from rest_framework.response import Response
from .models import Usuario
from .serializers import UsuarioSerializer, RegistroUsuarioSerializer, UsuarioAdminSerializer


class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]


class PerfilView(generics.RetrieveUpdateAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UsuarioAdminViewSet(viewsets.ModelViewSet):
    """Gestión de usuarios del sistema. Solo administradores."""
    serializer_class = UsuarioAdminSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = Usuario.objects.all().order_by('username')
        rol = self.request.query_params.get('rol')
        activo = self.request.query_params.get('activo')
        if rol:
            qs = qs.filter(rol=rol)
        if activo is not None:
            qs = qs.filter(is_active=(activo.lower() in ('1', 'true', 'yes')))
        return qs

    def destroy(self, request, *args, **kwargs):
        usuario = self.get_object()
        # No permitir auto-desactivarse
        if usuario.id == request.user.id:
            return Response({'error': 'No puedes desactivar tu propia cuenta.'}, status=status.HTTP_400_BAD_REQUEST)
        # Borrado lógico — los usuarios están referenciados por informes/órdenes
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)
