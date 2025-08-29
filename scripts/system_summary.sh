#!/bin/bash

# =============================================================================
# System Summary - Sistema de Alquileres V2
# =============================================================================
# Descripción: Muestra un resumen completo del estado del sistema
# Uso: ./run_script.sh summary
# =============================================================================

# Configuración
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏠 Sistema de Alquileres V2 - Resumen del Sistema${NC}"
echo "================================================="
echo ""

# Información del Proyecto
echo -e "${GREEN}📋 Información del Proyecto:${NC}"
echo "  📁 Ubicación: ${PROJECT_ROOT}"
echo "  🔧 Tipo: Sistema web con FastAPI + PostgreSQL"
echo "  🎯 Propósito: Gestión de alquileres y propiedades"
echo ""

# Estado del repositorio Git
echo -e "${CYAN}📡 Estado del Repositorio:${NC}"
if [ -d "${PROJECT_ROOT}/.git" ]; then
    cd "$PROJECT_ROOT"
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    COMMITS=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    LAST_COMMIT=$(git log -1 --format="%h - %s" 2>/dev/null || echo "Sin commits")
    
    echo "  🌿 Branch actual: $BRANCH"
    echo "  📊 Total commits: $COMMITS"
    echo "  📝 Último commit: $LAST_COMMIT"
    
    # Estado de archivos
    STATUS=$(git status --porcelain 2>/dev/null)
    if [ -z "$STATUS" ]; then
        echo -e "  ✅ ${GREEN}Working tree limpio${NC}"
    else
        echo -e "  ⚠️  ${YELLOW}Hay cambios pendientes${NC}"
    fi
else
    echo -e "  ❌ ${RED}No es un repositorio Git${NC}"
fi
echo ""

# Archivos principales
echo -e "${YELLOW}📄 Archivos Principales:${NC}"
FILES=("docker-compose.yml" "README.md" "backend/main.py" "frontend/index.html")
for file in "${FILES[@]}"; do
    if [ -f "${PROJECT_ROOT}/$file" ]; then
        echo -e "  ✅ $file"
    else
        echo -e "  ❌ $file (faltante)"
    fi
done
echo ""

# Scripts disponibles
echo -e "${PURPLE}🛠️  Scripts Disponibles:${NC}"
SCRIPT_COUNT=$(find "${PROJECT_ROOT}/scripts" -name "*.sh" -type f 2>/dev/null | wc -l)
echo "  📦 Total scripts: $SCRIPT_COUNT"

# Listar scripts principales
MAIN_SCRIPTS=("start_total_system.sh" "stop_total_system.sh" "update_repo.sh" "release.sh" "setup_github.sh")
for script in "${MAIN_SCRIPTS[@]}"; do
    if [ -f "${PROJECT_ROOT}/scripts/$script" ]; then
        echo -e "  ✅ $script"
    else
        echo -e "  ❌ $script (faltante)"
    fi
done
echo ""

# Estado del Docker
echo -e "${CYAN}🐳 Estado de Docker:${NC}"
if command -v docker >/dev/null 2>&1; then
    if [ -f "${PROJECT_ROOT}/docker-compose.yml" ]; then
        cd "$PROJECT_ROOT"
        RUNNING_CONTAINERS=$(docker-compose ps -q 2>/dev/null | wc -l)
        echo "  🔧 Docker Compose disponible"
        echo "  📊 Contenedores activos: $RUNNING_CONTAINERS"
    else
        echo "  ❌ docker-compose.yml no encontrado"
    fi
else
    echo "  ❌ Docker no está instalado"
fi
echo ""

# Próximos pasos recomendados
echo -e "${GREEN}🚀 Próximos Pasos Recomendados:${NC}"
if [ ! -d "${PROJECT_ROOT}/.git" ]; then
    echo "  1. Inicializar repositorio Git"
    echo "  2. Configurar GitHub con: ./run_script.sh setup-github"
elif [ -z "$(git remote get-url origin 2>/dev/null)" ]; then
    echo "  1. Configurar GitHub con: ./run_script.sh setup-github"
    echo "  2. Hacer primer commit: ./run_script.sh update \"Configuración inicial\""
else
    echo "  1. Verificar estado: ./run_script.sh status"
    echo "  2. Iniciar sistema: ./run_script.sh start"
    echo "  3. Actualizar cambios: ./run_script.sh update \"mensaje\""
    echo "  4. Crear release: ./run_script.sh release"
fi
echo ""

echo -e "${BLUE}💡 Para más información: ./run_script.sh commands${NC}"
echo -e "${GREEN}✨ Sistema configurado y listo para usar!${NC}"
