#!/bin/bash

# deploy.sh - Script para deployment del sistema AlugueisV1
set -euo pipefail

echo "🚀 Script de Deployment AlugueisV1"
echo "================================"

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado. Ejecuta ./install.sh primero."
    exit 1
fi

# Leer configuración del .env
source .env

echo "📋 Configuración detectada:"
echo "   USE_TRAEFIK: ${USE_TRAEFIK:-false}"
if [ "${USE_TRAEFIK:-false}" = "true" ]; then
    echo "   Frontend: https://${FRONTEND_DOMAIN}"
    echo "   Backend:  https://${BACKEND_DOMAIN}"
else
    echo "   Frontend: http://192.168.0.7:3000"
    echo "   Backend:  http://192.168.0.7:8000"
fi
echo ""

# Función para verificar si la red externa existe
check_external_network() {
    if ! docker network ls | grep -q "kronos-net"; then
        echo "⚠️  Red 'kronos-net' no encontrada. Creándola..."
        docker network create kronos-net
        echo "✅ Red 'kronos-net' creada"
    else
        echo "✅ Red 'kronos-net' encontrada"
    fi
}

# Función para deployment con Traefik
deploy_with_traefik() {
    echo "🔒 Deployando con Traefik remoto..."
    check_external_network
    
    echo "📦 Construyendo y iniciando servicios..."
    docker-compose build --no-cache
    docker-compose up -d
    
    echo ""
    echo "✅ Deployment con Traefik completado!"
    echo "🌐 Frontend: https://${FRONTEND_DOMAIN}"
    echo "🔌 Backend:  https://${BACKEND_DOMAIN}"
    echo ""
    echo "📝 Asegúrate de que:"
    echo "   - Traefik esté corriendo y configurado"
    echo "   - Los registros DNS apunten a este servidor"
    echo "   - Los certificados SSL estén configurados"
}

# Función para deployment local
deploy_local() {
    echo "🏠 Deployando en modo local..."
    
    echo "📦 Construyendo y iniciando servicios..."
    docker-compose build --no-cache
    docker-compose up -d
    
    echo ""
    echo "✅ Deployment local completado!"
    echo "🌐 Frontend: http://192.168.0.7:3000"
    echo "🔌 Backend:  http://192.168.0.7:8000"
    echo "🗃️  Adminer:  http://192.168.0.7:8080"
}

# Función para mostrar logs
show_logs() {
    echo "📋 Mostrando logs de los servicios..."
    docker-compose logs --tail=50 -f
}

# Función para detener servicios
stop_services() {
    echo "🛑 Deteniendo servicios..."
    if [ "${USE_TRAEFIK:-false}" = "true" ]; then
        docker-compose -f docker-compose.yml -f docker-compose.traefik.yml down
    else
        docker-compose down
    fi
    echo "✅ Servicios detenidos"
}

# Función para mostrar estado
show_status() {
    echo "📊 Estado de los servicios:"
    docker-compose ps
}

# Menú principal
case "${1:-deploy}" in
    "deploy")
        if [ "${USE_TRAEFIK:-false}" = "true" ]; then
            deploy_with_traefik
        else
            deploy_local
        fi
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        stop_services
        ;;
    "status")
        show_status
        ;;
    "help"|"--help"|"-h")
        echo "Uso: $0 [comando]"
        echo ""
        echo "Comandos disponibles:"
        echo "  deploy  - Deployar el sistema (default)"
        echo "  logs    - Mostrar logs de los servicios"
        echo "  stop    - Detener todos los servicios"
        echo "  status  - Mostrar estado de los servicios"
        echo "  help    - Mostrar esta ayuda"
        ;;
    *)
        echo "❌ Comando desconocido: $1"
        echo "Usa '$0 help' para ver comandos disponibles"
        exit 1
        ;;
esac
