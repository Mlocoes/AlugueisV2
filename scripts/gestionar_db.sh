#!/bin/bash

# Script avanzado de gestión    echo "Ejemplos:"
    echo "  $0 clean     # Limpiar base de datos"
    echo "  $0 status    # Ver estado"
    echo "  $0 reset     # Limpiar y mostrar estado"base de datos
# =============================================================================
# Gestor de Base de Datos - Sistema de Alquileres V2
# =============================================================================
# Descripción: Script para gestionar la base de datos del sistema
# Incluye opciones de limpieza y estado

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuración de la base de datos
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="alquileresv2_db"
DB_USER="alquileresv2_user"
DB_PASS="alquileresv2_pass"

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}🛠️  GESTOR AVANZADO DE BASE DE DATOS${NC}"
    echo "================================================="
    echo "Sistema de Alquileres V2"
    echo ""
    echo "Uso: $0 [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  clean       Vaciar la base de datos (con confirmación)"
    echo "  status      Mostrar estado actual de la base de datos"
    echo "  reset       Limpiar + Mostrar estado"
    echo "  help        Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 clean     # Limpiar base de datos"
    echo "  $0 status    # Ver estado"
    echo "  $0 reset     # Limpiar y mostrar estado"
    echo ""
}

# Función para probar conexión
test_connection() {
    echo -e "${BLUE}🔍 Probando conexión a la base de datos...${NC}"
    
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}❌ psql no está instalado${NC}"
        echo "💡 Instale PostgreSQL client: sudo apt-get install postgresql-client"
        exit 1
    fi
    
    if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Conexión exitosa${NC}"
        return 0
    else
        echo -e "${RED}❌ Error de conexión a la base de datos${NC}"
        echo "💡 Verificar que PostgreSQL esté ejecutándose"
        echo "💡 Verificar credenciales y puerto 5433"
        return 1
    fi
}

# Función para mostrar estado de la base de datos
show_status() {
    echo -e "${BLUE}📊 Estado actual de la base de datos${NC}"
    echo "======================================"
    
    # Crear script de estado
    cat > /tmp/status_db.sql << EOF
SELECT 
    'propietarios' as tabla, 
    count(*) as registros,
    pg_size_pretty(pg_total_relation_size('propietarios')) as tamaño
FROM propietarios
UNION ALL
SELECT 
    'inmuebles', 
    count(*),
    pg_size_pretty(pg_total_relation_size('inmuebles'))
FROM inmuebles
UNION ALL
SELECT 
    'participaciones', 
    count(*),
    pg_size_pretty(pg_total_relation_size('participaciones'))
FROM participaciones
UNION ALL
SELECT 
    'alquileres_mensuales', 
    count(*),
    pg_size_pretty(pg_total_relation_size('alquileres_mensuales'))
FROM alquileres_mensuales
UNION ALL
SELECT 
    'alquileres_detalle', 
    count(*),
    pg_size_pretty(pg_total_relation_size('alquileres_detalle'))
FROM alquileres_detalle
ORDER BY tabla;
EOF

    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/status_db.sql
    
    # Mostrar tamaño total de la base de datos
    echo ""
    echo "Tamaño total de la base de datos:"
    cat > /tmp/size_db.sql << EOF
SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as tamaño_total;
EOF
    
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/size_db.sql
    
    rm -f /tmp/status_db.sql /tmp/size_db.sql
}

# Función para limpiar base de datos

# Función para listar backups disponibles
list_backups() {
    ensure_backup_dir
    
    echo -e "${BLUE}📋 Backups disponibles${NC}"
    echo "====================="
    
    if ls "$BACKUP_DIR"/backup_*.sql* 1> /dev/null 2>&1; then
        for backup in "$BACKUP_DIR"/backup_*.sql*; do
            local filename=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date_str=$(echo "$filename" | sed -n 's/backup_\([0-9]\{8\}_[0-9]\{6\}\).*/\1/p')
            local formatted_date=$(echo "$date_str" | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)_\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
            
            echo "  📁 $filename"
            echo "     📅 $formatted_date"
            echo "     📏 $size"
            echo ""
        done
    else
        echo "  ℹ️  No hay backups disponibles"
    fi
}

