#!/bin/bash

# Script de Verificación del Estado del Sistema de Alquileres V2
# Verifica el estado de todos los servicios del sistema
# Autor: Sistema Alquileres V2
# Fecha: 23 de julio de 2025

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración del sistema
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Función para mostrar banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║            🔍 ESTADO DEL SISTEMA - VERIFICACIÓN 🔍          ║"
    echo "║                                                              ║"
    echo "║                   Sistema de Alquileres V2                   ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# Función para verificar servicio por puerto
check_service() {
    local port=$1
    local name=$2
    local url=$3
    
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        if [ ! -z "$url" ]; then
            if curl -s "$url" &>/dev/null; then
                echo -e "✅ ${GREEN}$name${NC} - Puerto $port - ${GREEN}FUNCIONANDO${NC}"
                return 0
            else
                echo -e "⚠️  ${YELLOW}$name${NC} - Puerto $port - ${YELLOW}PUERTO ABIERTO PERO NO RESPONDE${NC}"
                return 1
            fi
        else
            echo -e "✅ ${GREEN}$name${NC} - Puerto $port - ${GREEN}ACTIVO${NC}"
            return 0
        fi
    else
        echo -e "❌ ${RED}$name${NC} - Puerto $port - ${RED}DETENIDO${NC}"
        return 1
    fi
}

# Función para verificar contenedores Docker
check_docker() {
    echo -e "${CYAN}🐳 CONTENEDORES DOCKER:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    cd "$PROJECT_ROOT"
    
    if command -v docker-compose &> /dev/null; then
        local containers=$(docker-compose ps -q 2>/dev/null)
        if [ ! -z "$containers" ]; then
            docker-compose ps
            echo ""
            
            # Verificar salud de PostgreSQL
            if docker-compose ps | grep postgres_v2 | grep -q "Up"; then
                if docker-compose exec -T postgres_v2 pg_isready -U alquileresv2_user -d alquileresv2_db &>/dev/null; then
                    echo -e "✅ ${GREEN}PostgreSQL${NC} - Base de datos responde correctamente"
                else
                    echo -e "⚠️  ${YELLOW}PostgreSQL${NC} - Contenedor activo pero BD no responde"
                fi
            fi
        else
            echo -e "ℹ️  ${BLUE}No hay contenedores Docker ejecutándose${NC}"
        fi
    else
        echo -e "❌ ${RED}Docker Compose no está disponible${NC}"
    fi
    echo ""
}

# Función para verificar procesos Python
check_python_processes() {
    echo -e "${CYAN}🐍 PROCESOS PYTHON:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    # Backend (uvicorn)
    local backend_pids=$(pgrep -f "uvicorn.*main:app" 2>/dev/null || true)
    if [ ! -z "$backend_pids" ]; then
        echo -e "✅ ${GREEN}Backend (uvicorn)${NC} - PIDs: $backend_pids"
    else
        echo -e "❌ ${RED}Backend (uvicorn)${NC} - No está ejecutándose"
    fi
    
    # Frontend (http.server)
    local frontend_pids=$(pgrep -f "python.*http.server.*3000" 2>/dev/null || true)
    if [ ! -z "$frontend_pids" ]; then
        echo -e "✅ ${GREEN}Frontend (http.server)${NC} - PIDs: $frontend_pids"
    else
        echo -e "❌ ${RED}Frontend (http.server)${NC} - No está ejecutándose"
    fi
    
    echo ""
}

