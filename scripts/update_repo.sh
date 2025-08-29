#!/bin/bash
# Script para gestionar actualizaciones del repositorio Git
# Sistema de Alquileres V2

echo "🔄 Gestor de Actualizaciones - Sistema de Alquileres V2"
echo "======================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Funciones de utilidad
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
highlight() { echo -e "${PURPLE}🔥 $1${NC}"; }

# Variables del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Función para mostrar ayuda
show_help() {
    echo "📋 Uso: $0 [opciones] [mensaje_commit]"
    echo ""
    echo "Opciones:"
    echo "  -h, --help              Mostrar esta ayuda"
    echo "  -q, --quick             Actualización rápida (add, commit, push)"
    echo "  -s, --status            Ver estado del repositorio"
    echo "  -l, --log               Ver historial de commits"
    echo "  -p, --pull              Actualizar desde GitHub"
    echo "  -f, --force             Forzar push (usar con cuidado)"
    echo "  -d, --dry-run           Simular sin ejecutar cambios"
    echo "  -v, --verbose           Modo detallado"
    echo ""
    echo "Ejemplos:"
    echo "  $0 \"Agregar nueva funcionalidad\""
    echo "  $0 -q \"Fix: Corrección rápida\""
    echo "  $0 -s                    # Ver estado"
    echo "  $0 -p                    # Actualizar desde GitHub"
    echo ""
    echo "🏷️ Prefijos recomendados para commits:"
    echo "  ✨ feat: Nueva funcionalidad"
    echo "  🐛 fix: Corrección de bugs"
    echo "  📚 docs: Actualización de documentación"
    echo "  🎨 style: Cambios de formato/estilo"
    echo "  ♻️ refactor: Refactorización de código"
    echo "  ⚡ perf: Mejoras de rendimiento"
    echo "  🧪 test: Agregar o actualizar tests"
    echo "  🔧 chore: Tareas de mantenimiento"
}

# Verificar si estamos en un repositorio Git
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "No estás en un repositorio Git"
        echo "Ejecuta: git init"
        exit 1
    fi
}

# Verificar configuración de Git
check_git_config() {
    if [ -z "$(git config user.name)" ] || [ -z "$(git config user.email)" ]; then
        warning "Git no está configurado completamente"
        echo ""
        echo "Configura Git con:"
        echo "git config --global user.name \"Tu Nombre\""
        echo "git config --global user.email \"tu-email@ejemplo.com\""
        echo ""
        read -p "¿Quieres configurarlo ahora? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Nombre: " name
            read -p "Email: " email
            git config --global user.name "$name"
            git config --global user.email "$email"
            success "Git configurado correctamente"
        else
            exit 1
        fi
    fi
}

# Ver estado del repositorio
show_status() {
    info "Estado del repositorio:"
    echo ""
    
    # Información básica
    echo "🏷️ Rama actual: $(git branch --show-current)"
    echo "📊 Último commit: $(git log -1 --pretty=format:'%h - %s (%cr)' 2>/dev/null || echo 'Sin commits')"
    
    # Remote info
    if git remote get-url origin >/dev/null 2>&1; then
        echo "🔗 Remote: $(git remote get-url origin)"
    else
        warning "No hay remote configurado"
    fi
    
    echo ""
    
    # Estado de archivos
    if git diff --quiet && git diff --cached --quiet; then
        if [ -z "$(git status --porcelain)" ]; then
            success "Repositorio limpio - Sin cambios pendientes"
        else
            warning "Archivos sin seguimiento encontrados"
            git status --porcelain | grep "^??" | sed 's/^??/  📄/'
        fi
    else
        info "Cambios detectados:"
        git status --short | while IFS= read -r line; do
            case "${line:0:2}" in
                "M ") echo "  📝 Modificado: ${line:3}" ;;
                "A ") echo "  ➕ Agregado: ${line:3}" ;;
                "D ") echo "  ❌ Eliminado: ${line:3}" ;;
                "R ") echo "  🔄 Renombrado: ${line:3}" ;;
                "??") echo "  📄 Sin seguimiento: ${line:3}" ;;
                *) echo "  $line" ;;
            esac
        done
    fi
    
    echo ""
    
    # Información de sincronización
    if git remote get-url origin >/dev/null 2>&1; then
        local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
        local behind=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")
        
        if [ "$ahead" -gt 0 ] && [ "$behind" -gt 0 ]; then
            warning "Tu rama está $ahead commits adelante y $behind commits atrás del remote"
        elif [ "$ahead" -gt 0 ]; then
            highlight "Tu rama está $ahead commits adelante del remote"
        elif [ "$behind" -gt 0 ]; then
            warning "Tu rama está $behind commits atrás del remote"
        else
            success "Tu rama está sincronizada con el remote"
        fi
    fi
}

# Ver historial de commits
show_log() {
    info "Últimos 10 commits:"
    echo ""
    git log --oneline --graph --decorate -10 2>/dev/null || echo "Sin commits en el repositorio"
}

# Actualizar desde GitHub
pull_updates() {
    info "Actualizando desde GitHub..."
    
    if ! git remote get-url origin >/dev/null 2>&1; then
        error "No hay remote configurado"
        echo "Configura primero: git remote add origin <URL>"
        return 1
    fi
    
    # Verificar si hay cambios locales
    if ! git diff --quiet || ! git diff --cached --quiet; then
        warning "Hay cambios locales sin commit"
        echo ""
        read -p "¿Quieres hacer commit de estos cambios primero? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            quick_commit "WIP: Cambios antes de pull"
        else
            echo "Continuando con pull..."
        fi
    fi
    
    git fetch origin
    git pull origin $(git branch --show-current)
    
    if [ $? -eq 0 ]; then
        success "Actualización completada"
    else
        error "Error durante la actualización"
        echo "Posibles soluciones:"
        echo "- Resolver conflictos si existen"
        echo "- Verificar conexión a internet"
        echo "- Revisar autenticación con GitHub"
    fi
}

