#!/bin/bash

echo "🔒 Aplicando correções de segurança críticas..."

# 1. Remover secrets
if [ -f "backend/.env" ]; then
    mv backend/.env backend/.env.backup
    echo "✅ .env movido para backup"
fi

# 2. Instalar dependências seguras
echo "📦 Instalando dependências seguras..."
pip install --upgrade -r backend/requirements.txt

# 3. Verificar vulnerabilidades (se safety estiver instalado)
if command -v safety &> /dev/null; then
    echo "🔍 Verificando vulnerabilidades..."
    safety check --file backend/requirements.txt
else
    echo "⚠️  Safety não instalado. Instale com: pip install safety"
fi

# 4. Verificar permissões de arquivos
echo "🔐 Verificando permissões..."
find backend/ -name "*.py" -exec chmod 644 {} \;
find backend/ -name "*.sh" -exec chmod 755 {} \;

echo "✅ Correções básicas aplicadas"