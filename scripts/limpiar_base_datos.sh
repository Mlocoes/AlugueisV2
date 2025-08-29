#!/bin/bash
#
# SCRIPT DE LIMPIEZA COMPLETA DE BASE DE DATOS - V2
# Sistema de Alquileres V2
# Creado: 26 de Julio 2025
# 
# Este script elimina completamente todos los datos de la base de datos
# y reinicia el sistema desde cero
#

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}$1${NC}"
}

# Función para mostrar el header
show_header() {
    clear
    log_header "=============================================="
    log_header "   LIMPIEZA COMPLETA DE BASE DE DATOS V2"
    log_header "   Sistema de Alquileres - Reset Total"
    log_header "=============================================="
    echo
}

# Función para confirmar la acción
confirm_action() {
    echo -e "${RED}⚠️  ADVERTENCIA CRÍTICA ⚠️${NC}"
    echo
    echo "Esta operación eliminará PERMANENTEMENTE:"
    echo "  • Todos los alquileres registrados"
    echo "  • Todos los inmuebles"
    echo "  • Todos los propietarios"
    echo "  • Todas las participaciones"
    echo "  • Todos los datos mensuales"
    echo "  • Logs y cache del sistema"
    echo
    echo -e "${YELLOW}Esta acción NO se puede deshacer.${NC}"
    echo
    
    read -p "¿Está ABSOLUTAMENTE SEGURO? Escriba 'ELIMINAR TODO' para confirmar: " confirmation
    
    if [ "$confirmation" != "ELIMINAR TODO" ]; then
        log_error "Operación cancelada por el usuario"
        exit 1
    fi
    
    echo
    log_warning "Confirmación recibida. Iniciando limpieza en 5 segundos..."
    echo "Presione Ctrl+C para cancelar ahora..."
    sleep 5
}

# Función para detener servicios
stop_services() {
    log_info "Deteniendo servicios del sistema..."
    
    # Detener backend si está ejecutándose
    pkill -f "python.*main.py" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    
    sleep 2
    log_success "Servicios detenidos"
}

# Función para verificar conexión a base de datos
check_database() {
    log_info "Verificando conexión a PostgreSQL..."
    
    # Verificar que el contenedor esté ejecutándose
    if ! docker ps | grep -q "alquileresv2_postgres"; then
        log_error "El contenedor PostgreSQL no está ejecutándose"
        log_info "Iniciando PostgreSQL..."
        docker compose up -d postgres_v2
        sleep 10
    fi
    
    # Verificar conexión
    if docker exec alquileresv2_postgres psql -U alquileresv2_user -d alquileresv2_db -c "SELECT 1;" >/dev/null 2>&1; then
        log_success "Conexión a PostgreSQL establecida"
    else
        log_error "No se puede conectar a PostgreSQL"
        exit 1
    fi
}

# Función para limpiar todas las tablas
clean_database_tables() {
    log_info "Limpiando todas las tablas de la base de datos..."
    
    # Script SQL para limpiar todo
    SQL_SCRIPT="
-- Deshabilitar verificaciones de clave foránea temporalmente
SET session_replication_role = replica;

-- Limpiar todas las tablas principales en orden correcto (relaciones)
DELETE FROM alquileres_simple;
DELETE FROM participaciones;
DELETE FROM inmuebles;
DELETE FROM propietarios;

-- Limpiar tablas auxiliares/logs
DELETE FROM log_importaciones_simple;

-- Resetear todas las secuencias
ALTER SEQUENCE IF EXISTS alquileres_simple_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS inmuebles_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS propietarios_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS participaciones_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS log_importaciones_simple_id_seq RESTART WITH 1;

-- Re-habilitar verificaciones de clave foránea
SET session_replication_role = DEFAULT;

-- Verificar limpieza
SELECT 'VERIFICACION DE LIMPIEZA' as status;
SELECT 'alquileres_simple' as tabla, COUNT(*) as registros FROM alquileres_simple
UNION ALL
SELECT 'inmuebles' as tabla, COUNT(*) as registros FROM inmuebles
UNION ALL
SELECT 'propietarios' as tabla, COUNT(*) as registros FROM propietarios
UNION ALL
SELECT 'participaciones' as tabla, COUNT(*) as registros FROM participaciones
UNION ALL
SELECT 'log_importaciones_simple' as tabla, COUNT(*) as registros FROM log_importaciones_simple;
SELECT 'participaciones' as tabla, COUNT(*) as registros FROM participaciones;
"
    
    # Ejecutar limpieza
    if docker exec alquileresv2_postgres psql -U alquileresv2_user -d alquileresv2_db -c "$SQL_SCRIPT"; then
        log_success "Base de datos limpiada exitosamente"
    else
        log_error "Error al limpiar la base de datos"
        exit 1
    fi
}