# Función para restaurar desde backup
restore_backup() {
    ensure_backup_dir
    
    # Listar backups disponibles
    list_backups
    
    echo -e "${YELLOW}📥 Restaurar desde backup${NC}"
    echo "=========================="
    
    read -p "Ingrese el nombre del archivo de backup (con extensión): " backup_filename
    
    local backup_path="$BACKUP_DIR/$backup_filename"
    
    if [ ! -f "$backup_path" ]; then
        echo -e "${RED}❌ Archivo de backup no encontrado: $backup_path${NC}"
        return 1
    fi
    
    echo -e "${RED}⚠️  ADVERTENCIA: Esto reemplazará todos los datos actuales${NC}"
    read -p "¿Confirma la restauración? (escriba 'si' para continuar): " confirmation
    
    if [ "$confirmation" != "si" ]; then
        echo -e "${YELLOW}❌ Restauración cancelada${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📥 Restaurando base de datos...${NC}"
    
    # Si el archivo está comprimido, descomprimirlo temporalmente
    local temp_backup=""
    if [[ "$backup_path" == *.gz ]]; then
        temp_backup="/tmp/restore_temp.sql"
        echo -e "${BLUE}🗜️  Descomprimiendo backup...${NC}"
        gunzip -c "$backup_path" > "$temp_backup"
        backup_path="$temp_backup"
    fi
    
    # Restaurar la base de datos
    if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        --quiet \
        -f "$backup_path"; then
        
        echo -e "${GREEN}✅ Restauración completada exitosamente${NC}"
        
        # Limpiar archivo temporal
        if [ -n "$temp_backup" ] && [ -f "$temp_backup" ]; then
            rm -f "$temp_backup"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Error durante la restauración${NC}"
        
        # Limpiar archivo temporal
        if [ -n "$temp_backup" ] && [ -f "$temp_backup" ]; then
            rm -f "$temp_backup"
        fi
        
        return 1
    fi
}

