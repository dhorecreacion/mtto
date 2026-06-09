from rest_framework import generics, permissions
from .models import Usuario
from .serializers import UsuarioSerializer, RegistroUsuarioSerializer


class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroUsuarioSerializer
    permission_classes = [permissions.AllowAny]


class PerfilView(generics.RetrieveUpdateAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UsuarioListView(generics.ListAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = Usuario.objects.filter(is_active=True)
