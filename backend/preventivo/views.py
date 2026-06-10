from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
import base64
import io
import requests
from .models import ProgramaMantenimiento, InformeMantenimiento, MantenimientoDetalleScore, EvidenciaFoto
from correctivo.models import OrdenCorrectiva
from .serializers import (
    ProgramaMantenimientoSerializer, InformeMantenimientoSerializer,
    DetalleScoreSerializer, EvidenciaFotoSerializer,
)


def _firma_a_base64(usuario, ancho=300, alto=120):
    """Convierte firma_trazos (coordenadas normalizadas) a PNG en base64."""
    if not usuario or not usuario.firma_trazos:
        return None
    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGBA', (ancho, alto), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        for trazo in usuario.firma_trazos:
            puntos = [(round(x * ancho), round(y * alto)) for x, y in trazo]
            if len(puntos) >= 2:
                draw.line(puntos, fill=(26, 29, 35, 255), width=2, joint='curve')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


def _derivar_automatico(informe, usuario):
    """
    Al aprobar un informe crea una OrdenCorrectiva automáticamente cuando:
      - hay componentes con score 5 (falla inminente), o
      - el programa requiere tercero (con proveedor asignado).
    Usa el flag correctivo_auto_generado para no duplicar al re-aprobar.
    """
    programa = informe.programa
    if programa is None or informe.correctivo_auto_generado:
        return

    criticos = list(informe.detalles_score.filter(score_valor=5).select_related('componente'))
    requiere_tercero = bool(programa.requiere_tercero and programa.proveedor_asignado)

    if not criticos and not requiere_tercero:
        return

    if criticos:
        nombres = ', '.join(c.componente.nombre_componente for c in criticos)
        descripcion = f'Derivado de inspección preventiva. Componentes en FALLA (score 5): {nombres}'
    else:
        descripcion = informe.hallazgos_generales or 'Derivado de informe preventivo (requiere tercero)'

    OrdenCorrectiva.objects.create(
        informe_origen=informe,
        equipo=programa.equipo,
        tipo_ejecucion=OrdenCorrectiva.TipoEjecucion.TERCERO if requiere_tercero else OrdenCorrectiva.TipoEjecucion.INTERNO,
        proveedor=programa.proveedor_asignado if requiere_tercero else None,
        descripcion_falla=descripcion,
        creado_por=usuario,
    )

    informe.correctivo_auto_generado = True
    informe.save(update_fields=['correctivo_auto_generado'])

    programa.estado = ProgramaMantenimiento.EstadoPrograma.EJECUTADO
    programa.save(update_fields=['estado'])


class ProgramaMantenimientoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProgramaMantenimientoSerializer

    def get_queryset(self):
        qs = ProgramaMantenimiento.objects.select_related('equipo')
        anio = self.request.query_params.get('anio')
        estado = self.request.query_params.get('estado')
        equipo = self.request.query_params.get('equipo')
        score_min = self.request.query_params.get('score_min')
        if anio:
            qs = qs.filter(anio=anio)
        if estado:
            qs = qs.filter(estado=estado)
        if equipo:
            qs = qs.filter(equipo=equipo)
        if score_min:
            qs = qs.filter(score_salud_ultimo__gte=score_min)
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)

    @action(detail=True, methods=['post'], url_path='asistente-voz')
    def asistente_voz(self, request, pk=None):
        """Recibe audio, lo transcribe y lo estructura para llenar el formulario."""
        from . import asistente_voz as av

        programa = self.get_object()
        audio = request.FILES.get('audio')
        if not audio:
            return Response({'error': 'No se recibió audio.'}, status=status.HTTP_400_BAD_REQUEST)

        componentes = list(
            programa.equipo.componentes.filter(activo=True).values_list('nombre_componente', flat=True)
        )
        try:
            resultado = av.procesar(audio, componentes)
        except requests.exceptions.RequestException as e:
            return Response(
                {'error': f'El servicio de IA no está disponible: {e}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(resultado)


class InformeMantenimientoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InformeMantenimientoSerializer

    def get_queryset(self):
        qs = InformeMantenimiento.objects.select_related(
            'tecnico', 'supervisor', 'programa'
        ).prefetch_related('detalles_score', 'evidencias')
        programa = self.request.query_params.get('programa')
        if programa:
            qs = qs.filter(programa=programa)
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user, tecnico=self.request.user)

    def perform_update(self, serializer):
        informe = self.get_object()
        user = self.request.user
        # Técnico solo puede editar sus propios informes en BORRADOR
        if not user.is_staff:
            if informe.tecnico != user:
                self.permission_denied(self.request)
            if informe.estado_informe != InformeMantenimiento.EstadoInforme.BORRADOR:
                self.permission_denied(self.request, message='Solo puedes editar informes en estado BORRADOR.')
        serializer.save(modificado_por=user)

    @action(detail=True, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        informe = self.get_object()
        nuevo_estado = request.data.get('estado')
        estados_validos = [e[0] for e in InformeMantenimiento.EstadoInforme.choices]

        if nuevo_estado not in estados_validos:
            return Response({'error': f'Estado inválido. Opciones: {estados_validos}'}, status=status.HTTP_400_BAD_REQUEST)

        # Técnico solo puede enviar sus propios informes en BORRADOR
        if not request.user.is_staff:
            if informe.tecnico != request.user:
                return Response({'error': 'No tienes permiso sobre este informe.'}, status=status.HTTP_403_FORBIDDEN)
            if nuevo_estado != InformeMantenimiento.EstadoInforme.ENVIADO:
                return Response({'error': 'Solo puedes enviar el informe a revisión.'}, status=status.HTTP_403_FORBIDDEN)
            if informe.estado_informe != InformeMantenimiento.EstadoInforme.BORRADOR:
                return Response({'error': 'Solo puedes enviar informes en BORRADOR.'}, status=status.HTTP_403_FORBIDDEN)

        # Validar aprobación con tercero pendiente
        if nuevo_estado == InformeMantenimiento.EstadoInforme.APROBADO and request.user.is_staff:
            programa = informe.programa
            if programa and programa.requiere_tercero and not programa.proveedor_asignado:
                return Response({
                    'error': 'Este informe requiere un proveedor tercero. Asigna uno antes de aprobar.',
                    'requiere_tercero': True,
                }, status=status.HTTP_400_BAD_REQUEST)

        informe.estado_informe = nuevo_estado
        informe.modificado_por = request.user

        if nuevo_estado == InformeMantenimiento.EstadoInforme.BORRADOR and request.user.is_staff:
            informe.comentario_rechazo = request.data.get('comentario', '')
        else:
            informe.comentario_rechazo = None

        if nuevo_estado == InformeMantenimiento.EstadoInforme.APROBADO and request.user.is_staff:
            informe.supervisor = request.user
        elif nuevo_estado == InformeMantenimiento.EstadoInforme.ENVIADO and request.user.is_staff:
            informe.supervisor = None

        informe.save(update_fields=['estado_informe', 'modificado_por', 'comentario_rechazo', 'supervisor'])

        # Al aprobar: derivación automática a correctivo (score 5 o requiere tercero)
        if nuevo_estado == InformeMantenimiento.EstadoInforme.APROBADO and request.user.is_staff:
            _derivar_automatico(informe, request.user)

        return Response({
            'estado_informe': informe.estado_informe,
            'comentario_rechazo': informe.comentario_rechazo,
        })

    @action(detail=True, methods=['post'], url_path='derivar-correctivo')
    def derivar_correctivo(self, request, pk=None):
        """Derivación manual a correctivo (score 4). Solo admin."""
        if not request.user.is_staff:
            return Response({'error': 'Solo el administrador puede derivar.'}, status=status.HTTP_403_FORBIDDEN)

        informe = self.get_object()
        if not informe.programa:
            return Response({'error': 'El informe no tiene un equipo asociado.'}, status=status.HTTP_400_BAD_REQUEST)

        componentes = list(
            informe.detalles_score.filter(score_valor=4).select_related('componente')
        )
        if not componentes:
            return Response({'error': 'No hay componentes con score 4 para derivar.'}, status=status.HTTP_400_BAD_REQUEST)

        nombres = ', '.join(c.componente.nombre_componente for c in componentes)
        orden = OrdenCorrectiva.objects.create(
            informe_origen=informe,
            equipo=informe.programa.equipo,
            tipo_ejecucion=OrdenCorrectiva.TipoEjecucion.INTERNO,
            descripcion_falla=f'Derivado de inspección preventiva. Componentes en estado MALO (score 4): {nombres}',
            creado_por=request.user,
        )
        return Response({'mensaje': 'Orden correctiva creada.', 'orden_id': str(orden.id)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='generar-pdf')
    def generar_pdf(self, request, pk=None):
        informe = self.get_object()

        # Reconstruir firma del técnico como imagen base64
        firma_b64 = _firma_a_base64(informe.tecnico)
        firma_supervisor_b64 = _firma_a_base64(informe.supervisor) if informe.supervisor else None

        # Fotos con base64
        evidencias = []
        for ev in informe.evidencias.all():
            try:
                ruta = ev.foto.path
                with open(ruta, 'rb') as f:
                    b64 = base64.b64encode(f.read()).decode()
                    ext = ruta.split('.')[-1].lower()
                    mime = 'jpeg' if ext in ('jpg', 'jpeg') else 'png'
                    evidencias.append({'tipo': ev.tipo, 'descripcion': ev.descripcion, 'b64': f'data:image/{mime};base64,{b64}'})
            except Exception:
                pass

        context = {
            'informe': informe,
            'equipo': informe.programa.equipo if informe.programa else None,
            'programa': informe.programa,
            'scores': informe.detalles_score.select_related('componente').all(),
            'evidencias': evidencias,
            'firma_tecnico': firma_b64,
            'firma_supervisor': firma_supervisor_b64,
        }

        html = render_to_string('preventivo/informe_pdf.html', context, request=request)

        try:
            from weasyprint import HTML
            pdf = HTML(string=html, base_url=request.build_absolute_uri('/')).write_pdf()
            response = HttpResponse(pdf, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="informe_{pk[:8]}.pdf"'
            return response
        except Exception as e:
            return Response({'error': f'Error al generar PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='procesar-audio-hallazgos')
    def procesar_audio_hallazgos(self, request, pk=None):
        informe = self.get_object()
        audio_file = request.FILES.get('audio')

        if not audio_file:
            return Response(
                {'error': 'No se proporcionó ningún archivo de audio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ============================================================
        # Aquí se conectará Whisper (STT) + Mistral/Llama (estructurar)
        # cuando se integre el servicio local de IA.
        # Por ahora devuelve el texto simulado para no bloquear el frontend.
        # ============================================================
        texto_transcrito = "[Audio recibido — procesamiento de IA pendiente de integración]"

        informe.hallazgos_generales = texto_transcrito
        informe.save(update_fields=['hallazgos_generales'])

        return Response({
            'mensaje': 'Audio recibido y hallazgos actualizados correctamente',
            'hallazgos_generales': informe.hallazgos_generales,
        }, status=status.HTTP_200_OK)


class DetalleScoreViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DetalleScoreSerializer

    def get_queryset(self):
        return MantenimientoDetalleScore.objects.filter(
            informe=self.kwargs.get('informe_pk')
        )

    def perform_create(self, serializer):
        informe = get_object_or_404(InformeMantenimiento, pk=self.kwargs['informe_pk'])
        serializer.save(informe=informe, creado_por=self.request.user)


class EvidenciaFotoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EvidenciaFotoSerializer

    def get_queryset(self):
        return EvidenciaFoto.objects.filter(
            informe=self.kwargs.get('informe_pk')
        )

    def perform_create(self, serializer):
        informe = get_object_or_404(InformeMantenimiento, pk=self.kwargs['informe_pk'])
        serializer.save(informe=informe)