# Función para limpiar base de datos
clean_database() {
    echo -e "${RED}⚠️  ADVERTENCIA: ACCIÓN DESTRUCTIVA ⚠️${NC}"
    echo "Este script eliminará TODOS los datos de la base de datos"
    echo "Se mantendrá la estructura de tablas"
    echo ""
    read -p "¿Confirma que quiere vaciar la base de datos? (escriba 'si' para continuar): " confirmation
    
    if [ "$confirmation" != "si" ]; then
        echo -e "${YELLOW}❌ Operación cancelada${NC}"
        return 0
    fi
    
    echo -e "${BLUE}🧹 Limpiando base de datos...${NC}"
    
    # Crear script SQL de limpieza
    cat > /tmp/clean_db.sql << EOF
-- Deshabilitar triggers temporalmente
SET session_replication_role = replica;

-- Mostrar estado antes de limpiar
SELECT 'ANTES DE LIMPIAR' as momento;
SELECT 'propietarios' as tabla, count(*) as registros FROM propietarios
UNION ALL
SELECT 'inmuebles', count(*) FROM inmuebles
UNION ALL
SELECT 'participaciones', count(*) FROM participaciones
UNION ALL
SELECT 'alquileres_mensuales', count(*) FROM alquileres_mensuales
UNION ALL
SELECT 'alquileres_detalle', count(*) FROM alquileres_detalle;

-- Limpiar tablas en orden (respetando foreign keys)
DELETE FROM alquileres_detalle;
DELETE FROM alquileres_mensuales;
DELETE FROM participaciones;
DELETE FROM inmuebles;
DELETE FROM propietarios;

-- Reiniciar secuencias
SELECT setval(pg_get_serial_sequence('propietarios', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('inmuebles', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('participaciones', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('alquileres_mensuales', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('alquileres_detalle', 'id'), 1, false);

-- Rehabilitar triggers
SET session_replication_role = DEFAULT;

-- Optimizar tablas
VACUUM ANALYZE propietarios;
VACUUM ANALYZE inmuebles;
VACUUM ANALYZE participaciones;
VACUUM ANALYZE alquileres_mensuales;
VACUUM ANALYZE alquileres_detalle;

-- Mostrar estado después de limpiar
SELECT 'DESPUÉS DE LIMPIAR' as momento;
SELECT 'propietarios' as tabla, count(*) as registros FROM propietarios
UNION ALL
SELECT 'inmuebles', count(*) FROM inmuebles
UNION ALL
SELECT 'participaciones', count(*) FROM participaciones
UNION ALL
SELECT 'alquileres_mensuales', count(*) FROM alquileres_mensuales
UNION ALL
SELECT 'alquileres_detalle', count(*) FROM alquileres_detalle;

EOF

    # Ejecutar script SQL
    if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/clean_db.sql; then
        echo -e "${GREEN}✅ Base de datos limpiada exitosamente${NC}"
    else
        echo -e "${RED}❌ Error durante la limpieza${NC}"
        rm -f /tmp/clean_db.sql
        return 1
    fi
    
    # Limpiar archivo temporal
    rm -f /tmp/clean_db.sql
    
    return 0
}

# Función para reset completo (limpiar + mostrar estado)
reset_database() {
    echo -e "${PURPLE}🔄 RESET COMPLETO DE BASE DE DATOS${NC}"
    echo "===================================="
    echo "1. Limpiar base de datos"
    echo "2. Mostrar estado final"
    echo ""
    
    read -p "¿Confirma el reset completo? (escriba 'si' para continuar): " confirmation
    
    if [ "$confirmation" != "si" ]; then
        echo -e "${YELLOW}❌ Reset cancelado${NC}"
        return 0
    fi
    
    # Paso 1: Limpiar base de datos (sin confirmación adicional)
    echo -e "${BLUE}📍 Paso 1/2: Limpiando base de datos...${NC}"
    
    # Crear script SQL de limpieza silenciosa
    cat > /tmp/reset_clean_db.sql << EOF
SET session_replication_role = replica;
DELETE FROM alquileres_detalle;
DELETE FROM alquileres_mensuales;
DELETE FROM participaciones;
DELETE FROM inmuebles;
DELETE FROM propietarios;
SELECT setval(pg_get_serial_sequence('propietarios', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('inmuebles', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('participaciones', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('alquileres_mensuales', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('alquileres_detalle', 'id'), 1, false);
SET session_replication_role = DEFAULT;
VACUUM ANALYZE propietarios;
VACUUM ANALYZE inmuebles;
VACUUM ANALYZE participaciones;
VACUUM ANALYZE alquileres_mensuales;
VACUUM ANALYZE alquileres_detalle;
EOF

    if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f /tmp/reset_clean_db.sql > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Limpieza completada${NC}"
    else
        echo -e "${RED}❌ Error durante la limpieza${NC}"
        rm -f /tmp/reset_clean_db.sql
        return 1
    fi
    
    rm -f /tmp/reset_clean_db.sql
    
    # Paso 2: Mostrar estado final
    echo -e "${BLUE}📍 Paso 2/2: Estado final${NC}"
    show_status
    
    echo ""
    echo -e "${GREEN}🎉 ¡RESET COMPLETO EXITOSO!${NC}"
    echo -e "${BLUE}🗑️  Base de datos vacía y lista para usar${NC}"
    
    return 0
}

# Función principal
main() {
    case "${1:-help}" in
        "clean")
            test_connection && clean_database
            ;;
        "status")
            test_connection && show_status
            ;;
        "reset")
            test_connection && reset_database
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@"