# Función para limpiar archivos del sistema
clean_system_files() {
    log_info "Limpiando archivos del sistema..."
    
    # Limpiar logs
    rm -rf logs/*.log 2>/dev/null || true
    rm -rf backend/*.log 2>/dev/null || true
    rm -rf backend.log 2>/dev/null || true
    
    # Limpiar cache
    rm -rf cache/* 2>/dev/null || true
    rm -rf __pycache__ 2>/dev/null || true
    rm -rf backend/__pycache__ 2>/dev/null || true
    
    # Limpiar uploads temporales
    find uploads/ -name "*.tmp" -delete 2>/dev/null || true
    find uploads/ -name "*.temp" -delete 2>/dev/null || true
    
    log_success "Archivos del sistema limpiados"
}

# Función para verificar que todo esté limpio
# Función para mostrar estadísticas de la base de datos
show_database_stats() {
    local TITLE="$1"
    log_info "$TITLE"
    echo "=================================================="
    
    # Consultar estadísticas de todas las tablas
    docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "
        SELECT 
            'Propietarios: ' || COUNT(*) 
        FROM propietarios
        UNION ALL
        SELECT 
            'Inmuebles: ' || COUNT(*) 
        FROM inmuebles
        UNION ALL
        SELECT 
            'Alquileres Simple: ' || COUNT(*) 
        FROM alquileres_simple
        UNION ALL
        SELECT 
            'Participaciones: ' || COUNT(*) 
        FROM participaciones
        UNION ALL
        SELECT 
            'Logs de Importación: ' || COUNT(*) 
        FROM log_importaciones_simple
    " | while read line; do
        echo "  $line"
    done
    
    echo "=================================================="
}

# Función para verificar limpieza
verify_cleanup() {
    log_info "Verificando que la base de datos esté completamente limpia..."
    
    local TOTAL_RECORDS=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "
        SELECT 
            (SELECT COUNT(*) FROM participaciones) + 
            (SELECT COUNT(*) FROM log_importaciones_simple)
    " | tr -d ' 
')
    
    if [ "$TOTAL_RECORDS" -eq 0 ]; then
        log_success "Verificación exitosa: Base de datos completamente limpia"
    else
        log_error "Verificación falló: Aún hay $TOTAL_RECORDS registros en la base"
        exit 1
    fi
}

# Función para reiniciar servicios
restart_services() {
    log_info "Reiniciando servicios..."
    
    # Asegurar que PostgreSQL esté ejecutándose
    docker compose up -d postgres_v2 adminer_v2
    sleep 5
    
    # Iniciar backend en segundo plano
    cd backend
    nohup bash -c 'source venv/bin/activate && python main.py' > ../backend.log 2>&1 &
    cd ..
    
    # Esperar a que el backend esté listo
    sleep 10
    
    # Verificar que el backend responda
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        log_success "Backend iniciado correctamente"
    else
        log_warning "Backend puede tardar un poco más en estar listo"
    fi
    
    log_success "Servicios reiniciados"
}

# Función para mostrar resumen final
show_summary() {
    echo
    log_header "=============================================="
    log_header "         LIMPIEZA COMPLETADA CON ÉXITO"
    log_header "=============================================="
    echo
    log_success "✅ Base de datos completamente limpia"
    log_success "✅ Archivos del sistema limpiados"
    log_success "✅ Secuencias de IDs resetadas"
    log_success "✅ Servicios reiniciados"
    echo
    log_info "El sistema está listo para:"
    echo "  • Importar nuevos inmuebles desde Base2025.xlsx"
    echo "  • Cargar alquileres desde archivos Excel"
    echo "  • Crear nuevos propietarios"
    echo "  • Generar reportes desde cero"
    echo
    log_info "Acceso al sistema:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:8000"
    echo "  • Adminer: http://localhost:8080"
    echo
    log_header "=============================================="
}

# FUNCIÓN PRINCIPAL
main() {
    show_header
    confirm_action
    
    echo
    log_info "Iniciando proceso de limpieza completa..."
    
    # Mostrar estadísticas antes de la limpieza
    stop_services
    check_database
    show_database_stats "📊 ESTADÍSTICAS ANTES DE LA LIMPIEZA"
    
    # Ejecutar limpieza
    clean_database_tables
    clean_system_files
    
    # Mostrar estadísticas después de la limpieza
    show_database_stats "🧹 ESTADÍSTICAS DESPUÉS DE LA LIMPIEZA"
    verify_cleanup
    restart_services
    
    show_summary
}

# Ejecutar función principal
main "$@"
