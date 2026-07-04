# Se construye desde la RAÍZ del proyecto (context: .)
# para poder acceder tanto a frontend/ como a nginx/

# ---- Etapa 1: compilar el frontend ----
FROM node:20-alpine AS build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
# Genera los estáticos optimizados en /app/dist
RUN npm run build

# ---- Etapa 2: servir con nginx ----
FROM nginx:1.27-alpine

# Config del reverse proxy
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Archivos compilados del frontend
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
