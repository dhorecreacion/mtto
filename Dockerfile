# Usamos una imagen ligera de Python
FROM python:3.11-slim

# Evita que Python genere archivos .pyc y permite ver logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Directorio de trabajo
WORKDIR /app

# Instalamos dependencias del sistema necesarias para psycopg2 y utilidades
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instalamos dependencias de Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requerimientos.txt

# Copiamos el resto del proyecto
COPY . /app/