# Guía de Desarrollo y Producción

El proyecto tiene **dos modos**. Cada uno usa su propio archivo de Docker Compose.

| | Desarrollo | Producción |
|---|---|---|
| Archivo | `docker-compose.yml` | `docker-compose.prod.yml` |
| Servidor Django | runserver (recarga en vivo) | gunicorn (estable, multi-worker) |
| Frontend | Vite dev server (hot-reload) | React compilado servido por nginx |
| Acceso | `http://localhost:5173` | `http://IP-DEL-SERVIDOR` (puerto 80) |
| `.env` → DEBUG | `True` | `False` |
| Para qué | Programar y probar | Uso diario del equipo |

---

## 🛠️ DESARROLLO (para programar)

```bash
docker compose up -d
```

- Frontend: http://localhost:5173
- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

Los cambios en el código se reflejan al instante (hot-reload).
El `.env` debe tener `DEBUG=True`.

Para apagar:
```bash
docker compose down
```

---

## 🚀 PRODUCCIÓN (para uso diario en la LAN)

### 1. Ajusta el `.env`
```
DEBUG=False
USE_HTTPS=False
```
(Si usarás el admin de Django, agrega `CSRF_TRUSTED_ORIGINS=http://IP-DEL-SERVIDOR`)

### 2. Levanta con el compose de producción
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Esto: migra la BD, crea el superusuario, compila el frontend, recolecta estáticos
y arranca gunicorn + nginx.

### 3. Accede desde cualquier dispositivo de la red
```
http://IP-DEL-SERVIDOR
```
Todo entra por el puerto 80 (nginx reparte a Django, frontend, fotos, admin).

Para apagar:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## Comandos útiles

| Acción | Desarrollo | Producción |
|---|---|---|
| Ver logs | `docker compose logs -f` | `docker compose -f docker-compose.prod.yml logs -f` |
| Reiniciar backend | `docker compose restart web` | `docker compose -f docker-compose.prod.yml restart web` |
| Ejecutar migración | `docker compose exec web python manage.py migrate` | igual con `-f docker-compose.prod.yml` |

---

## Notas

- **Averiguar la IP del servidor** (PowerShell): `ipconfig | Select-String "IPv4"`
- El frontend detecta la IP solo — no hay que cambiar nada al mover de red.
- Los datos (BD, fotos) viven en volúmenes de Docker y persisten entre reinicios.
- Al cambiar código del backend en producción, reconstruye: `... up -d --build`.
