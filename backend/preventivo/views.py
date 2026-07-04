from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.generics import get_object_or_404
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.conf import settings
import base64
import io
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


def _descripcion_derivacion(score):
    """Texto de la falla a partir de la evaluación del componente."""
    partes = [f'Derivado de inspección preventiva — Componente: {score.componente.nombre_componente}.']
    if score.score_inicial and score.score_inicial != score.score_valor:
        partes.append(f'Encontrado en score {score.score_inicial}, quedó en score {score.score_valor} tras la intervención.')
    else:
        partes.append(f'Score {score.score_valor}.')
    if score.detalle_intervencion:
        partes.append(f'Intervención del técnico: {score.detalle_intervencion}')
    if score.observacion_tecnica:
        partes.append(f'Observación: {score.observacion_tecnica}')
    return ' '.join(partes)


def _derivar_componente(score, usuario):
    """
    Crea la Orden Correctiva de UN componente sin resolver (score final 4-5).
    Tipo TERCERO si el técnico lo marcó como requiere_tercero; INTERNO si no.
    El proveedor específico lo asigna el supervisor en el triaje de Correctivo.
    """
    informe = score.informe
    tipo = (OrdenCorrectiva.TipoEjecucion.TERCERO if score.requiere_tercero
            else OrdenCorrectiva.TipoEjecucion.INTERNO)

    orden = OrdenCorrectiva.objects.create(
        informe_origen=informe,
        equipo=informe.programa.equipo,
        tipo_ejecucion=tipo,
        descripcion_falla=_descripcion_derivacion(score),
        creado_por=usuario,
    )
    score.derivado = True
    score.orden_derivada = orden
    score.save(update_fields=['derivado', 'orden_derivada'])

    # Indicador denormalizado para el dashboard/BI
    if score.requiere_tercero and not informe.programa.requiere_tercero:
        informe.programa.requiere_tercero = True
        informe.programa.save(update_fields=['requiere_tercero'])

    return orden


def _derivar_automatico(informe, usuario):
    """
    Red de seguridad al APROBAR: cualquier componente en FALLA (score final 5)
    que el técnico no haya derivado manualmente, se deriva aquí.
    El flag `derivado` por componente evita duplicados al re-aprobar.
    """
    if informe.programa is None:
        return
    pendientes = informe.detalles_score.filter(
        score_valor=5, derivado=False
    ).select_related('componente')
    for score in pendientes:
        _derivar_componente(score, usuario)


# Meses que corresponden a cada frecuencia de mantenimiento
FRECUENCIA_MESES = {
    'MENSUAL':    list(range(1, 13)),
    'BIMENSUAL':  [1, 3, 5, 7, 9, 11],
    'TRIMESTRAL': [1, 4, 7, 10],
}


class ProgramaMantenimientoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProgramaMantenimientoSerializer

    @staticmethod
    def _marcar_atrasados():
        """Programas PLANIFICADO cuyo mes ya pasó -> ATRASADO (perezoso, en cada consulta)."""
        from django.db.models import Q
        from django.utils import timezone
        hoy = timezone.localdate()
        ProgramaMantenimiento.objects.filter(
            activo=True,
            estado=ProgramaMantenimiento.EstadoPrograma.PLANIFICADO,
        ).filter(
            Q(anio__lt=hoy.year) | Q(anio=hoy.year, mes_planificado__lt=hoy.month)
        ).update(estado=ProgramaMantenimiento.EstadoPrograma.ATRASADO)

    def get_queryset(self):
        self._marcar_atrasados()
        qs = ProgramaMantenimiento.objects.filter(activo=True).select_related('equipo')
        p = self.request.query_params
        if p.get('anio'):
            qs = qs.filter(anio=p['anio'])
        if p.get('mes'):
            qs = qs.filter(mes_planificado=p['mes'])
        if p.get('estado'):
            if p['estado'] == 'PENDIENTES':
                # Pendientes = lo que falta ejecutar (planificado o ya atrasado)
                qs = qs.filter(estado__in=[
                    ProgramaMantenimiento.EstadoPrograma.PLANIFICADO,
                    ProgramaMantenimiento.EstadoPrograma.ATRASADO,
                ])
            else:
                qs = qs.filter(estado=p['estado'])
        if p.get('equipo'):
            qs = qs.filter(equipo=p['equipo'])
        if p.get('score_min'):
            qs = qs.filter(score_salud_ultimo__gte=p['score_min'])
        # Filtros por ubicación (jerarquía Zona > Lugar > Sección)
        if p.get('zona'):
            qs = qs.filter(equipo__seccion__lugar__zona=p['zona'])
        if p.get('lugar'):
            qs = qs.filter(equipo__seccion__lugar=p['lugar'])
        if p.get('seccion'):
            qs = qs.filter(equipo__seccion=p['seccion'])
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(modificado_por=self.request.user)

    @action(detail=False, methods=['post'], url_path='generar-programacion')
    def generar_programacion(self, request):
        """
        Genera de golpe los programas del año según la FRECUENCIA de cada equipo
        INDUSTRIAL (Mensual=12, Bimensual=6, Trimestral=4). No duplica existentes.
        Solo admin.
        """
        from django.utils import timezone
        from activos.models import Equipo

        if not request.user.is_staff:
            return Response({'error': 'Solo el administrador puede generar la programación.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            anio = int(request.data.get('anio') or timezone.now().year)
        except (TypeError, ValueError):
            return Response({'error': 'Año inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        equipos = Equipo.objects.filter(
            activo=True,
            categoria_mantenimiento=Equipo.Categoria.INDUSTRIAL,
        )
        sin_frecuencia = [e.codigo_activo for e in equipos if not e.frecuencia]

        creados = 0
        existentes = 0
        for eq in equipos:
            for mes in FRECUENCIA_MESES.get(eq.frecuencia, []):
                _, created = ProgramaMantenimiento.objects.get_or_create(
                    equipo=eq, anio=anio, mes_planificado=mes,
                    defaults={'creado_por': request.user},
                )
                if created:
                    creados += 1
                else:
                    existentes += 1

        return Response({
            'anio': anio,
            'creados': creados,
            'existentes': existentes,
            'equipos_sin_frecuencia': sin_frecuencia,
        })

    @staticmethod
    def _equipos_filtrados(params, anio):
        """Equipos INDUSTRIAL filtrados por ubicación + programas del año adjuntos."""
        from django.db.models import Prefetch
        from activos.models import Equipo, Zona, Lugar, Seccion

        equipos = Equipo.objects.filter(
            activo=True,
            categoria_mantenimiento=Equipo.Categoria.INDUSTRIAL,
        ).select_related('seccion__lugar__zona').order_by('codigo_activo')

        subtitulo = []
        if params.get('zona'):
            equipos = equipos.filter(seccion__lugar__zona=params['zona'])
            z = Zona.objects.filter(pk=params['zona']).first()
            if z:
                subtitulo.append(f'Zona: {z.nombre}')
        if params.get('lugar'):
            equipos = equipos.filter(seccion__lugar=params['lugar'])
            l = Lugar.objects.filter(pk=params['lugar']).first()
            if l:
                subtitulo.append(f'Lugar: {l.nombre}')
        if params.get('seccion'):
            equipos = equipos.filter(seccion=params['seccion'])
            s = Seccion.objects.filter(pk=params['seccion']).first()
            if s:
                subtitulo.append(f'Sección: {s.nombre}')

        equipos = equipos.prefetch_related(
            Prefetch(
                'programaciones',
                queryset=ProgramaMantenimiento.objects.filter(anio=anio, activo=True),
                to_attr='programaciones_anio',
            )
        )
        return equipos, ' — '.join(subtitulo)

    @action(detail=False, methods=['get'], url_path='programa-anual-excel')
    def programa_anual_excel(self, request):
        """
        Compila el PROGRAMA ANUAL (hoja "PROGR. MANTTO. EQ." del FORM-DHO-061).
        Filtros: ?anio= &zona= &lugar= &seccion=
        """
        from django.utils import timezone
        from .excel_programa import generar_programa_anual

        p = request.query_params
        anio = p.get('anio') or timezone.now().year
        equipos, subtitulo = self._equipos_filtrados(p, anio)

        try:
            buf = generar_programa_anual(equipos, anio, subtitulo)
        except Exception as e:
            return Response({'error': f'Error al generar el Excel: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="PROGRAMA_MANTTO_{anio}.xlsx"'
        return response

    @action(detail=False, methods=['post'], url_path='exportar-consolidado')
    def exportar_consolidado(self, request):
        """
        Un solo Excel con lo que el usuario marque:
        body: { anio, zona?, lugar?, seccion?, incluir_programa: bool, informes: [ids] }
        Hoja 1 = Programa Anual (opcional) + una hoja FORM-DHO-061 por informe.
        """
        from django.utils import timezone
        from .excel_consolidado import generar_consolidado

        data = request.data
        anio = data.get('anio') or timezone.now().year
        incluir_programa = bool(data.get('incluir_programa', True))
        ids = data.get('informes') or []

        equipos, subtitulo = (None, '')
        if incluir_programa:
            equipos, subtitulo = self._equipos_filtrados(data, anio)

        informes = list(
            InformeMantenimiento.objects.filter(id__in=ids)
            .select_related('programa__equipo__seccion__lugar__zona', 'tecnico', 'supervisor')
            .prefetch_related('detalles_score__componente', 'evidencias')
            .order_by('programa__equipo__nombre', 'fecha')
        )

        try:
            buf = generar_consolidado(incluir_programa, equipos, anio, subtitulo, informes)
        except Exception as e:
            return Response({'error': f'Error al generar el Excel: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="MANTTO_CONSOLIDADO_{anio}.xlsx"'
        return response


class InformeMantenimientoViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InformeMantenimientoSerializer

    def get_queryset(self):
        qs = InformeMantenimiento.objects.select_related(
            'tecnico', 'supervisor', 'programa__equipo'
        ).prefetch_related('detalles_score', 'evidencias')
        p = self.request.query_params
        if p.get('programa'):
            qs = qs.filter(programa=p['programa'])
        if p.get('anio'):
            qs = qs.filter(programa__anio=p['anio'])
        if p.get('mes'):
            qs = qs.filter(programa__mes_planificado=p['mes'])
        if p.get('zona'):
            qs = qs.filter(programa__equipo__seccion__lugar__zona=p['zona'])
        if p.get('lugar'):
            qs = qs.filter(programa__equipo__seccion__lugar=p['lugar'])
        if p.get('seccion'):
            qs = qs.filter(programa__equipo__seccion=p['seccion'])
        return qs.order_by('programa__equipo__nombre', '-fecha')

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

        if nuevo_estado == InformeMantenimiento.EstadoInforme.APROBADO and request.user.is_staff:
            # La inspección quedó ejecutada
            if informe.programa and informe.programa.estado != ProgramaMantenimiento.EstadoPrograma.EJECUTADO:
                informe.programa.estado = ProgramaMantenimiento.EstadoPrograma.EJECUTADO
                informe.programa.save(update_fields=['estado'])
            # Red de seguridad: fallas (score 5) no derivadas aún
            _derivar_automatico(informe, request.user)

        return Response({
            'estado_informe': informe.estado_informe,
            'comentario_rechazo': informe.comentario_rechazo,
        })

    @action(detail=True, methods=['post'], url_path='derivar-componente')
    def derivar_componente(self, request, pk=None):
        """
        Derivación INMEDIATA de un componente sin resolver a Orden Correctiva.
        La usa el técnico apenas detecta el problema (no espera aprobación),
        porque gestionar un tercero o un repuesto toma tiempo.
        """
        informe = self.get_object()
        user = request.user

        if not user.is_staff and informe.tecnico != user:
            return Response({'error': 'No tienes permiso sobre este informe.'}, status=status.HTTP_403_FORBIDDEN)
        if not informe.programa:
            return Response({'error': 'El informe no tiene un equipo asociado.'}, status=status.HTTP_400_BAD_REQUEST)

        score = get_object_or_404(informe.detalles_score, pk=request.data.get('score_id'))

        if score.derivado:
            return Response({'error': 'Este componente ya fue derivado a correctivo.'}, status=status.HTTP_400_BAD_REQUEST)
        if score.score_valor < 4:
            return Response({'error': 'Solo se derivan componentes sin resolver (score final 4 o 5).'}, status=status.HTTP_400_BAD_REQUEST)

        orden = _derivar_componente(score, user)
        return Response({
            'mensaje': 'Orden correctiva creada.',
            'orden_id': str(orden.id),
            'tipo_ejecucion': orden.tipo_ejecucion,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='generar-excel')
    def generar_excel(self, request, pk=None):
        """Genera el FORM-DHO-061 oficial en Excel con los datos del informe."""
        from .excel_form import generar_form_dho_061
        informe = self.get_object()
        try:
            buf = generar_form_dho_061(informe)
        except Exception as e:
            return Response({'error': f'Error al generar el Excel: {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="FORM-DHO-061_{pk[:8]}.xlsx"'
        return response

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
