# Despliegue en Coolify

## Opción recomendada: Docker Compose desde Git

1. Sube este proyecto a un repositorio Git privado.
2. En Coolify crea **New Resource → Application** y conecta el repositorio.
3. Selecciona **Docker Compose** como Build Pack y usa `/docker-compose.yml`.
4. Asigna el dominio al servicio `libreria-azul` en el puerto interno `3000`.
5. Pulsa **Deploy**. Compose crea el volumen persistente `libreria_data` automáticamente.
6. Abre los logs del primer despliegue y copia la contraseña indicada bajo `CONTRASENA INICIAL DEL PANEL`.
7. Verifica `https://tu-dominio/health`.
8. Entra en `https://tu-dominio/admin` y cambia textos, fotografías, productos y existencias.

El contenedor escucha en `0.0.0.0:3000`, incluye un `HEALTHCHECK` y genera automáticamente `ADMIN_PASSWORD` y `SESSION_SECRET` cuando no se proporcionan. Las credenciales generadas se guardan en `/data` y sobreviven a los despliegues.

## Alternativa: Dockerfile desde Git

Puedes seleccionar **Dockerfile** usando `/Dockerfile` y el puerto `3000`. El contenedor se configura solo, pero debes crear en Coolify un almacenamiento persistente con destino `/data`; un Dockerfile no puede asignar por sí mismo un volumen estable de Coolify. Compose es la opción recomendada porque ya declara el volumen con nombre.

## Credenciales personalizadas opcionales

```bash
ADMIN_PASSWORD=una-clave-larga-y-unica
SESSION_SECRET=$(openssl rand -hex 32)
```

## Copias de seguridad

El contenido administrable vive en `/data/catalog.json`. Configura una copia periódica del volumen desde Coolify o desde el servidor. El archivo `data/seed.json` es únicamente el catálogo inicial y no reemplaza los datos persistentes existentes.

## Actualizaciones

Los cambios enviados a la rama configurada pueden activar despliegues automáticos. Antes de actualizar, confirma que el volumen `/data` continúa montado y revisa el estado del healthcheck.
