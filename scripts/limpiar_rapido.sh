#!/bin/bash
#
# SCRIPT DE LIMPIEZA RÁPIDA - SOLO PARA DESARROLLO
# Sistema de Alquileres V2
#

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[LIMPIEZA RÁPIDA]${NC} Iniciando..."

# Detener backend
pkill -f "python.*main.py" 2>/dev/null || true
sleep 2

# Limpiar base de datos
echo -e "${BLUE}[LIMPIEZA RÁPIDA]${NC} Limpiando base de datos..."

docker exec alquileresv2_postgres psql -U alquileresv2_user -d alquileresv2_db -c "
SET session_replication_role = replica;
DELETE FROM alquileres_mensuales;
DELETE FROM participaciones;
DELETE FROM alquileres_simple;
DELETE FROM inmuebles;
DELETE FROM propietarios;
ALTER SEQUENCE IF EXISTS alquileres_simple_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS inmuebles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS propietarios_id_seq RESTART WITH 1;
SET session_replication_role = DEFAULT;
"

echo -e "${BLUE}[LIMPIEZA RÁPIDA]${NC} Limpiando archivos..."
rm -f backend.log 2>/dev/null || true

# Reiniciar backend
echo -e "${BLUE}[LIMPIEZA RÁPIDA]${NC} Reiniciando backend..."
if [ -d "backend/venv" ]; then
    cd backend
    nohup bash -c 'source venv/bin/activate && python main.py' > ../backend.log 2>&1 &
    cd ..
else
    echo -e "${BLUE}[LIMPIEZA RÁPIDA]${NC} No hay entorno virtual, usando sistema..."
    nohup python3 backend/main.py > backend.log 2>&1 &
fi

sleep 5

echo -e "${GREEN}[LIMPIEZA RÁPIDA]${NC} ✅ Completado"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
