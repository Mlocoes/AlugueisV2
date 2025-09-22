#!/bin/bash

# Instalador AlugueisV1 - Desarrollo
set -euo pipefail

check_cmd() { command -v "$1" >/dev/null 2>&1; }

echo "[1/5] Verificando requisitos..."
if ! check_cmd docker; then
  echo "Docker não encontrado. Instalando..."
  sudo apt-get update && sudo apt-get install -y docker.io
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Plugin docker compose não encontrado. Instalando docker-compose (legacy)..."
  sudo apt-get update && sudo apt-get install -y docker-compose
fi
if ! check_cmd python3; then
  echo "Python3 não encontrado. Instalando..."
  sudo apt-get update && sudo apt-get install -y python3
fi
if ! check_cmd pip3; then
  echo "pip3 não encontrado. Instalando..."
  sudo apt-get update && sudo apt-get install -y python3-pip
fi

echo "[2/5] Coletando credenciais..."
read -p "Usuário administrador [admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}
read -s -p "Senha administrador [admin00]: " ADMIN_PASS
echo
ADMIN_PASS=${ADMIN_PASS:-admin00}

# Configuración de acceso web
echo ""
echo "=== Configuración de Acceso Web ==="
read -p "¿Desea configurar acceso por internet con Traefik? [S/n]: " USE_TRAEFIK
USE_TRAEFIK=${USE_TRAEFIK:-S}

if [ "$USE_TRAEFIK" = "S" ] || [ "$USE_TRAEFIK" = "s" ] || [ -z "$USE_TRAEFIK" ]; then
    USE_TRAEFIK="true"
    read -p "Dominio para el frontend (ej: alugueis.example.com): " FRONTEND_DOMAIN
    read -p "Dominio para el backend API (ej: api.alugueis.example.com): " BACKEND_DOMAIN
    
    # Verificar que se ingresaron los dominios
    if [ -z "$FRONTEND_DOMAIN" ] || [ -z "$BACKEND_DOMAIN" ]; then
        echo "❌ Error: Debe ingresar ambos dominios para usar Traefik"
        exit 1
    fi
    
    echo "Frontend será accesible en: https://$FRONTEND_DOMAIN"
    echo "Backend API será accesible en: https://$BACKEND_DOMAIN"
else
    USE_TRAEFIK="false"
    FRONTEND_DOMAIN="localhost"
    BACKEND_DOMAIN="localhost"
    echo "Configurando para acceso local solamente"
fi
echo ""

read -p "Nome do banco [alugueisv2_db]: " POSTGRES_DB
POSTGRES_DB=${POSTGRES_DB:-alugueisv2_db}
read -p "Usuário do banco [alugueisv2_usuario]: " POSTGRES_USER
POSTGRES_USER=${POSTGRES_USER:-alugueisv2_usuario}
read -s -p "Senha do banco [alugueisv2_senha]: " POSTGRES_PASSWORD
echo
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-alugueisv2_senha}

# Gerar SECRET_KEY aleatória
if check_cmd openssl; then
  SECRET_KEY=$(openssl rand -hex 32)
else
  SECRET_KEY=$(python3 - <<'PY'
import os, binascii
print(binascii.hexlify(os.urandom(32)).decode())
PY
)
fi

echo "[3/5] Escrevendo arquivos .env..."

cat > .env <<ENVEOF
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_v2:5432/${POSTGRES_DB}
SECRET_KEY=${SECRET_KEY}
DEBUG=true
ADMIN_USER=${ADMIN_USER}
ADMIN_PASS=${ADMIN_PASS}


# Configurar CORS según el tipo de instalación

# Agregar puerto :3000 automáticamente si no está presente en el dominio del frontend
if [ "$USE_TRAEFIK" = "true" ]; then
  FRONTEND_CORS_ORIGIN="$FRONTEND_DOMAIN"
  # Si el dominio no tiene puerto, agregar :3000
  if [[ ! "$FRONTEND_CORS_ORIGIN" =~ :[0-9]+$ ]]; then
    FRONTEND_CORS_ORIGIN="${FRONTEND_CORS_ORIGIN}:3000"
  fi
  CORS_ALLOW_ORIGINS="http://${FRONTEND_CORS_ORIGIN}"
