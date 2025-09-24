# Configuración de Traefik para AlugueisV1

Este documento explica cómo configurar AlugueisV1 para funcionar con Traefik como proxy reverso.

## Configuración de Traefik

### 1. Red de Traefik

Asegúrate de que existe la red externa de Traefik:

```bash
docker network create traefik
```

### 2. Archivo de Configuración de Traefik

Tu `docker-compose.yml` de Traefik debe incluir algo similar a:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard (opcional)
    networks:
      - traefik
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/traefik.yml:ro
      - ./acme.json:/acme.json
    environment:
      - CF_DNS_API_TOKEN=your_cloudflare_token
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(\`dashboard.yourdomain.com\`)"
      - "traefik.http.routers.dashboard.tls.certresolver=cloudflare"

networks:
  traefik:
    external: true
```

### 3. Configuración de traefik.yml

```yaml
global:
  checkNewVersion: false
  sendAnonymousUsage: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entrypoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
    network: traefik

certificatesResolvers:
  cloudflare:
    acme:
      email: your-email@domain.com
      storage: acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"

api:
  dashboard: true
  insecure: false
```

## Configuración de DNS

Configura los siguientes registros DNS en tu proveedor (ej: Cloudflare):

- `alugueis.yourdomain.com` → IP del servidor
- `api.alugueis.yourdomain.com` → IP del servidor

## Deployment con Traefik

### 1. Instalación

```bash
./install.sh
```

Cuando se te pregunte:
- ¿Desea configurar acceso por internet con Traefik? → **S**
- Dominio para el frontend → `alugueis.yourdomain.com`
- Dominio para el backend API → `api.alugueis.yourdomain.com`

### 2. Deployment

```bash
./deploy.sh
```

El script detectará automáticamente que tienes Traefik configurado y usará la configuración apropiada.

### 3. Comandos útiles

```bash
# Ver logs
./deploy.sh logs

# Ver estado
./deploy.sh status

# Detener servicios
./deploy.sh stop

# Ayuda
./deploy.sh help
```

## Verificación

1. **Frontend**: https://alugueis.yourdomain.com
2. **Backend API**: https://api.alugueis.yourdomain.com/docs
3. **Health Check**: https://api.alugueis.yourdomain.com/api/health

## Troubleshooting

### Error: Red traefik no existe

```bash
docker network create traefik
```

### Certificados SSL no funcionan

1. Verifica tu token de Cloudflare
2. Revisa los logs de Traefik: `docker logs traefik`
3. Verifica que los DNS apunten al servidor correcto

### CORS Errors

Los headers CORS se configuran automáticamente en los labels de Traefik. Si tienes problemas:

1. Verifica que `FRONTEND_DOMAIN` y `BACKEND_DOMAIN` estén correctos en `.env`
2. Reinicia los servicios: `./deploy.sh stop && ./deploy.sh`

### Backend no accesible

1. Verifica que el contenedor esté en la red traefik: `docker inspect alugueisV1_backend`
2. Verifica los labels de Traefik: `docker inspect alugueisV1_backend | grep traefik`

## Seguridad

El sistema incluye automáticamente:

- Redirección HTTP → HTTPS
- Headers de seguridad (HSTS, XSS Protection, etc.)
- CORS configurado correctamente
- Certificados SSL automáticos via Let's Encrypt

## Monitoreo

Para monitorear el sistema:

```bash
# Logs en tiempo real
./deploy.sh logs

# Estado de contenedores
docker ps

# Uso de recursos
docker stats
```
