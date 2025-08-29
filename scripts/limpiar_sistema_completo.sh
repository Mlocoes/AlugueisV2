#!/bin/bash

# Script de limpieza completa del sistema
echo "=== INICIANDO LIMPIEZA COMPLETA DEL SISTEMA ==="
echo "Fecha: $(date)"

# Crear log de la limpieza
LOG_FILE="LIMPIEZA_$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "Iniciando limpieza del sistema SistemaAlquileresV2..."

# 1. Eliminar archivos de prueba del frontend
echo "1. Eliminando archivos de prueba del frontend..."
rm -f frontend/test*.html
rm -f test_*.html
rm -f test.txt

# 2. Eliminar logs antiguos (mantener solo el actual)
echo "2. Eliminando logs antiguos..."
find . -name "*.log" -not -name "$LOG_FILE" -type f -delete
rm -f backend.log

# 3. Eliminar archivos temporales y cache
echo "3. Eliminando archivos temporales y cache..."
rm -rf cache/*
rm -rf logs/*
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete
find . -name "*.pyo" -delete

# 4. Eliminar entornos virtuales (se pueden recrear)
echo "4. Eliminando entornos virtuales (se pueden recrear)..."
rm -rf venv_scripts/
rm -rf backend/venv/

# 5. Eliminar archivos de datos de ejemplo innecesarios
echo "5. Eliminando archivos de datos de ejemplo innecesarios..."
rm -f Dados2025.xlsx
rm -f Exemplo_Estructura_Final.xlsx
rm -f Ejemplo_Estructura_Simple.xlsx
rm -f Modelo.xlsx

# 6. Eliminar scripts de análisis temporales
echo "6. Eliminando scripts de análisis temporales..."
rm -f analizar_base2025.py
rm -f test_base2025_import.sh

# 7. Limpiar directorio uploads de archivos temporales
echo "7. Limpiando directorio uploads..."
find uploads/ -type f -name "*.tmp" -delete 2>/dev/null
find uploads/ -type f -name "temp_*" -delete 2>/dev/null

# 8. Eliminar documentación redundante (mantener solo esenciales)
echo "8. Eliminando documentación redundante..."
rm -f docs/temp_*.md 2>/dev/null
rm -f docs/old_*.md 2>/dev/null

# 9. Eliminar archivos de configuración temporales
echo "9. Eliminando archivos de configuración temporales..."
find . -name "*.tmp" -delete
find . -name "*.bak" -delete
find . -name "*~" -delete

# 10. Limpiar node_modules si existe
echo "10. Eliminando node_modules si existe..."
rm -rf frontend/node_modules/ 2>/dev/null

echo "=== LIMPIEZA COMPLETADA ==="
echo "Archivos esenciales preservados:"
echo "- docker-compose.yml"
echo "- Base2025.xlsx (archivo de datos principal)"
echo "- Scripts de gestión del sistema"
echo "- Código fuente del backend y frontend"
echo "- Documentación esencial"

echo ""
echo "Espacio liberado:"
du -sh . 
echo ""
echo "Log de limpieza guardado en: $LOG_FILE"