# Commit rápido
quick_commit() {
    local commit_msg="$1"
    
    if [ -z "$commit_msg" ]; then
        commit_msg="Update: $(date '+%Y-%m-%d %H:%M')"
    fi
    
    info "Realizando commit rápido..."
    
    # Agregar todos los archivos
    git add .
    
    # Mostrar lo que se va a commitear
    if [ "$VERBOSE" = true ]; then
        echo ""
        info "Archivos a commitear:"
        git diff --cached --name-status | while IFS= read -r line; do
            echo "  $line"
        done
        echo ""
    fi
    
    # Hacer commit
    git commit -m "$commit_msg"
    
    if [ $? -eq 0 ]; then
        success "Commit realizado: $commit_msg"
        return 0
    else
        warning "No hay cambios para commitear o error en el commit"
        return 1
    fi
}

# Push al repositorio
push_changes() {
    info "Subiendo cambios a GitHub..."
    
    if ! git remote get-url origin >/dev/null 2>&1; then
        error "No hay remote configurado"
        echo "Configura primero con: ./run_script.sh setup-github"
        return 1
    fi
    
    local current_branch=$(git branch --show-current)
    
    if [ "$FORCE_PUSH" = true ]; then
        warning "Realizando push forzado..."
        git push --force-with-lease origin "$current_branch"
    else
        git push origin "$current_branch"
    fi
    
    if [ $? -eq 0 ]; then
        success "Cambios subidos exitosamente"
        
        # Mostrar URL del repositorio
        local repo_url=$(git remote get-url origin | sed 's/\.git$//')
        if [[ $repo_url == git@* ]]; then
            repo_url=$(echo "$repo_url" | sed 's/git@github.com:/https:\/\/github.com\//')
        fi
        echo "🔗 Ver en GitHub: $repo_url"
        
    else
        error "Error al subir cambios"
        echo ""
        echo "Posibles soluciones:"
        echo "1. Verificar autenticación: ./run_script.sh fix-github"
        echo "2. Actualizar primero: $0 -p"
        echo "3. Forzar push (cuidado): $0 -f"
        return 1
    fi
}

# Actualización completa
full_update() {
    local commit_msg="$1"
    
    info "Iniciando actualización completa..."
    echo ""
    
    # 1. Verificar estado
    show_status
    echo ""
    
    # 2. Confirmar cambios
    if [ -z "$(git status --porcelain)" ]; then
        warning "No hay cambios para actualizar"
        return 0
    fi
    
    # 3. Mostrar cambios si está en modo verbose
    if [ "$VERBOSE" = true ]; then
        info "Cambios detectados:"
        git status --short
        echo ""
    fi
    
    # 4. Confirmar con el usuario
    if [ "$DRY_RUN" = true ]; then
        highlight "Modo dry-run: Simulando cambios..."
        echo "Se ejecutaría:"
        echo "  git add ."
        echo "  git commit -m \"$commit_msg\""
        echo "  git push origin $(git branch --show-current)"
        return 0
    fi
    
    if [ "$QUICK_MODE" != true ]; then
        echo "📋 Resumen de cambios:"
        git status --short | head -10
        if [ $(git status --porcelain | wc -l) -gt 10 ]; then
            echo "  ... y $(( $(git status --porcelain | wc -l) - 10 )) archivos más"
        fi
        echo ""
        read -p "¿Continuar con la actualización? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Actualización cancelada"
            return 0
        fi
    fi
    
    # 5. Realizar commit
    if quick_commit "$commit_msg"; then
        echo ""
        # 6. Push cambios
        push_changes
    else
        error "Error en el commit"
        return 1
    fi
}

# Procesamiento de argumentos
QUICK_MODE=false
VERBOSE=false
DRY_RUN=false
FORCE_PUSH=false
ACTION=""
COMMIT_MSG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -q|--quick)
            QUICK_MODE=true
            shift
            ;;
        -s|--status)
            ACTION="status"
            shift
            ;;
        -l|--log)
            ACTION="log"
            shift
            ;;
        -p|--pull)
            ACTION="pull"
            shift
            ;;
        -f|--force)
            FORCE_PUSH=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            if [ -z "$COMMIT_MSG" ]; then
                COMMIT_MSG="$1"
            else
                COMMIT_MSG="$COMMIT_MSG $1"
            fi
            shift
            ;;
    esac
done

# Función principal
main() {
    # Verificaciones iniciales
    check_git_repo
    check_git_config
    
    # Cambiar al directorio del proyecto
    cd "$PROJECT_ROOT"
    
    # Ejecutar acción específica
    case "$ACTION" in
        "status")
            show_status
            ;;
        "log")
            show_log
            ;;
        "pull")
            pull_updates
            ;;
        *)
            # Actualización normal
            if [ -z "$COMMIT_MSG" ]; then
                if [ "$QUICK_MODE" = true ]; then
                    COMMIT_MSG="Quick update: $(date '+%Y-%m-%d %H:%M')"
                else
                    echo "📝 Introduce un mensaje para el commit:"
                    read -p "Mensaje: " COMMIT_MSG
                    if [ -z "$COMMIT_MSG" ]; then
                        error "Mensaje de commit requerido"
                        exit 1
                    fi
                fi
            fi
            
            full_update "$COMMIT_MSG"
            ;;
    esac
}

# Ejecutar función principal
main "$@"
