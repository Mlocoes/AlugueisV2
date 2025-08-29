#!/bin/bash

# Scr# Configuración del sistema
SYSTEM_NAME="Sistema de Alquileres V2"
VERSION="2.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/system_startup.log"

# Crear directorio de logs si no existe
mkdir -p "$PROJECT_ROOT/logs"

# Script de Inicialización Total del Sistema de Alquileres V2
# Inicia todos los servicios: Base de Datos, Backend API y Frontend Web
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
LOG_FILE="$PROJECT_ROOT/logs/system_startup.log"

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
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           🚀 INICIALIZACIÓN TOTAL DEL SISTEMA 🚀             ║"
    echo "║                                                              ║"
    echo "║                   Sistema de Alquileres V2                   ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    log "🚀 Iniciando proceso de inicialización total del sistema"
}

# Función para verificar dependencias
check_dependencies() {
    log "🔍 Verificando dependencias del sistema..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        log "❌ Docker no está instalado. Por favor, instale Docker antes de continuar."
        exit 1
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log "❌ Docker Compose no está instalado. Por favor, instale Docker Compose antes de continuar."
        exit 1
    fi
    
    # Verificar Python
    if ! command -v python3 &> /dev/null; then
        log "❌ Python 3 no está instalado. Por favor, instale Python 3 antes de continuar."
        exit 1
    fi
    
    log "✅ Todas las dependencias están disponibles"
}

# Función para verificar puertos
check_ports() {
    log "🔍 Verificando disponibilidad de puertos..."
    
    PORTS=(5432 8000 3000 8080)
    PORT_NAMES=("PostgreSQL" "Backend API" "Frontend Web" "Adminer")
    
    for i in "${!PORTS[@]}"; do
        PORT=${PORTS[i]}
        NAME=${PORT_NAMES[i]}
        
        if netstat -tuln 2>/dev/null | grep -q ":$PORT "; then
            log "⚠️  Puerto $PORT ($NAME) está en uso. Intentando liberar..."
            # Intentar matar proceso que usa el puerto
            sudo fuser -k $PORT/tcp 2>/dev/null || true
            sleep 2
        fi
        log "✅ Puerto $PORT ($NAME) disponible"
    done
}

# Función para iniciar base de datos
start_database() {
    log "🗄️  Iniciando base de datos PostgreSQL..."
    
    cd "$PROJECT_ROOT"
    
    # Iniciar solo los servicios de base de datos
    docker-compose up -d postgres_v2 adminer_v2
    
    # Esperar a que PostgreSQL esté listo
    log "⏳ Esperando a que PostgreSQL esté listo..."
    for i in {1..30}; do
        if docker-compose exec -T postgres_v2 pg_isready -U alquileresv2_user -d alquileresv2_db &>/dev/null; then
            log "✅ PostgreSQL está listo y operativo"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log "❌ Timeout esperando PostgreSQL. Verificando logs..."
            docker-compose logs postgres_v2
            exit 1
        fi
        
        sleep 2
        echo -n "."
    done
    
    log "✅ Base de datos PostgreSQL iniciada correctamente"
    log "🌐 Adminer disponible en: http://localhost:8080"
}

# Función para preparar entorno virtual
prepare_venv() {
    log "🐍 Preparando entorno virtual de Python..."
    
    cd "$PROJECT_ROOT"
    
    # Crear entorno virtual si no existe
    if [ ! -d "venv_scripts" ]; then
        log "📦 Creando entorno virtual..."
        python3 -m venv venv_scripts
    fi
    
    # Activar entorno virtual
    source venv_scripts/bin/activate
    
    # Actualizar pip
    log "🔄 Actualizando pip..."
    pip install --upgrade pip &>/dev/null
    
    # Instalar dependencias
    log "📦 Instalando/actualizando dependencias de Python..."
    cd backend
    pip install -r requirements.txt &>/dev/null
    cd ..
    
    log "✅ Entorno virtual preparado y dependencias instaladas"
}

# Función para iniciar backend
start_backend() {
    log "🚀 Iniciando Backend API (FastAPI)..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Activar entorno virtual
    source ../venv_scripts/bin/activate
    
    # Configurar variables de entorno
    export DATABASE_URL="postgresql://alquileresv2_user:alquileresv2_pass@localhost:5432/alquileresv2_db"
    export DEBUG="true"
    export CORS_ORIGINS="http://localhost:3000,http://localhost:8000"
    
    # Iniciar backend en segundo plano
    nohup uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    # Verificar que el backend esté funcionando
    log "⏳ Esperando a que el Backend API esté listo..."
    for i in {1..20}; do
        if curl -s http://localhost:8000/health &>/dev/null || curl -s http://localhost:8000/ &>/dev/null; then
            log "✅ Backend API está listo y operativo"
            break
        fi
        
        if [ $i -eq 20 ]; then
            log "❌ Timeout esperando Backend API. Verificando logs..."
            tail -20 ../logs/backend.log
            exit 1
        fi
        
        sleep 3
        echo -n "."
    done
    
    log "✅ Backend API iniciado correctamente"
    log "🌐 API disponible en: http://localhost:8000"
    log "📚 Documentación disponible en: http://localhost:8000/docs"
}

