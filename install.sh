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

read -p "Nome do banco [alugueisv1_db]: " POSTGRES_DB
POSTGRES_DB=${POSTGRES_DB:-alugueisv1_db}
read -p "Usuário do banco [alugueisv1_usuario]: " POSTGRES_USER
POSTGRES_USER=${POSTGRES_USER:-alugueisv1_usuario}
read -s -p "Senha do banco [alugueisv1_senha]: " POSTGRES_PASSWORD
echo
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-alugueisv1_senha}

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
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_v1:5432/${POSTGRES_DB}
SECRET_KEY=${SECRET_KEY}
DEBUG=true
CORS_ORIGINS=*
ADMIN_USER=${ADMIN_USER}
ADMIN_PASS=${ADMIN_PASS}
ENVEOF

mkdir -p backend
cat > backend/.env <<BENVEOF
ENV=development
SECRET_KEY=${SECRET_KEY}
DEBUG=true
CORS_ALLOW_ORIGINS=http://192.168.0.7:3000,http://192.168.0.7:8000
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres_v1:5432/${POSTGRES_DB}
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
PG_CID=$(docker compose ps -q postgres_v1)
if [ -z "$PG_CID" ]; then echo "Falha ao localizar container postgres_v1"; exit 1; fi
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
echo "Frontend:  http://192.168.0.7:3000"
echo "Backend:   http://192.168.0.7:8000/docs"
echo "Adminer:   http://192.168.0.7:8080 (Servidor: postgres_v1, DB: ${POSTGRES_DB}, User: ${POSTGRES_USER})"
echo
echo "Usuário admin: ${ADMIN_USER}"
echo "Senha admin:  ${ADMIN_PASS}"
echo
echo "Para ajustar CORS no backend edite backend/.env e reinicie: docker compose restart backend_v1"
