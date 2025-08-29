#!/bin/bash

# Script de Parada Total del Sistema de Alquileres V2
# Detiene todos los servicios: Frontend Web, Backend API y Base de Datos
# Autor: Sistema Alquileres V2
# Fecha: 23 de julio de 2025

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración del sistema
SYSTEM_NAME="Sistema de Alquileres V2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/system_shutdown.log"

# Crear directorio de logs si no existe
mkdir -p "$PROJECT_ROOT/logs"

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$1"
}

# Función para mostrar banner
show_banner() {
    clear
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║              🛑 PARADA TOTAL DEL SISTEMA 🛑                  ║"
    echo "║                                                              ║"
    echo "║                   Sistema de Alquileres V2                   ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    log "🛑 Iniciando proceso de parada total del sistema"
}

# Función para confirmar parada
confirm_shutdown() {
    echo -e "${YELLOW}⚠️  ADVERTENCIA: Esta acción detendrá completamente el sistema.${NC}"
    echo ""
    echo "Servicios que serán detenidos:"
    echo "  🌐 Frontend Web (puerto 3000)"
    echo "  🚀 Backend API (puerto 8000)"
    echo "  🗄️  Base de Datos PostgreSQL (puerto 5432)"
    echo "  🔧 Adminer (puerto 8080)"
    echo ""
    
    read -p "¿Está seguro que desea continuar? (s/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        log "❌ Parada cancelada por el usuario"
        echo -e "${CYAN}💡 Parada cancelada. El sistema sigue funcionando.${NC}"
        exit 0
    fi
    
    log "✅ Confirmación recibida. Procediendo con la parada..."
}

# Función para detener frontend
stop_frontend() {
    log "🌐 Deteniendo Frontend Web..."
    
    # Buscar y matar proceso del frontend
    if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat "$PROJECT_ROOT/logs/frontend.pid")
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            log "🔄 Deteniendo proceso Frontend (PID: $FRONTEND_PID)..."
            kill $FRONTEND_PID 2>/dev/null || true
            
            # Esperar a que el proceso termine
            for i in {1..10}; do
                if ! kill -0 $FRONTEND_PID 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # Forzar terminación si es necesario
            if kill -0 $FRONTEND_PID 2>/dev/null; then
                log "⚡ Forzando terminación del Frontend..."
                kill -9 $FRONTEND_PID 2>/dev/null || true
            fi
        fi
        rm -f "$PROJECT_ROOT/logs/frontend.pid"
    fi
    
    # Buscar procesos adicionales en puerto 3000
    FRONTEND_PROCESSES=$(lsof -ti:3000 2>/dev/null || true)
    if [ ! -z "$FRONTEND_PROCESSES" ]; then
        log "🔄 Deteniendo procesos adicionales en puerto 3000..."
        echo $FRONTEND_PROCESSES | xargs kill -9 2>/dev/null || true
    fi
    
    # Verificar que el puerto esté libre
    if ! netstat -tuln 2>/dev/null | grep -q ":3000 "; then
        log "✅ Frontend Web detenido correctamente"
    else
        log "⚠️  Advertencia: Puerto 3000 aún podría estar en uso"
    fi
}