# Función para verificar archivos PID
check_pid_files() {
    echo -e "${CYAN}📄 ARCHIVOS PID:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
        local backend_pid=$(cat "$PROJECT_ROOT/logs/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            echo -e "✅ ${GREEN}Backend PID${NC} - $backend_pid (proceso activo)"
        else
            echo -e "⚠️  ${YELLOW}Backend PID${NC} - $backend_pid (archivo existe pero proceso no)"
        fi
    else
        echo -e "ℹ️  ${BLUE}Backend PID${NC} - Archivo no existe"
    fi
    
    if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
        local frontend_pid=$(cat "$PROJECT_ROOT/logs/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            echo -e "✅ ${GREEN}Frontend PID${NC} - $frontend_pid (proceso activo)"
        else
            echo -e "⚠️  ${YELLOW}Frontend PID${NC} - $frontend_pid (archivo existe pero proceso no)"
        fi
    else
        echo -e "ℹ️  ${BLUE}Frontend PID${NC} - Archivo no existe"
    fi
    
    echo ""
}

# Función para verificar logs recientes
check_logs() {
    echo -e "${CYAN}📋 LOGS RECIENTES:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    for log_file in "$PROJECT_ROOT/logs/"*.log; do
        if [ -f "$log_file" ]; then
            local filename=$(basename "$log_file")
            local size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo "0")
            local modified=$(stat -f%Sm -t "%Y-%m-%d %H:%M" "$log_file" 2>/dev/null || stat -c%y "$log_file" 2>/dev/null | cut -d'.' -f1 || echo "Desconocido")
            
            echo -e "📄 ${BLUE}$filename${NC} - Tamaño: $(($size / 1024))KB - Modificado: $modified"
        fi
    done
    
    if [ ! -d "$PROJECT_ROOT/logs" ] || [ -z "$(ls -A "$PROJECT_ROOT/logs" 2>/dev/null)" ]; then
        echo -e "ℹ️  ${BLUE}No hay logs disponibles${NC}"
    fi
    
    echo ""
}

# Función para verificar conectividad de servicios
check_connectivity() {
    echo -e "${CYAN}🌐 CONECTIVIDAD DE SERVICIOS:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    # Verificar Frontend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
        echo -e "✅ ${GREEN}Frontend${NC} - http://localhost:3000 responde correctamente"
    else
        echo -e "❌ ${RED}Frontend${NC} - http://localhost:3000 no responde"
    fi
    
    # Verificar Backend
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ | grep -q "200"; then
        echo -e "✅ ${GREEN}Backend API${NC} - http://localhost:8000 responde correctamente"
    else
        echo -e "❌ ${RED}Backend API${NC} - http://localhost:8000 no responde"
    fi
    
    # Verificar documentación de API
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs | grep -q "200"; then
        echo -e "✅ ${GREEN}API Docs${NC} - http://localhost:8000/docs disponible"
    else
        echo -e "❌ ${RED}API Docs${NC} - http://localhost:8000/docs no disponible"
    fi
    
    # Verificar Adminer
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ | grep -q "200"; then
        echo -e "✅ ${GREEN}Adminer${NC} - http://localhost:8080 disponible"
    else
        echo -e "❌ ${RED}Adminer${NC} - http://localhost:8080 no disponible"
    fi
    
    echo ""
}

# Función para mostrar resumen del estado
show_status_summary() {
    echo -e "${CYAN}📊 RESUMEN DEL ESTADO:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    
    local services_running=0
    local total_services=4
    
    # Contar servicios funcionando
    netstat -tuln 2>/dev/null | grep -q ":3000 " && ((services_running++))
    netstat -tuln 2>/dev/null | grep -q ":8000 " && ((services_running++))
    netstat -tuln 2>/dev/null | grep -q ":5432 " && ((services_running++))
    netstat -tuln 2>/dev/null | grep -q ":8080 " && ((services_running++))
    
    if [ $services_running -eq $total_services ]; then
        echo -e "🟢 ${GREEN}SISTEMA COMPLETAMENTE OPERATIVO${NC} ($services_running/$total_services servicios)"
        echo -e "💡 ${BLUE}Todos los servicios están funcionando correctamente${NC}"
    elif [ $services_running -gt 0 ]; then
        echo -e "🟡 ${YELLOW}SISTEMA PARCIALMENTE OPERATIVO${NC} ($services_running/$total_services servicios)"
        echo -e "⚠️  ${YELLOW}Algunos servicios necesitan atención${NC}"
    else
        echo -e "🔴 ${RED}SISTEMA DETENIDO${NC} ($services_running/$total_services servicios)"
        echo -e "💡 ${BLUE}Ejecute ./start_total_system.sh para iniciar${NC}"
    fi
    
    echo ""
}

# Función para mostrar comandos útiles
show_commands() {
    echo -e "${CYAN}🛠️  COMANDOS ÚTILES:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "🚀 ${BLUE}Iniciar sistema:${NC}      ./start_total_system.sh"
    echo -e "🛑 ${BLUE}Detener sistema:${NC}      ./stop_total_system.sh"
    echo -e "🔍 ${BLUE}Ver este estado:${NC}      ./check_system_status.sh"
    echo -e "🗄️  ${BLUE}Gestionar BD:${NC}         ./gestionar_db.sh"
    echo -e "📋 ${BLUE}Ver logs backend:${NC}     tail -f logs/backend.log"
    echo -e "🌐 ${BLUE}Ver logs frontend:${NC}    tail -f logs/frontend.log"
    echo ""
}

# FUNCIÓN PRINCIPAL
main() {
    show_banner
    
    echo -e "${CYAN}🔍 Verificando estado del Sistema de Alquileres V2...${NC}"
    echo ""
    
    # Verificaciones principales
    echo -e "${CYAN}🔌 PUERTOS Y SERVICIOS:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    check_service 3000 "Frontend Web" "http://localhost:3000/"
    check_service 8000 "Backend API" "http://localhost:8000/"
    check_service 5432 "PostgreSQL" ""
    check_service 8080 "Adminer" "http://localhost:8080/"
    echo ""
    
    # Verificaciones adicionales
    check_docker
    check_python_processes
    check_pid_files
    check_logs
    check_connectivity
    show_status_summary
    show_commands
    
    echo -e "${PURPLE}Verificación completada - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
}

# Mostrar ayuda si se solicita
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Script de Verificación del Estado del Sistema de Alquileres V2"
    echo ""
    echo "Uso:"
    echo "  $0                  # Verificación completa del estado"
    echo "  $0 --help           # Mostrar esta ayuda"
    echo ""
    echo "Servicios verificados:"
    echo "  - Frontend Web (puerto 3000)"
    echo "  - Backend API (puerto 8000)"  
    echo "  - PostgreSQL (puerto 5432)"
    echo "  - Adminer (puerto 8080)"
    exit 0
fi

# Ejecutar función principal
main "$@"
