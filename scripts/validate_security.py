#!/usr/bin/env python3
"""
Script de Validação de Segurança - Sistema AlugueisV2
Verifica vulnerabilidades críticas no sistema
"""

import os
import sys
from pathlib import Path

def check_env_secrets():
    """Verifica se secrets estão no repositório."""
    issues = []
    env_file = Path("AlugueisV2/backend/.env")
    if env_file.exists():
        with open(env_file, 'r') as f:
            content = f.read()
            if "SECRET_KEY=" in content and not content.startswith("#"):
                issues.append("CRÍTICO: Secrets expostos no arquivo .env")
    return issues

def check_dependencies_pinning():
    """Verifica se dependências estão fixadas."""
    issues = []
    req_file = Path("AlugueisV2/backend/requirements.txt")
    if req_file.exists():
        with open(req_file, 'r') as f:
            content = f.read()
            if ">=" in content:
                issues.append("ALTO: Dependências não fixadas (usando >=)")
    return issues

def check_cors_configuration():
    """Verifica configuração CORS."""
    issues = []
    config_file = Path("AlugueisV2/backend/config.py")
    if config_file.exists():
        with open(config_file, 'r') as f:
            content = f.read()
            if "\"*\"" in content and "allow_origins" in content:
                issues.append("ALTO: CORS excessivamente permissivo")
    return issues

def main():
    print("🔍 Executando validações de segurança do Sistema AlugueisV2...")

    all_issues = []
    all_issues.extend(check_env_secrets())
    all_issues.extend(check_dependencies_pinning())
    all_issues.extend(check_cors_configuration())

    if not all_issues:
        print("✅ Nenhuma vulnerabilidade crítica encontrada!")
        return True

    print(f"\n❌ {len(all_issues)} problemas encontrados:")
    print("=" * 50)

    for issue in all_issues:
        print(f"• {issue}")

    print("\n📋 Consulte os arquivos ANALISE_COMPLETA_SISTEMA.md e CORRECOES_RECOMENDADAS.md")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)</content>
<parameter name="filePath">/home/mloco/Escritorio/AlugueisV2/scripts/validate_security.py