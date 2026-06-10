import os
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from faster_whisper import WhisperModel

MODELO = os.environ.get('WHISPER_MODEL', 'base')
IDIOMA = os.environ.get('WHISPER_LANG', 'es')

app = FastAPI(title="STT Service")

# El modelo se carga una sola vez al arrancar (en CPU, int8 para ahorrar memoria)
modelo = WhisperModel(MODELO, device='cpu', compute_type='int8')


@app.get('/health')
def health():
    return {'status': 'ok', 'modelo': MODELO, 'idioma': IDIOMA}


@app.post('/transcribe')
async def transcribe(audio: UploadFile = File(...)):
    if not audio:
        raise HTTPException(status_code=400, detail='No se recibió audio')

    # Guardar el audio temporalmente para que faster-whisper lo procese
    suffix = os.path.splitext(audio.filename or 'audio.webm')[1] or '.webm'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        ruta = tmp.name

    try:
        segmentos, _ = modelo.transcribe(ruta, language=IDIOMA, vad_filter=True)
        texto = ' '.join(seg.text.strip() for seg in segmentos).strip()
        return {'texto': texto}
    finally:
        os.unlink(ruta)