else
  CORS_ALLOW_ORIGINS="http://192.168.0.7:3000"
fi

mkdir -p backend
cat > backend/.env <<BENVEOF
ENV=development
SECRET_KEY=${SECRET_KEY}
DEBUG=true
CORS_ALLOW_ORIGINS=${CORS_ALLOW_ORIGINS}
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_v2:5432/${POSTGRES_DB}
BENVEOF

# Opción de limpeza total
read -p "Deseja APAGAR dados existentes do banco (docker compose down -v)? [S/n]: " PURGE
PURGE=${PURGE:-S}
if [ -z "$PURGE" ] || [ "$PURGE" = "S" ] || [ "$PURGE" = "s" ]; then
  echo "Apagando containers, volumes e redes do projeto..."
  docker compose down -v || true
fi

echo "[4/5] Subindo containers..."

docker compose build --no-cache && docker compose up -d

echo "Aguardando PostgreSQL saudável..."
PG_CID=$(docker compose ps -q postgres_v2)
if [ -z "$PG_CID" ]; then echo "Falha ao localizar container postgres_v2"; exit 1; fi
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$PG_CID" 2>/dev/null || echo starting)" = "healthy" ]; do
  sleep 2; echo "... aguardando banco ...";
done

echo "[5/5] Inicializando banco e criando admin..."
# Re-executar estrutura para garantir tabelas (usar superusuário definido por POSTGRES_USER)
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CID" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "/docker-entrypoint-initdb.d/000_estrutura_nova.sql" || true

# Gerar hash bcrypt (sem Passlib)
python3 -m venv venv >/dev/null 2>&1 || true
venv/bin/pip install --quiet bcrypt >/dev/null 2>&1 || true
HASH=$(venv/bin/python - <<'PY'
import os, bcrypt
pwd = os.environ.get('ADMIN_PASS','admin00').encode('utf-8')
print(bcrypt.hashpw(pwd, bcrypt.gensalt()).decode('utf-8'))
PY
)

# Inserir usuário admin se não existe (escapando valores)
SAFE_ADMIN_USER=$(printf "%s" "$ADMIN_USER" | sed "s/'/''/g")
SAFE_HASH=$(printf "%s" "$HASH" | sed "s/'/''/g")
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CID" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "INSERT INTO usuarios (usuario, senha, tipo_de_usuario) VALUES ('$SAFE_ADMIN_USER', '$SAFE_HASH', 'administrador') ON CONFLICT (usuario) DO NOTHING;" || true

echo
echo "✅ Sistema instalado!"

if [ "$USE_TRAEFIK" = "true" ]; then
    echo "Frontend:  https://$FRONTEND_DOMAIN"
    echo "Backend:   https://$BACKEND_DOMAIN/docs"
    echo ""
    echo "⚠️  IMPORTANTE: Configure los registros DNS A/CNAME para:"
    echo "   $FRONTEND_DOMAIN -> IP del servidor"
    echo "   $BACKEND_DOMAIN -> IP del servidor"
    echo ""
    echo "📋 Para usar con Traefik, asegúrese de que:"
    echo "   - Traefik esté corriendo en la red 'traefik'"
    echo "   - Los certificados SSL estén configurados"
else
    echo "Frontend:  http://192.168.0.7:3000"
    echo "Backend:   http://192.168.0.7:8000/docs"
fi

echo "Adminer:   http://192.168.0.7:8080 (Servidor: postgres_v2, DB: ${POSTGRES_DB}, User: ${POSTGRES_USER})"
echo
echo "Usuário admin: ${ADMIN_USER}"
echo "Senha admin:  ${ADMIN_PASS}"
echo
echo "Para ajustar CORS no backend edite backend/.env e reinicie: docker compose restart backend_v2"