# Función para iniciar frontend
start_frontend() {
    log "🌐 Iniciando Frontend Web..."
    
    cd "$PROJECT_ROOT/frontend"
    
    # Verificar que el archivo index.html existe
    if [ ! -f "index.html" ]; then
        log "❌ Archivo index.html no encontrado en el directorio frontend"
        exit 1
    fi
    
    # Iniciar servidor web simple en segundo plano
    nohup python3 -m http.server 3000 --bind 0.0.0.0 > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    # Verificar que el frontend esté funcionando
    log "⏳ Esperando a que el Frontend Web esté listo..."
    for i in {1..10}; do
        if curl -s http://localhost:3000/ &>/dev/null; then
            log "✅ Frontend Web está listo y operativo"
            break
        fi
        
        if [ $i -eq 10 ]; then
            log "❌ Timeout esperando Frontend Web"
            exit 1
        fi
        
        sleep 2
        echo -n "."
    done
    
    log "✅ Frontend Web iniciado correctamente"
    log "🌐 Interfaz web disponible en: http://localhost:3000"
}

# Función para mostrar resumen final
show_summary() {
    echo ""
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║              ✅ SISTEMA INICIADO EXITOSAMENTE ✅             ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    echo -e "${CYAN}🌐 SERVICIOS DISPONIBLES:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "🚀 ${BLUE}Backend API:${NC}       http://localhost:8000"
    echo -e "📚 ${BLUE}Documentación:${NC}     http://localhost:8000/docs"
    echo -e "🌐 ${BLUE}Frontend Web:${NC}      http://localhost:3000"
    echo -e "🗄️  ${BLUE}Adminer (BD):${NC}      http://localhost:8080"
    echo ""
    
    echo -e "${CYAN}📊 INFORMACIÓN DE CONEXIÓN A BD:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "🏠 ${BLUE}Host:${NC}              localhost"
    echo -e "🔌 ${BLUE}Puerto:${NC}            5432"
    echo -e "🗄️  ${BLUE}Base de datos:${NC}     alquileresv2_db"
    echo -e "👤 ${BLUE}Usuario:${NC}           alquileresv2_user"
    echo -e "🔑 ${BLUE}Contraseña:${NC}        alquileresv2_pass"
    echo ""
    
    echo -e "${CYAN}📁 ARCHIVOS DE LOG:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "📋 ${BLUE}Sistema:${NC}           $LOG_FILE"
    echo -e "🚀 ${BLUE}Backend:${NC}           $PROJECT_ROOT/logs/backend.log"
    echo -e "🌐 ${BLUE}Frontend:${NC}          $PROJECT_ROOT/logs/frontend.log"
    echo ""
    
    echo -e "${CYAN}🛑 PARA DETENER EL SISTEMA:${NC}"
    echo "────────────────────────────────────────────────────────────────"
    echo -e "💡 ${BLUE}Ejecutar:${NC}          ./stop_total_system.sh"
    echo ""
    
    log "✅ Sistema completamente iniciado y operativo"
    log "📋 Todos los servicios están funcionando correctamente"
}

# Función para cleanup en caso de error
cleanup_on_error() {
    log "❌ Error detectado. Realizando limpieza..."
    
    # Matar procesos si existen
    if [ -f "$PROJECT_ROOT/logs/backend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/logs/backend.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/logs/backend.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/logs/frontend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/logs/frontend.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/logs/frontend.pid"
    fi
    
    # Detener contenedores Docker
    cd "$PROJECT_ROOT"
    docker-compose down 2>/dev/null || true
    
    log "🧹 Limpieza completada"
    exit 1
}

# Trap para cleanup en caso de error
trap cleanup_on_error ERR

# FUNCIÓN PRINCIPAL
main() {
    show_banner
    
    log "🏁 Iniciando secuencia de arranque completo del sistema..."
    
    # Verificaciones previas
    check_dependencies
    check_ports
    
    # Inicialización de servicios
    start_database
    prepare_venv
    start_backend
    start_frontend
    
    # Resumen final
    show_summary
    
    log "🎉 Inicialización total completada exitosamente"
}

# Ejecutar función principal
main "$@"
