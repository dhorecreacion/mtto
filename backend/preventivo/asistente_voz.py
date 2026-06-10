"""
Asistente de voz para llenar el formulario de mantenimiento preventivo.
Flujo: audio -> STT (faster-whisper) -> texto -> LLM (Ollama) -> JSON estructurado.
"""
import os
import json
import requests

STT_URL = os.environ.get('STT_URL', 'http://stt:9000')
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://ollama:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'llama3.2:1b')


def transcribir_audio(archivo_audio):
    """Envía el audio al servicio STT y devuelve el texto transcrito."""
    resp = requests.post(
        f'{STT_URL}/transcribe',
        files={'audio': (archivo_audio.name, archivo_audio.read(), archivo_audio.content_type)},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json().get('texto', '')


def _construir_prompt(texto, componentes_existentes):
    nombres = ', '.join(componentes_existentes) if componentes_existentes else '(ninguno)'
    return f"""Eres un asistente que extrae datos de una inspección de mantenimiento a partir de lo que dictó un técnico.

Componentes que ya existen en el equipo: {nombres}

Texto dictado por el técnico:
"{texto}"

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "componentes": [
    {{"nombre": "<nombre del componente>", "score": <número entero del 1 al 5>, "observacion": "<observación o vacío>"}}
  ],
  "requiere_tercero": <true o false>,
  "hallazgos_generales": "<resumen general o vacío>"
}}

Reglas:
- score: 1=Excelente, 2=Bueno, 3=Regular, 4=Malo, 5=Falla.
- Si menciona un componente que no existe, inclúyelo igual (se creará).
- requiere_tercero es true solo si el técnico menciona derivar, tercero, proveedor externo o que no se puede reparar internamente.
- No inventes datos que el técnico no dijo. Si no menciona score de un componente, no lo incluyas.
- Responde solo el JSON, sin texto adicional."""


def estructurar_texto(texto, componentes_existentes):
    """Envía el texto al LLM y devuelve el dict estructurado."""
    prompt = _construir_prompt(texto, componentes_existentes)
    resp = requests.post(
        f'{OLLAMA_URL}/api/generate',
        json={
            'model': OLLAMA_MODEL,
            'prompt': prompt,
            'format': 'json',   # fuerza salida JSON
            'stream': False,
            'options': {'temperature': 0.1},
        },
        timeout=180,
    )
    resp.raise_for_status()
    contenido = resp.json().get('response', '{}')
    try:
        data = json.loads(contenido)
    except json.JSONDecodeError:
        data = {}

    # Normalización defensiva (el modelo 1b puede devolver formatos imperfectos)
    return {
        'componentes': _normalizar_componentes(data.get('componentes', [])),
        'requiere_tercero': bool(data.get('requiere_tercero', False)),
        'hallazgos_generales': str(data.get('hallazgos_generales', '') or ''),
    }


def _normalizar_componentes(lista):
    out = []
    if not isinstance(lista, list):
        return out
    for item in lista:
        if not isinstance(item, dict):
            continue
        nombre = str(item.get('nombre', '')).strip()
        if not nombre:
            continue
        try:
            score = int(item.get('score'))
        except (TypeError, ValueError):
            continue
        if score < 1 or score > 5:
            continue
        out.append({
            'nombre': nombre,
            'score': score,
            'observacion': str(item.get('observacion', '') or ''),
        })
    return out


def procesar(archivo_audio, componentes_existentes):
    """Pipeline completo: audio -> texto -> JSON estructurado."""
    texto = transcribir_audio(archivo_audio)
    if not texto:
        return {'texto': '', 'componentes': [], 'requiere_tercero': False, 'hallazgos_generales': ''}
    estructurado = estructurar_texto(texto, componentes_existentes)
    estructurado['texto'] = texto  # devolvemos también el texto crudo
    return estructurado
