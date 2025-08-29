#!/bin/bash
#
# SCRIPT DE VERIFICACIÓN DEL ESTADO DEL SISTEMA
# Sistema de Alquileres V2
#

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=============================================="
echo -e "     ESTADO DEL SISTEMA DE ALQUILERES V2"
echo -e "==============================================${NC}"
echo

# Verificar contenedores Docker
echo -e "${BLUE}[DOCKER]${NC} Estado de contenedores:"
if docker ps | grep -q "alquileresv2_postgres"; then
    echo -e "  PostgreSQL: ${GREEN}✅ Ejecutándose${NC}"
else
    echo -e "  PostgreSQL: ${RED}❌ Detenido${NC}"
fi

if docker ps | grep -q "alquileresv2_adminer"; then
    echo -e "  Adminer: ${GREEN}✅ Ejecutándose${NC}"
else
    echo -e "  Adminer: ${RED}❌ Detenido${NC}"
fi

echo

# Verificar backend
echo -e "${BLUE}[BACKEND]${NC} Estado del servidor:"
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo -e "  API Backend: ${GREEN}✅ Activo (puerto 8000)${NC}"
    
    # Obtener estadísticas de la base de datos
    HEALTH_INFO=$(curl -s http://localhost:8000/health 2>/dev/null)
    if [ ! -z "$HEALTH_INFO" ]; then
        echo "  $HEALTH_INFO"
    fi
else
    echo -e "  API Backend: ${RED}❌ No responde (puerto 8000)${NC}"
fi

echo

# Verificar frontend
echo -e "${BLUE}[FRONTEND]${NC} Estado del frontend:"
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    echo -e "  Frontend: ${GREEN}✅ Activo (puerto 3000)${NC}"
else
    echo -e "  Frontend: ${YELLOW}⚠️  No verificable (puerto 3000)${NC}"
fi

echo

# Verificar base de datos directamente
echo -e "${BLUE}[BASE DE DATOS]${NC} Conteo de registros:"
if docker exec alquileresv2_postgres psql -U alquileresv2_user -d alquileresv2_db -c "SELECT 1;" >/dev/null 2>&1; then
    
    # Obtener conteos
    COUNTS=$(docker exec alquileresv2_postgres psql -U alquileresv2_user -d alquileresv2_db -t -c "
        SELECT 
            (SELECT COUNT(*) FROM alquileres_simple) as alquileres,
            (SELECT COUNT(*) FROM inmuebles) as inmuebles,
            (SELECT COUNT(*) FROM propietarios) as propietarios;
    " 2>/dev/null | tr -d ' ' | tr '|' ' ')
    
    if [ ! -z "$COUNTS" ]; then
        read ALQUILERES INMUEBLES PROPIETARIOS <<< "$COUNTS"
        echo "  Alquileres: $ALQUILERES"
        echo "  Inmuebles: $INMUEBLES" 
        echo "  Propietarios: $PROPIETARIOS"
        
        TOTAL=$((ALQUILERES + INMUEBLES + PROPIETARIOS))
        if [ $TOTAL -eq 0 ]; then
            echo -e "  Estado: ${GREEN}✅ Base de datos limpia${NC}"
        else
            echo -e "  Estado: ${YELLOW}📊 Contiene datos${NC}"
        fi
    else
        echo -e "  Estado: ${RED}❌ Error al consultar${NC}"
    fi
else
    echo -e "  Conexión: ${RED}❌ No disponible${NC}"
fi

echo

# Verificar archivos importantes
echo -e "${BLUE}[ARCHIVOS]${NC} Archivos del sistema:"
if [ -f "Base2025.xlsx" ]; then
    echo -e "  Base2025.xlsx: ${GREEN}✅ Presente${NC}"
else
    echo -e "  Base2025.xlsx: ${RED}❌ No encontrado${NC}"
fi

if [ -f "backend/main.py" ]; then
    echo -e "  Backend: ${GREEN}✅ Presente${NC}"
else
    echo -e "  Backend: ${RED}❌ No encontrado${NC}"
fi

if [ -d "backend/venv" ]; then
    echo -e "  Entorno virtual: ${GREEN}✅ Presente${NC}"
else
    echo -e "  Entorno virtual: ${YELLOW}⚠️  No encontrado${NC}"
fi

echo

# Mostrar URLs de acceso
echo -e "${CYAN}=============================================="
echo -e "              ACCESO AL SISTEMA"
echo -e "==============================================${NC}"
echo "  🌐 Frontend:    http://localhost:3000"
echo "  🔧 Backend API: http://localhost:8000"
echo "  🗄️  Adminer:    http://localhost:8080"
echo "  📊 Health:      http://localhost:8000/health"
echo -e "${CYAN}=============================================${NC}"