# Función para detener backend
stop_backend() {
    log "🚀 Deteniendo Backend API..."
    
    # Buscar y matar proceso del backend
    if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
        BACKEND_PID=$(cat "$PROJECT_ROOT/logs/backend.pid")
        if kill -0 $BACKEND_PID 2>/dev/null; then
            log "🔄 Deteniendo proceso Backend (PID: $BACKEND_PID)..."
            kill $BACKEND_PID 2>/dev/null || true
            
            # Esperar a que el proceso termine
            for i in {1..15}; do
                if ! kill -0 $BACKEND_PID 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # Forzar terminación si es necesario
            if kill -0 $BACKEND_PID 2>/dev/null; then
                log "⚡ Forzando terminación del Backend..."
                kill -9 $BACKEND_PID 2>/dev/null || true
            fi
        fi
        rm -f "$PROJECT_ROOT/logs/backend.pid"
    fi
    
    # Buscar procesos adicionales en puerto 8000
    BACKEND_PROCESSES=$(lsof -ti:8000 2>/dev/null || true)
    if [ ! -z "$BACKEND_PROCESSES" ]; then
        log "🔄 Deteniendo procesos adicionales en puerto 8000..."
        echo $BACKEND_PROCESSES | xargs kill -9 2>/dev/null || true
    fi
    
    # Buscar procesos uvicorn
    UVICORN_PROCESSES=$(pgrep -f "uvicorn.*main:app" 2>/dev/null || true)
    if [ ! -z "$UVICORN_PROCESSES" ]; then
        log "🔄 Deteniendo procesos uvicorn..."
        echo $UVICORN_PROCESSES | xargs kill -9 2>/dev/null || true
    fi
    
    # Verificar que el puerto esté libre
    if ! netstat -tuln 2>/dev/null | grep -q ":8000 "; then
        log "✅ Backend API detenido correctamente"
    else
        log "⚠️  Advertencia: Puerto 8000 aún podría estar en uso"
    fi
}

# Función para detener base de datos
stop_database() {
    log "🗄️  Deteniendo servicios de Base de Datos..."
    
    cd "$PROJECT_ROOT"
    
    # Verificar si hay contenedores ejecutándose
    RUNNING_CONTAINERS=$(docker-compose ps -q 2>/dev/null | wc -l)
    
    if [ $RUNNING_CONTAINERS -gt 0 ]; then
        log "🔄 Deteniendo contenedores Docker..."
        
        # Intentar parada ordenada primero
        docker-compose stop 2>/dev/null || true
        
        # Esperar un poco para parada ordenada
        sleep 5
        
        # Verificar si siguen ejecutándose
        STILL_RUNNING=$(docker-compose ps -q 2>/dev/null | wc -l)
        if [ $STILL_RUNNING -gt 0 ]; then
            log "⚡ Forzando parada de contenedores..."
            docker-compose down --remove-orphans 2>/dev/null || true
        fi
        
        log "✅ Contenedores Docker detenidos"
    else
        log "ℹ️  No hay contenedores Docker ejecutándose"
    fi
    
    # Verificar puertos específicos
    DB_PORTS=(5432 8080)
    PORT_NAMES=("PostgreSQL" "Adminer")
    
    for i in "${!DB_PORTS[@]}"; do
        PORT=${DB_PORTS[i]}
        NAME=${PORT_NAMES[i]}
        
        if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
            log "🔄 Liberando puerto $PORT ($NAME)..."
            sudo fuser -k $PORT/tcp 2>/dev/null || true
        fi
    done
    
    log "✅ Base de Datos detenida correctamente"
}

# Función para limpiar archivos temporales
cleanup_files() {
    log "🧹 Limpiando archivos temporales..."
    
    # Limpiar PIDs
    rm -f "$PROJECT_ROOT/logs/backend.pid" 2>/dev/null || true
    rm -f "$PROJECT_ROOT/logs/frontend.pid" 2>/dev/null || true
    
    # Limpiar cache de Python
    find "$SCRIPT_DIR" -name "__pycache__" -type d -not -path "*/venv_scripts/*" -exec rm -rf {} + 2>/dev/null || true
    
    # Rotar logs si son muy grandes (>10MB)
    for log_file in "$PROJECT_ROOT/logs/"*.log; do
        if [ -f "$log_file" ] && [ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0) -gt 10485760 ]; then
            mv "$log_file" "$log_file.old"
            log "📋 Log rotado: $(basename $log_file)"
        fi
    done
    
    log "✅ Archivos temporales limpiados"
}

# Función para verificar parada completa
verify_shutdown() {
    log "🔍 Verificando parada completa..."
    
    PORTS_TO_CHECK=(3000 8000 5432 8080)
    PORT_NAMES=("Frontend" "Backend" "PostgreSQL" "Adminer")
    ALL_STOPPED=true
    
    for i in "${!PORTS_TO_CHECK[@]}"; do
        PORT=${PORTS_TO_CHECK[i]}
        NAME=${PORT_NAMES[i]}
        
        if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
            log "⚠️  Puerto $PORT ($NAME) aún está en uso"
            ALL_STOPPED=false
        else
            log "✅ Puerto $PORT ($NAME) liberado"
        fi
    done
    
    if $ALL_STOPPED; then
        log "✅ Verificación completa: Todos los servicios detenidos correctamente"
        return 0
    else
        log "⚠️  Algunos servicios podrían seguir ejecutándose"
        return 1
    fi
}

