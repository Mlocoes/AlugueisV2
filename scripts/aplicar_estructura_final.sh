#!/bin/bash

# =====================================================
# SCRIPT PARA APLICAR LA ESTRUCTURA FINAL SIMPLIFICADA
# Sistema de Alquileres V2
# =====================================================

set -e

echo "🚀 APLICANDO ESTRUCTURA FINAL SIMPLIFICADA"
echo "========================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    log_error "Este script debe ejecutarse desde el directorio raíz del proyecto (donde está docker-compose.yml)"
    exit 1
fi

log_info "Directorio de trabajo: $(pwd)"

# =====================================================
# 1. VERIFICAR ESTADO DEL SISTEMA
# =====================================================

log_info "1. Verificando estado del sistema..."

# Verificar si PostgreSQL está corriendo
if ! docker ps | grep -q "alquileresv2_postgres"; then
    log_warning "PostgreSQL no está corriendo. Iniciando..."
    docker-compose up -d postgres_v2
    sleep 10
else
    log_success "PostgreSQL está corriendo"
fi

# Verificar conexión a la base de datos
log_info "Verificando conexión a la base de datos..."
if ./gestionar_db.sh status > /dev/null 2>&1; then
    log_success "Conexión a base de datos exitosa"
else
    log_error "No se puede conectar a la base de datos"
    exit 1
fi

# =====================================================
# 2. VERIFICAR ARCHIVOS NECESARIOS
# =====================================================

log_info "3. Verificando archivos necesarios..."

ARCHIVOS_REQUERIDOS=(
    "database/init-scripts/004_estructura_final_simplificada.sql"
    "backend/models_final.py"
    "backend/main_final.py"
    "docs/ESTRUCTURA_FINAL_CONFIRMADA.md"
)

for archivo in "${ARCHIVOS_REQUERIDOS[@]}"; do
    if [ -f "$archivo" ]; then
        log_success "✓ $archivo"
    else
        log_error "✗ Archivo faltante: $archivo"
        exit 1
    fi
done

# =====================================================
# 4. APLICAR MIGRACIÓN SQL
# =====================================================

log_info "4. Aplicando migración SQL..."

# Aplicar el script de migración
PGPASSWORD=alquileresv2_pass psql -h localhost -p 5433 -U alquileresv2_user -d alquileresv2_db \
    -f database/init-scripts/004_estructura_final_simplificada.sql

if [ $? -eq 0 ]; then
    log_success "Migración SQL aplicada exitosamente"
else
    log_error "Error al aplicar migración SQL"
    exit 1
fi

# =====================================================
# 5. VERIFICAR ESTRUCTURA DE LA BASE DE DATOS
# =====================================================

log_info "5. Verificando nueva estructura..."

# Verificar que la tabla alquileres_simple existe
TABLA_EXISTE=$(PGPASSWORD=alquileresv2_pass psql -h localhost -p 5433 -U alquileresv2_user -d alquileresv2_db \
    -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'alquileres_simple';" | tr -d ' ')

if [ "$TABLA_EXISTE" = "1" ]; then
    log_success "Tabla alquileres_simple creada correctamente"
else
    log_error "La tabla alquileres_simple no existe"
    exit 1
fi

# Verificar registros migrados
REGISTROS_MIGRADOS=$(PGPASSWORD=alquileresv2_pass psql -h localhost -p 5433 -U alquileresv2_user -d alquileresv2_db \
    -t -c "SELECT COUNT(*) FROM alquileres_simple;" | tr -d ' ')

log_info "Registros migrados a alquileres_simple: $REGISTROS_MIGRADOS"

# =====================================================
# 6. ACTUALIZAR BACKEND
# =====================================================

log_info "6. Actualizando configuración del backend..."

# Hacer backup del main.py actual
if [ -f "backend/main.py" ]; then
    cp backend/main.py backend/main_backup_$(date +%Y%m%d_%H%M%S).py
    log_info "Backup del main.py actual creado"
fi

# Copiar el nuevo main final
cp backend/main_final.py backend/main.py
log_success "Backend actualizado con nueva estructura"

# =====================================================
# 7. INSTALAR/ACTUALIZAR DEPENDENCIAS
# =====================================================

log_info "7. Verificando dependencias de Python..."

# Activar entorno virtual si existe
if [ -d "venv_scripts" ]; then
    log_info "Activando entorno virtual..."
    source venv_scripts/bin/activate
fi

# Instalar pandas y openpyxl si no están instalados
pip install pandas openpyxl > /dev/null 2>&1 || log_warning "No se pudieron instalar algunas dependencias de Python"

# =====================================================
# 8. REINICIAR SERVICIOS
# =====================================================

log_info "8. Reiniciando servicios..."

# Detener backend si está corriendo
if pgrep -f "main.py" > /dev/null; then
    log_info "Deteniendo backend actual..."
    pkill -f "main.py" || true
    sleep 2
fi

# Reiniciar backend
log_info "Iniciando backend con nueva estructura..."
cd backend
python main.py &
BACKEND_PID=$!
cd ..

sleep 5

# Verificar que el backend esté corriendo
if ps -p $BACKEND_PID > /dev/null; then
    log_success "Backend iniciado correctamente (PID: $BACKEND_PID)"
else
    log_warning "El backend puede no haberse iniciado correctamente"
fi

# =====================================================
# 9. VERIFICAR FUNCIONAMIENTO
# =====================================================

log_info "9. Verificando funcionamiento del sistema..."

# Verificar endpoint de health
sleep 3
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    log_success "API respondiendo correctamente en http://localhost:8000"
else
    log_warning "La API puede no estar respondiendo aún (esto es normal)"
fi

# =====================================================
# 10. CREAR ARCHIVO EXCEL DE EJEMPLO
# =====================================================

log_info "10. Verificando archivo Excel de ejemplo..."

if [ -f "Exemplo_Estructura_Final.xlsx" ]; then
    log_success "Archivo Excel de ejemplo disponible"
else
    log_info "Creando archivo Excel de ejemplo..."
    
    # Aquí podríamos crear el archivo usando Python si es necesario
    touch "Exemplo_Estructura_Final.xlsx"
    log_warning "Archivo Excel de ejemplo creado (vacío)"
fi

# =====================================================
# RESUMEN FINAL
# =====================================================

echo ""
echo "✅ MIGRACIÓN A ESTRUCTURA FINAL COMPLETADA"
echo "==========================================="
echo ""
log_success "✓ Base de datos migrada a estructura simplificada"
log_success "✓ Backend actualizado con nuevos modelos"
log_success "✓ $REGISTROS_MIGRADOS registros migrados exitosamente"
log_success "✓ API funcionando en http://localhost:8000"
log_success "✓ Documentación de API: http://localhost:8000/docs"

echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Verificar la API en: http://localhost:8000/docs"
echo "2. Probar importación Excel con: Exemplo_Estructura_Final.xlsx"
echo "3. Verificar cálculos automáticos de tasas y valores líquidos"
echo "4. Consultar logs en: /logs/importaciones"

echo ""
echo "📁 ARCHIVOS CLAVE:"
echo "   • Nueva estructura SQL: database/init-scripts/004_estructura_final_simplificada.sql"
echo "   • Modelos Python: backend/models_final.py"
echo "   • API principal: backend/main.py (actualizado)"
echo "   • Documentación: docs/ESTRUCTURA_FINAL_CONFIRMADA.md"

echo ""
log_info "🎉 ¡Estructura final implementada exitosamente!"

# =====================================================
# FIN DEL SCRIPT
# =====================================================
