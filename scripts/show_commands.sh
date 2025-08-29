#!/bin/bash

# =============================================================================
# Show Commands - Sistema de Alquileres V2
# =============================================================================
# Descripción: Muestra todos los comandos disponibles de manera organizada
# Uso: ./run_script.sh commands
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
NC='\033[0m' # No Color

echo -e "${BLUE}🏠 Sistema de Alquileres V2 - Comandos Disponibles${NC}"
echo "================================================="
echo ""

echo -e "${GREEN}⚡ Gestión del Sistema:${NC}"
echo "  ./run_script.sh start          - Iniciar sistema completo"
echo "  ./run_script.sh stop           - Detener sistema completo"
echo "  ./run_script.sh status         - Ver estado del sistema"
echo "  ./run_script.sh check          - Verificación detallada"
echo ""

echo -e "${YELLOW}🧹 Limpieza y Mantenimiento:${NC}"
echo "  ./run_script.sh clean-db       - Limpiar solo base de datos"
echo "  ./run_script.sh clean-quick    - Limpieza rápida"
echo "  ./run_script.sh clean-full     - Limpieza completa"
echo "  ./run_script.sh db             - Gestionar base de datos"
echo ""

echo -e "${CYAN}🗄️ Estructura de Datos:${NC}"
echo "  ./run_script.sh apply-structure - Aplicar estructura final"
echo ""

echo -e "${RED}📡 GitHub y Repositorio:${NC}"
echo "  ./run_script.sh setup-github   - Configurar GitHub inicial"
echo "  ./run_script.sh fix-github     - Solucionar problemas GitHub"
echo ""

echo -e "${GREEN}📝 Gestión de Versiones:${NC}"
echo "  ./run_script.sh update \"msg\"   - Commit y push rápido"
echo "  ./run_script.sh status         - Estado del repositorio"
echo "  ./run_script.sh pull           - Actualizar desde GitHub"
echo "  ./run_script.sh log            - Ver historial commits"
echo "  ./run_script.sh release        - Crear nueva versión"
echo ""

echo -e "${BLUE}📖 Información:${NC}"
echo "  ./run_script.sh help           - Mostrar ayuda general"
echo "  ./run_script.sh commands       - Mostrar este resumen"
echo "  ./run_script.sh summary        - Resumen completo del sistema"
echo ""

echo -e "${YELLOW}💡 Ejemplos Comunes:${NC}"
echo "  ./run_script.sh start"
echo "  ./run_script.sh update \"Agregadas nuevas funcionalidades\""
echo "  ./run_script.sh release -p     # Release patch"
echo "  ./run_script.sh clean-quick"
echo ""

echo -e "${CYAN}📁 Ubicación de scripts: ${PROJECT_ROOT}/scripts/${NC}"
echo -e "${GREEN}✨ Sistema listo para usar!${NC}"
