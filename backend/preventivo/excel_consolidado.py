"""
Exportación consolidada: un solo Excel con el Programa Anual (hoja 1)
más una hoja FORM-DHO-061 por cada informe seleccionado.
Replica la estructura del archivo FORM-DHO-061.xlsx original.
"""
import io
import re

from openpyxl import Workbook

from .excel_form import construir_hoja_informe
from .excel_programa import construir_hoja_programa

# Excel: máx 31 caracteres por título de hoja y sin []:*?/\
CARACTERES_INVALIDOS = re.compile(r'[\[\]:\*\?/\\]')


def _titulo_hoja(nombre, usados):
    limpio = CARACTERES_INVALIDOS.sub('', nombre or 'Informe').strip()[:28] or 'Informe'
    titulo, n = limpio, 2
    while titulo in usados:
        titulo = f'{limpio[:24]} ({n})'
        n += 1
    usados.add(titulo)
    return titulo


def generar_consolidado(incluir_programa, equipos, anio, subtitulo, informes):
    """
    incluir_programa: bool — agrega la hoja "PROGR. MANTTO. EQ."
    equipos: queryset con .programaciones_anio (solo si incluir_programa)
    informes: lista de InformeMantenimiento para hojas individuales
    """
    wb = Workbook()
    primera_libre = True
    usados = set()

    if incluir_programa:
        ws = wb.active
        ws.title = 'PROGR. MANTTO. EQ.'
        usados.add(ws.title)
        construir_hoja_programa(ws, equipos, anio, subtitulo)
        primera_libre = False

    for informe in informes:
        nombre = informe.programa.equipo.nombre if informe.programa else 'Informe'
        titulo = _titulo_hoja(nombre, usados)
        if primera_libre:
            ws = wb.active
            ws.title = titulo
            primera_libre = False
        else:
            ws = wb.create_sheet(titulo)
        construir_hoja_informe(ws, informe)

    if primera_libre:  # no se seleccionó nada
        wb.active.title = 'Sin contenido'
        wb.active['B2'] = 'No se seleccionó ningún reporte para exportar.'

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf
