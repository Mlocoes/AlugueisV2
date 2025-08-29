#!/bin/bash
# Script para solucionar problemas de autenticación con GitHub
# Sistema de Alquileres V2

echo "🔧 Solucionador de Problemas de GitHub"
echo "======================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }

# Diagnóstico completo
diagnosticar() {
    echo "🔍 Realizando diagnóstico..."
    echo ""
    
    # 1. Verificar configuración de Git
    info "1. Configuración de Git:"
    git config --global user.name && echo "   Nombre: $(git config --global user.name)" || error "   Nombre no configurado"
    git config --global user.email && echo "   Email: $(git config --global user.email)" || error "   Email no configurado"
    echo ""
    
    # 2. Verificar remotes
    info "2. Remotes configurados:"
    if git remote -v >/dev/null 2>&1; then
        git remote -v
    else
        warning "   No hay remotes configurados"
    fi
    echo ""
    
    # 3. Verificar claves SSH
    info "3. Claves SSH:"
    if [ -f "$HOME/.ssh/id_rsa.pub" ]; then
        success "   RSA key encontrada: ~/.ssh/id_rsa.pub"
    fi
    if [ -f "$HOME/.ssh/id_ed25519.pub" ]; then
        success "   ED25519 key encontrada: ~/.ssh/id_ed25519.pub"
    fi
    if [ ! -f "$HOME/.ssh/id_rsa.pub" ] && [ ! -f "$HOME/.ssh/id_ed25519.pub" ]; then
        warning "   No se encontraron claves SSH"
    fi
    echo ""
    
    # 4. Verificar conexión SSH a GitHub
    info "4. Conexión SSH a GitHub:"
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        success "   Conexión SSH exitosa"
    else
        warning "   Conexión SSH falló o no configurada"
    fi
    echo ""
    
    # 5. Verificar Git Credential Helper
    info "5. Git Credential Helper:"
    credential_helper=$(git config --global credential.helper)
    if [ -n "$credential_helper" ]; then
        echo "   Configurado: $credential_helper"
    else
        warning "   No configurado"
    fi
}

# Solución rápida con PAT
setup_pat_quick() {
    echo ""
    info "🔑 Configuración rápida con Personal Access Token"
    echo ""
    echo "1. Ve a: https://github.com/settings/tokens/new"
    echo "2. Nombre: SistemaAlquileresV2"
    echo "3. Scopes: ✅ repo"
    echo "4. Generate token"
    echo ""
    read -p "Introduce tu token: " -s token
    echo ""
    
    if [ -n "$token" ]; then
        # Configurar credential helper para recordar el token
        git config --global credential.helper store
        
        # Obtener la URL actual del remote
        current_url=$(git remote get-url origin 2>/dev/null)
        if [ -n "$current_url" ]; then
            # Extraer usuario/repo de la URL
            repo_path=$(echo "$current_url" | sed 's/.*github\.com[/:]//' | sed 's/\.git$//')
            new_url="https://$token@github.com/$repo_path.git"
            
            git remote set-url origin "$new_url"
            success "Token configurado correctamente"
            
            # Probar conexión
            if git ls-remote origin >/dev/null 2>&1; then
                success "Conexión exitosa"
                
                # Limpiar URL por seguridad
                clean_url="https://github.com/$repo_path.git"
                git remote set-url origin "$clean_url"
                
                # Guardar credenciales
                echo "https://$token@github.com" | git credential approve
                
                echo ""
                echo "✨ Configuración completada. Ahora puedes hacer:"
                echo "   git push -u origin main"
            else
                error "Fallo en la conexión. Verifica el token"
            fi
        else
            error "No hay remote origin configurado"
        fi
    else
        error "Token vacío"
    fi
}

# Configuración SSH completa
setup_ssh_complete() {
    echo ""
    info "🔐 Configuración completa de SSH"
    echo ""
    
    # Generar claves si no existen
    if [ ! -f "$HOME/.ssh/id_ed25519" ]; then
        echo "Generando nuevas claves SSH..."
        ssh-keygen -t ed25519 -C "$(git config --global user.email)" -f "$HOME/.ssh/id_ed25519"
        success "Claves SSH generadas"
    else
        success "Claves SSH ya existen"
    fi
    
    # Iniciar ssh-agent
    eval "$(ssh-agent -s)"
    ssh-add "$HOME/.ssh/id_ed25519"
    
    echo ""
    echo "📋 Tu clave pública SSH:"
    echo "----------------------------------------"
    cat "$HOME/.ssh/id_ed25519.pub"
    echo "----------------------------------------"
    echo ""
    echo "1. Copia la clave de arriba"
    echo "2. Ve a: https://github.com/settings/ssh/new"
    echo "3. Pega la clave"
    echo "4. Guarda"
    echo ""
    
    read -p "¿Has agregado la clave a GitHub? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Cambiar remote a SSH
        current_url=$(git remote get-url origin 2>/dev/null)
        if [[ $current_url == https://* ]]; then
            repo_path=$(echo "$current_url" | sed 's/.*github\.com\///' | sed 's/\.git$//')
            ssh_url="git@github.com:$repo_path.git"
            git remote set-url origin "$ssh_url"
            success "Remote cambiado a SSH"
        fi
        
        # Probar conexión
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            success "SSH configurado correctamente"
            echo ""
            echo "✨ Ahora puedes hacer: git push -u origin main"
        else
            error "Conexión SSH falló"
        fi
    fi
}

# Menú principal
menu_principal() {
    echo "¿Qué quieres hacer?"
    echo ""
    echo "1. 🔍 Diagnosticar problemas"
    echo "2. 🔑 Configurar PAT (rápido)"
    echo "3. 🔐 Configurar SSH (completo)"
    echo "4. 🧹 Limpiar configuración y empezar de nuevo"
    echo "5. 📚 Ver guía completa"
    echo "6. ❌ Salir"
    echo ""
    read -p "Selecciona una opción (1-6): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            diagnosticar
            ;;
        2)
            setup_pat_quick
            ;;
        3)
            setup_ssh_complete
            ;;
        4)
            limpiar_configuracion
            ;;
        5)
            mostrar_guia
            ;;
        6)
            echo "Saliendo..."
            exit 0
            ;;
        *)
            error "Opción no válida"
            menu_principal
            ;;
    esac
}

# Limpiar configuración
limpiar_configuracion() {
    echo ""
    warning "Esto eliminará la configuración actual de Git"
    read -p "¿Estás seguro? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin 2>/dev/null || true
        git config --global --unset credential.helper 2>/dev/null || true
        rm -f "$HOME/.git-credentials" 2>/dev/null || true
        success "Configuración limpiada"
        echo ""
        echo "Ahora puedes ejecutar de nuevo:"
        echo "./run_script.sh setup-github"
    fi
}

# Mostrar guía completa
mostrar_guia() {
    echo ""
    echo "📚 GUÍA COMPLETA DE AUTENTICACIÓN CON GITHUB"
    echo "============================================="
    echo ""
    echo "🔑 MÉTODO 1: Personal Access Token (PAT) - RECOMENDADO"
    echo "-------------------------------------------------------"
    echo "1. Ve a https://github.com/settings/tokens/new"
    echo "2. Nombre: SistemaAlquileresV2"
    echo "3. Expiration: No expiration"
    echo "4. Scopes: ✅ repo (Full control of private repositories)"
    echo "5. Generate token"
    echo "6. COPIA EL TOKEN (no podrás verlo de nuevo)"
    echo "7. Ejecuta: git config --global credential.helper store"
    echo "8. En el push, usa tu token como contraseña"
    echo ""
    echo "🔐 MÉTODO 2: SSH Keys"
    echo "---------------------"
    echo "1. Genera clave: ssh-keygen -t ed25519 -C \"tu-email@ejemplo.com\""
    echo "2. Inicia agent: eval \"\$(ssh-agent -s)\""
    echo "3. Agrega clave: ssh-add ~/.ssh/id_ed25519"
    echo "4. Copia clave pública: cat ~/.ssh/id_ed25519.pub"
    echo "5. Ve a https://github.com/settings/ssh/new"
    echo "6. Pega la clave pública"
    echo "7. Cambia remote: git remote set-url origin git@github.com:usuario/repo.git"
    echo ""
    echo "🔧 RESOLUCIÓN DE PROBLEMAS COMUNES"
    echo "-----------------------------------"
    echo "• Error 'Authentication failed': Token/SSH mal configurado"
    echo "• Error 'Repository not found': URL incorrecta o sin permisos"
    echo "• Error 'Permission denied': SSH key no agregada a GitHub"
    echo "• Error de conexión: Problema de red o configuración"
    echo ""
}

# Ejecutar
echo "Este script te ayudará a solucionar problemas de autenticación con GitHub"
echo ""
menu_principal
