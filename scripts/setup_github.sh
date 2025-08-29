#!/bin/bash

# Script para configurar y subir repositorio a GitHub
# Sistema de Alquileres V2

echo "🚀 Configuración de Repositorio GitHub"
echo "======================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Función para mostrar mensajes
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar si Git está configurado
check_git_config() {
    info "Verificando configuración de Git..."
    
    USER_NAME=$(git config --global user.name)
    USER_EMAIL=$(git config --global user.email)
    
    if [ -z "$USER_NAME" ] || [ -z "$USER_EMAIL" ]; then
        warning "Git no está configurado globalmente"
        echo ""
        echo "Por favor configura Git con tus credenciales:"
        echo "git config --global user.name \"Tu Nombre\""
        echo "git config --global user.email \"tu-email@ejemplo.com\""
        echo ""
        read -p "¿Quieres configurarlo ahora? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Introduce tu nombre: " name
            read -p "Introduce tu email: " email
            git config --global user.name "$name"
            git config --global user.email "$email"
            success "Git configurado correctamente"
        else
            error "Configuración de Git cancelada"
            exit 1
        fi
    else
        success "Git ya está configurado:"
        echo "   Nombre: $USER_NAME"
        echo "   Email: $USER_EMAIL"
    fi
}

# Crear repositorio en GitHub
create_github_repo() {
    echo ""
    info "Pasos para crear el repositorio en GitHub:"
    echo ""
    echo "1. Ve a https://github.com/new"
    echo "2. Nombre del repositorio: SistemaAlquileresV2"
    echo "3. Descripción: Sistema completo de gestión de alquileres con FastAPI y PostgreSQL"
    echo "4. Público o Privado (tu elección)"
    echo "5. NO inicializar con README (ya tenemos uno)"
    echo "6. NO agregar .gitignore (ya tenemos uno)"
    echo "7. Agregar licencia MIT si quieres"
    echo "8. Hacer clic en 'Create repository'"
    echo ""
    read -p "¿Has creado el repositorio en GitHub? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Crea el repositorio primero y luego ejecuta este script de nuevo"
        exit 1
    fi
}

# Obtener URL del repositorio
get_repo_url() {
    echo ""
    info "Introduce la URL de tu repositorio GitHub:"
    echo "Ejemplo: https://github.com/tu-usuario/SistemaAlquileresV2.git"
    read -p "URL del repositorio: " repo_url
    
    if [ -z "$repo_url" ]; then
        error "URL del repositorio no puede estar vacía"
        exit 1
    fi
    
    # Validar formato básico de URL
    if [[ ! $repo_url =~ ^https://github\.com/.+/.+\.git$ ]]; then
        warning "El formato de URL no parece correcto"
        echo "Debería ser: https://github.com/usuario/repositorio.git"
        read -p "¿Continuar de todos modos? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    echo "URL configurada: $repo_url"
}

# Configurar autenticación
setup_auth() {
    echo ""
    info "Configurando autenticación con GitHub..."
    echo ""
    echo "Tienes varias opciones para autenticarte:"
    echo ""
    echo "1. 🔑 Token de Acceso Personal (PAT) - RECOMENDADO"
    echo "   - Más seguro y fácil de gestionar"
    echo "   - No caduca (a menos que lo configures)"
    echo ""
    echo "2. 🔐 SSH Keys"
    echo "   - Muy seguro, sin contraseñas"
    echo "   - Requiere configuración inicial"
    echo ""
    echo "3. ⚠️  Usuario/Contraseña (DEPRECATED)"
    echo "   - GitHub ya no lo permite para operaciones Git"
    echo ""
    
    read -p "¿Qué método prefieres? (1=PAT, 2=SSH): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            setup_pat_auth
            ;;
        2)
            setup_ssh_auth
            ;;
        *)
            warning "Opción no válida, usando PAT por defecto"
            setup_pat_auth
            ;;
    esac
}

# Configurar autenticación con PAT
setup_pat_auth() {
    echo ""
    info "Configuración con Token de Acceso Personal (PAT)"
    echo ""
    echo "📋 Pasos para crear un PAT:"
    echo "1. Ve a GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)"
    echo "2. Clic en 'Generate new token (classic)'"
    echo "3. Nombre: 'SistemaAlquileresV2'"
    echo "4. Expiration: No expiration (o elige la que prefieras)"
    echo "5. Scopes necesarios: ✅ repo (full control)"
    echo "6. Clic en 'Generate token'"
    echo "7. COPIA EL TOKEN (no podrás verlo de nuevo)"
    echo ""
    echo "🔗 Enlace directo: https://github.com/settings/tokens/new"
    echo ""
    
    read -p "¿Has creado el PAT? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warning "Crea el PAT primero y luego continúa"
        return 1
    fi
    
    echo ""
    echo "🔐 Introduce tu Personal Access Token:"
    echo "(No se mostrará en pantalla por seguridad)"
    read -s pat_token
    echo ""
    
    if [ -z "$pat_token" ]; then
        error "Token no puede estar vacío"
        return 1
    fi
    
    # Modificar la URL para incluir el token
    repo_url_with_auth="https://$pat_token@github.com/${repo_url#https://github.com/}"
    
    success "Token configurado correctamente"
    return 0
}

