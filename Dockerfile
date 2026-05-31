# Usamos una imagen ligera de Python
FROM python:3.11-slim

# Evita que Python genere archivos .pyc y permite ver logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Directorio de trabajo
WORKDIR /app

# Instalamos dependencias de Python
COPY backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del proyecto
COPY  backend/ /app/