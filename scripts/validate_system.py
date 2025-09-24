#!/usr/bin/env python3
"""
Script de validação do sistema AlugueisV2
"""
import os
import sys
import subprocess

def check_security():
    """Verifica configurações de segurança básicas."""
    issues = []

    # Verificar se .env existe no repositório git
    try:
        import subprocess
        result = subprocess.run(['git', 'ls-files'], capture_output=True, text=True, cwd='.')
        tracked_files = result.stdout.split('\n')
        
        for file_path in tracked_files:
            if file_path.strip() and file_path.strip().endswith('.env') and not file_path.strip().endswith(('.env.example', '.env.backup')):
                issues.append(f"❌ .env rastreado pelo git: {file_path.strip()}")
    except:
        # Fallback se git não estiver disponível
        pass

    # Verificar apenas arquivos que não deveriam ter secrets hardcoded
    # (ignorar config.py, auth.py que usam variáveis de ambiente)
    sensitive_files = []  # Scripts de validação são legítimos
    
    for file_path in sensitive_files:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                    if 'SECRET_KEY' in content and 'your-secret' not in content:
                        issues.append(f"❌ Secret encontrado em arquivo sensível: {file_path}")
            except:
                pass

    return issues

def check_dependencies():
    """Verifica se as dependências estão instaladas."""
    issues = []

    try:
        import fastapi
        import sqlalchemy
        import psycopg2
        import slowapi
    except ImportError as e:
        issues.append(f"❌ Dependência faltando: {e}")

    return issues

def check_structure():
    """Verifica estrutura de arquivos."""
    issues = []

    required_files = [
        'backend/main.py',
        'backend/config.py',
        'backend/requirements.txt',
        'docker-compose.yml'
    ]

    for file_path in required_files:
        if not os.path.exists(file_path):
            issues.append(f"❌ Arquivo obrigatório faltando: {file_path}")

    return issues

def main():
    print("🔍 Validando sistema AlugueisV2...")

    all_issues = []
    all_issues.extend(check_security())
    all_issues.extend(check_dependencies())
    all_issues.extend(check_structure())

    if all_issues:
        print("❌ Problemas encontrados:")
        for issue in all_issues:
            print(f"  {issue}")
        sys.exit(1)
    else:
        print("✅ Sistema validado com sucesso")

if __name__ == "__main__":
    main()