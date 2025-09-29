#!/bin/bash

# Script para servir el frontend optimizado del Sistema de Alquileres V2

echo "🚀 Iniciando Frontend Optimizado - Sistema de Alquileres V2"
echo "=================================================="

# Verificar si Python3 está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python3 no está instalado"
    exit 1
fi

# Cambiar al directorio del frontend optimizado
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Directorio: $PWD"
echo "🌐 Servidor: http://192.168.0.7:3000"
echo "⚡ Presiona Ctrl+C para detener el servidor"
echo ""

# Iniciar servidor HTTP com no-cache
python3 serve.py

echo ""
echo "🛑 Servidor detenido"
