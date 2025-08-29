#!/bin/bash
# Script para crear releases y gestionar versiones
# Sistema de Alquileres V2

echo "🏷️ Gestor de Releases - Sistema de Alquileres V2"
echo "================================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
highlight() { echo -e "${PURPLE}🔥 $1${NC}"; }

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VERSION_FILE="$PROJECT_ROOT/VERSION"

# Obtener versión actual
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "0.1.0"
    fi
}

# Incrementar versión
increment_version() {
    local version="$1"
    local type="$2"
    
    # Separar major.minor.patch
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    local patch=$(echo "$version" | cut -d. -f3)
    
    case "$type" in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            error "Tipo de versión inválido: $type"
            return 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Crear tag y release
create_release() {
    local version="$1"
    local release_notes="$2"
    
    info "Creando release v$version..."
    
    # Crear archivo VERSION
    echo "$version" > "$VERSION_FILE"
    
    # Agregar cambios
    git add "$VERSION_FILE"
    git add .
    
    # Commit de release
    git commit -m "🚀 Release v$version

$release_notes"
    
    # Crear tag
    git tag -a "v$version" -m "Release v$version

$release_notes"
    
    # Push cambios y tags
    git push origin main
    git push origin "v$version"
    
    if [ $? -eq 0 ]; then
        success "Release v$version creado exitosamente"
        echo ""
        echo "🎉 Release v$version está listo!"
        echo "🔗 Ve a GitHub para completar el release:"
        
        # Intentar obtener URL del repositorio
        local repo_url=$(git remote get-url origin 2>/dev/null)
        if [ -n "$repo_url" ]; then
            repo_url=$(echo "$repo_url" | sed 's/\.git$//' | sed 's/git@github.com:/https:\/\/github.com\//')
            echo "   $repo_url/releases/new?tag=v$version"
        fi
        
    else
        error "Error al crear el release"
        return 1
    fi
}

# Generar notas de release automáticamente
generate_release_notes() {
    local last_tag=$(git describe --tags --abbrev=0 2>/dev/null)
    
    if [ -n "$last_tag" ]; then
        info "Generando notas desde $last_tag..."
        echo ""
        echo "📋 Cambios desde $last_tag:"
        git log --pretty=format:"- %s" "$last_tag"..HEAD | head -20
        echo ""
    else
        info "Primer release - mostrando últimos commits:"
        echo ""
        git log --pretty=format:"- %s" --max-count=10
        echo ""
    fi
}

# Mostrar información de versiones
show_version_info() {
    local current_version=$(get_current_version)
    
    echo "📊 Información de Versiones"
    echo "==========================="
    echo ""
    echo "🏷️ Versión actual: v$current_version"
    echo ""
    
    # Mostrar tags existentes
    local tags=$(git tag -l | sort -V | tail -5)
    if [ -n "$tags" ]; then
        echo "🏷️ Últimos releases:"
        echo "$tags" | while read tag; do
            local date=$(git log -1 --format=%ai "$tag" 2>/dev/null | cut -d' ' -f1)
            echo "  $tag ($date)"
        done
    else
        echo "🏷️ No hay releases previos"
    fi
    
    echo ""
    
    # Próximas versiones posibles
    echo "🔮 Próximas versiones posibles:"
    echo "  Patch: v$(increment_version "$current_version" "patch") (bug fixes)"
    echo "  Minor: v$(increment_version "$current_version" "minor") (new features)"
    echo "  Major: v$(increment_version "$current_version" "major") (breaking changes)"
}

# Menú interactivo
interactive_release() {
    local current_version=$(get_current_version)
    
    echo "🎯 Creador de Release Interactivo"
    echo "================================="
    echo ""
    echo "Versión actual: v$current_version"
    echo ""
    
    # Tipo de release
    echo "¿Qué tipo de release quieres crear?"
    echo "1. 🐛 Patch (v$(increment_version "$current_version" "patch")) - Bug fixes"
    echo "2. ✨ Minor (v$(increment_version "$current_version" "minor")) - New features"
    echo "3. 💥 Major (v$(increment_version "$current_version" "major")) - Breaking changes"
    echo "4. 🎯 Custom version"
    echo ""
    read -p "Selecciona (1-4): " -n 1 -r
    echo
    
    local new_version=""
    case $REPLY in
        1)
            new_version=$(increment_version "$current_version" "patch")
            ;;
        2)
            new_version=$(increment_version "$current_version" "minor")
            ;;
        3)
            new_version=$(increment_version "$current_version" "major")
            ;;
        4)
            read -p "Introduce la versión (ej: 1.2.3): " new_version
            ;;
        *)
            error "Opción inválida"
            return 1
            ;;
    esac
    
    echo ""
    highlight "Nueva versión: v$new_version"
    echo ""
    
    # Generar notas automáticamente
    generate_release_notes
    
    echo ""
    echo "📝 Introduce las notas del release (presiona Enter para línea vacía para terminar):"
    local release_notes=""
    while IFS= read -r line; do
        [ -z "$line" ] && break
        release_notes="${release_notes}${line}\n"
    done
    
    if [ -z "$release_notes" ]; then
        release_notes="Release v$new_version"
    fi
    
    echo ""
    echo "📋 Resumen del Release:"
    echo "======================"
    echo "Versión: v$new_version"
    echo "Notas: $(echo -e "$release_notes")"
    echo ""
    
    read -p "¿Crear el release? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_release "$new_version" "$(echo -e "$release_notes")"
    else
        info "Release cancelado"
    fi
}

# Función de ayuda
show_help() {
    echo "📋 Uso: $0 [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -h, --help              Mostrar esta ayuda"
    echo "  -i, --interactive       Modo interactivo"
    echo "  -v, --version           Mostrar información de versiones"
    echo "  -p, --patch             Crear release patch"
    echo "  -m, --minor             Crear release minor"
    echo "  -M, --major             Crear release major"
    echo "  --custom <version>      Crear release con versión custom"
    echo ""
    echo "Ejemplos:"
    echo "  $0 -i                   # Modo interactivo"
    echo "  $0 -p                   # Release patch automático"
    echo "  $0 --custom 2.0.0       # Release versión específica"
}

# Procesamiento de argumentos
case "${1:-}" in
    -h|--help)
        show_help
        ;;
    -i|--interactive)
        interactive_release
        ;;
    -v|--version)
        show_version_info
        ;;
    -p|--patch)
        current_version=$(get_current_version)
        new_version=$(increment_version "$current_version" "patch")
        create_release "$new_version" "Bug fixes and improvements"
        ;;
    -m|--minor)
        current_version=$(get_current_version)
        new_version=$(increment_version "$current_version" "minor")
        create_release "$new_version" "New features and improvements"
        ;;
    -M|--major)
        current_version=$(get_current_version)
        new_version=$(increment_version "$current_version" "major")
        create_release "$new_version" "Major release with breaking changes"
        ;;
    --custom)
        if [ -n "$2" ]; then
            create_release "$2" "Release v$2"
        else
            error "Versión requerida para --custom"
            exit 1
        fi
        ;;
    "")
        # Sin argumentos, mostrar menú
        show_version_info
        echo ""
        read -p "¿Quieres crear un nuevo release? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            interactive_release
        fi
        ;;
    *)
        error "Opción desconocida: $1"
        show_help
        exit 1
        ;;
esac
