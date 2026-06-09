from rest_framework import status
from rest_framework.response import Response


class SoftDeleteMixin:
    """
    Reemplaza el DELETE físico por borrado lógico (activo=False).
    Usar en cualquier ViewSet cuyo modelo herede de ModeloAuditoria.
    """
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.activo = False
        if hasattr(obj, 'modificado_por'):
            obj.modificado_por = request.user
            obj.save(update_fields=['activo', 'modificado_por'])
        else:
            obj.save(update_fields=['activo'])
        return Response(status=status.HTTP_204_NO_CONTENT)