# Función para mostrar resumen final
show_summary() {
    echo ""
    
    if verify_shutdown; then
        echo -e "${GREEN}"
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║                                                              ║"
        echo "║               ✅ SISTEMA DETENIDO EXITOSAMENTE ✅            ║"
        echo "║                                                              ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        
        echo -e "${CYAN}🛑 SERVICIOS DETENIDOS:${NC}"
        echo "────────────────────────────────────────────────────────────────"
        echo -e "✅ ${BLUE}Frontend Web${NC}       (puerto 3000)"
        echo -e "✅ ${BLUE}Backend API${NC}        (puerto 8000)"
        echo -e "✅ ${BLUE}PostgreSQL${NC}         (puerto 5432)"
        echo -e "✅ ${BLUE}Adminer${NC}            (puerto 8080)"
        
    else
        echo -e "${YELLOW}"
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║                                                              ║"
        echo "║            ⚠️  PARADA COMPLETADA CON ADVERTENCIAS ⚠️         ║"
        echo "║                                                              ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        
        echo -e "${YELLOW}⚠️  Algunos servicios podrían requerir atención manual${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}📁 ARCHIVOS DE LOG:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "📋 ${BLUE}Parada:${NC}            $LOG_FILE"
    echo -e "🚀 ${BLUE}Backend:${NC}           $PROJECT_ROOT/logs/backend.log"
    echo -e "🌐 ${BLUE}Frontend:${NC}          $PROJECT_ROOT/logs/frontend.log"
    echo ""
    
    echo -e "${CYAN}🚀 PARA REINICIAR EL SISTEMA:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "💡 ${BLUE}Ejecutar:${NC}          ./start_total_system.sh"
    echo ""
    
    log "🏁 Proceso de parada total completado"
}

# Función para manejo de emergencia
emergency_stop() {
    log "🚨 Ejecutando parada de emergencia..."
    
    # Matar todos los procesos relacionados
    pkill -f "uvicorn.*main:app" 2>/dev/null || true
    pkill -f "python.*http.server.*3000" 2>/dev/null || true
    
    # Forzar liberación de puertos
    for port in 3000 8000 5432 8080; do
        sudo fuser -k $port/tcp 2>/dev/null || true
    done
    
    # Forzar parada de Docker
    cd "$PROJECT_ROOT"
    docker-compose down --remove-orphans -v 2>/dev/null || true
    
    log "🚨 Parada de emergencia completada"
}

# FUNCIÓN PRINCIPAL
main() {
    show_banner
    
    # Verificar si se pasa parámetro de emergencia
    if [[ "$1" == "--emergency" || "$1" == "-e" ]]; then
        log "🚨 Modo de emergencia activado - sin confirmación"
        emergency_stop
        show_summary
        return
    fi
    
    # Confirmación normal
    confirm_shutdown
    
    log "🏁 Iniciando secuencia de parada completa del sistema..."
    
    # Parada ordenada de servicios
    stop_frontend
    stop_backend
    stop_database
    
    # Limpieza final
    cleanup_files
    
    # Resumen final
    show_summary
    
    log "🎉 Parada total completada exitosamente"
}

# Mostrar ayuda si se solicita
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Script de Parada Total del Sistema de Alquileres V2"
    echo ""
    echo "Uso:"
    echo "  $0                  # Parada normal con confirmación"
    echo "  $0 --emergency      # Parada de emergencia sin confirmación"
    echo "  $0 --help           # Mostrar esta ayuda"
    echo ""
    echo "Servicios que detiene:"
    echo "  - Frontend Web (puerto 3000)"
    echo "  - Backend API (puerto 8000)"  
    echo "  - PostgreSQL (puerto 5432)"
    echo "  - Adminer (puerto 8080)"
    exit 0
fi

# Ejecutar función principal
main "$@"