# Configurar autenticación SSH
setup_ssh_auth() {
    echo ""
    info "Configuración con SSH Keys"
    echo ""
    
    # Verificar si ya existe una clave SSH
    if [ -f "$HOME/.ssh/id_rsa.pub" ] || [ -f "$HOME/.ssh/id_ed25519.pub" ]; then
        success "Ya tienes claves SSH configuradas"
        
        echo "Claves encontradas:"
        [ -f "$HOME/.ssh/id_rsa.pub" ] && echo "  - RSA: ~/.ssh/id_rsa.pub"
        [ -f "$HOME/.ssh/id_ed25519.pub" ] && echo "  - ED25519: ~/.ssh/id_ed25519.pub"
        
        echo ""
        echo "📋 Para usar SSH necesitas:"
        echo "1. Copiar tu clave pública a GitHub"
        echo "2. Ve a GitHub.com → Settings → SSH and GPG keys"
        echo "3. Clic en 'New SSH key'"
        echo "4. Pega el contenido de tu clave pública"
        echo ""
        
        if [ -f "$HOME/.ssh/id_ed25519.pub" ]; then
            echo "Tu clave ED25519 pública es:"
            cat "$HOME/.ssh/id_ed25519.pub"
        elif [ -f "$HOME/.ssh/id_rsa.pub" ]; then
            echo "Tu clave RSA pública es:"
            cat "$HOME/.ssh/id_rsa.pub"
        fi
        
        echo ""
        read -p "¿Has agregado la clave a GitHub? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Convertir URL HTTPS a SSH
            repo_url_with_auth="${repo_url/https:\/\/github.com\//git@github.com:}"
            success "SSH configurado para usar"
            return 0
        else
            warning "Configura la clave SSH en GitHub primero"
            return 1
        fi
    else
        warning "No tienes claves SSH configuradas"
        echo ""
        echo "Para generar claves SSH:"
        echo "ssh-keygen -t ed25519 -C \"tu-email@ejemplo.com\""
        echo ""
        read -p "¿Quieres que genere las claves ahora? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ssh-keygen -t ed25519 -C "$(git config --global user.email)"
            echo ""
            success "Claves SSH generadas"
            echo "Ahora agrega la clave pública a GitHub y ejecuta el script de nuevo"
            echo ""
            echo "Tu clave pública es:"
            cat "$HOME/.ssh/id_ed25519.pub"
            return 1
        else
            return 1
        fi
    fi
}

# Configurar remote y push
setup_and_push() {
    echo ""
    info "Configurando remote y subiendo código..."
    
    # Configurar autenticación
    setup_auth
    if [ $? -ne 0 ]; then
        error "Error en la configuración de autenticación"
        return 1
    fi
    
    # Verificar si ya existe el remote origin
    if git remote get-url origin >/dev/null 2>&1; then
        warning "Remote origin ya existe, actualizando URL..."
        git remote set-url origin "$repo_url_with_auth"
    else
        # Agregar remote origin
        git remote add origin "$repo_url_with_auth"
    fi
    
    success "Remote origin configurado"
    
    # Verificar estado del repositorio
    git status
    
    # Verificar conexión con GitHub
    info "Verificando conexión con GitHub..."
    if [[ $repo_url_with_auth == git@* ]]; then
        # Verificación SSH
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            success "Conexión SSH exitosa"
        else
            error "Fallo en la conexión SSH"
            echo "Verifica que tu clave SSH esté configurada correctamente en GitHub"
            return 1
        fi
    else
        # Verificación HTTPS con token
        if git ls-remote origin >/dev/null 2>&1; then
            success "Conexión HTTPS exitosa"
        else
            error "Fallo en la conexión HTTPS"
            echo "Verifica que tu token tenga los permisos correctos"
            return 1
        fi
    fi
    
    # Push inicial
    info "Subiendo código a GitHub..."
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        success "¡Código subido exitosamente a GitHub!"
        echo ""
        echo "🎉 ¡Tu repositorio está listo!"
        echo "🔗 Puedes verlo en: ${repo_url%.git}"
        echo ""
        echo "📋 Próximos pasos:"
        echo "   1. Revisar el README.md en GitHub"
        echo "   2. Configurar GitHub Pages si quieres (opcional)"
        echo "   3. Invitar colaboradores si es necesario"
        echo "   4. Configurar Issues y Projects para gestión"
        echo ""
        echo "🚀 Para hacer cambios futuros:"
        echo "   git add ."
        echo "   git commit -m \"Descripción del cambio\""
        echo "   git push"
        
        # Limpiar URL con token del git config (por seguridad)
        if [[ $repo_url_with_auth == *"@"* ]] && [[ $repo_url_with_auth != git@* ]]; then
            git remote set-url origin "$repo_url"
            info "URL del remote limpiada por seguridad"
        fi
        
    else
        error "Error al subir el código"
        echo ""
        echo "Posibles soluciones:"
        echo "1. Verifica que el repositorio existe en GitHub"
        echo "2. Revisa los permisos del token/SSH key"
        echo "3. Asegúrate de que la URL es correcta"
        echo "4. Ejecuta: git remote -v para verificar la configuración"
        echo ""
        return 1
    fi
}

# Función principal
main() {
    echo "Este script te ayudará a subir tu Sistema de Alquileres V2 a GitHub"
    echo ""
    
    check_git_config
    create_github_repo
    get_repo_url
    setup_and_push
    
    echo ""
    success "🎊 ¡Proceso completado exitosamente!"
    echo ""
    echo "Tu Sistema de Alquileres V2 ya está en GitHub y listo para compartir 🚀"
}

# Ejecutar
main "$@"
