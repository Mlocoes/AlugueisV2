# CORREÇÕES RECOMENDADAS - SISTEMA ALUGUEISV2

## Lista Detalhada de Correções por Prioridade

---

## 🔴 PRIORIDADE CRÍTICA (Corrigir Imediatamente)

### 1. Remover Secrets do Repositório
**Arquivo:** `backend/.env`
**Problema:** Chaves secretas expostas no Git
**Correção:**
```bash
# Remover .env do Git
git rm --cached backend/.env
echo "backend/.env" >> .gitignore

# Criar .env.example
cat > backend/.env.example << EOF
ENV=development
SECRET_KEY=your-secret-key-here
DEBUG=true
CORS_ALLOW_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/dbname
EOF
```

### 2. Corrigir SQL Injection em sanitize_string
**Arquivo:** `backend/routers/upload.py`
**Correção:**
```python
def sanitize_string(value) -> str:
    """Sanitiza uma string removendo tags HTML e caracteres perigosos."""
    if value is None:
        return ""

    # Se for datetime, converter para string ISO
    if hasattr(value, 'isoformat'):
        return value.isoformat()

    # Converter para string
    value_str = str(value)

    # Remover caracteres de controle perigosos
    value_str = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value_str)

    # Limitar tamanho para prevenir ataques
    return value_str[:1000] if len(value_str) > 1000 else value_str
```

### 3. Implementar Validação Adequada no Backend
**Arquivo:** `backend/routers/upload.py`
**Adicionar:**
```python
def validate_excel_content(df: pd.DataFrame) -> bool:
    """Valida conteúdo do Excel antes do processamento."""
    # Verificar tamanho máximo
    if len(df) > 10000:  # Máximo 10k linhas
        return False

    # Verificar colunas suspeitas
    dangerous_columns = ['script', 'javascript', 'onload', 'onerror']
    for col in df.columns:
        col_str = str(col).lower()
        if any(dangerous in col_str for dangerous in dangerous_columns):
            return False

    return True
```

### 4. Corrigir XSS no Frontend
**Arquivo:** `frontend/js/modules/proprietarios.js`
**Correção:**
```javascript
// Antes (vulnerável)
element.innerHTML = userInput;

// Depois (seguro)
element.textContent = userInput;
// OU
element.innerHTML = SecurityUtils.escapeHtml(userInput);
```

---

## 🟠 PRIORIDADE ALTA (Próximas 2 Semanas)

### 5. Implementar Rate Limiting
**Arquivo:** `backend/main.py`
**Adicionar:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
```

### 6. Fixar Dependências
**Arquivo:** `backend/requirements.txt`
**Correção:**
```plaintext
sqlalchemy==2.0.23
psycopg2-binary==2.9.7
python-dotenv==1.0.0
fastapi==0.104.1
uvicorn==0.24.0
pandas==2.1.4
openpyxl==3.1.2
python-multipart==0.0.6
pydantic==2.5.0
jinja2==3.1.2
python-jose[cryptography]==3.3.0
passlib==1.7.4
bcrypt==4.0.1
PyJWT==2.8.0
fastapi-utils==0.2.1
typing-inspect==0.9.0
mypy-extensions==1.0.0
slowapi==0.1.9
```

### 7. Melhorar Configuração CORS
**Arquivo:** `backend/config.py`
**Correção:**
```python
# Configuração CORS mais segura
ENV = os.getenv("ENV", "development").lower()
ALLOWED_ORIGINS = os.getenv("CORS_ALLOW_ORIGINS", "").split(",")

if ENV == "production":
    # Em produção, só origens específicas
    CORS_CONFIG = {
        "allow_origins": ALLOWED_ORIGINS,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type"],
        "max_age": 86400  # 24 horas
    }
else:
    # Desenvolvimento mais permissivo
    CORS_CONFIG = {
        "allow_origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"]
    }
```

### 8. Remover Logs Sensíveis
**Arquivo:** `backend/routers/upload.py`
**Correção:**
```python
import logging
logger = logging.getLogger(__name__)

# Substituir prints por logging condicional
if os.getenv("DEBUG") == "true":
    logger.debug(f"Sheet {sheet_name}, dtypes: {df.dtypes.to_dict()}")
```

---

## 🟡 PRIORIDADE MÉDIA (Próximo Mês)

### 9. Implementar Testes Básicos
**Arquivo:** `backend/tests/__init__.py`
**Criar estrutura:**
```
backend/tests/
├── __init__.py
├── conftest.py
├── test_auth.py
├── test_upload.py
└── test_proprietarios.py
```

**Arquivo:** `backend/tests/conftest.py`
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Base
import os

# Database de teste
TEST_DATABASE_URL = "sqlite:///./test.db"

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()
```

### 10. Padronizar Tratamento de Erros
**Arquivo:** `backend/utils/error_handlers.py`
**Criar:**
```python
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

def create_error_response(status_code: int, message: str, details: str = None):
    """Cria resposta de erro padronizada."""
    error_data = {
        "error": {
            "message": message,
            "status_code": status_code,
            "timestamp": "2024-01-01T00:00:00Z"  # Adicionar timestamp real
        }
    }

    if details:
        error_data["error"]["details"] = details

    return JSONResponse(status_code=status_code, content=error_data)

async def global_exception_handler(request: Request, exc: Exception):
    """Handler global de exceções."""
    logger.error(f"Exception: {exc}", exc_info=True)

    if isinstance(exc, HTTPException):
        return create_error_response(exc.status_code, str(exc.detail))

    return create_error_response(500, "Erro interno do servidor")
```

### 11. Implementar Funcionalidades Faltantes
**Arquivo:** `backend/routers/alugueis.py`
**Adicionar endpoint de edição:**
```python
@router.put("/{aluguel_id}")
async def atualizar_aluguel(
    aluguel_id: int,
    dados: AluguelUpdateSchema,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """Atualiza um aluguel existente."""
    aluguel = db.query(AluguelSimples).filter(AluguelSimples.id == aluguel_id).first()
    if not aluguel:
        raise HTTPException(status_code=404, detail="Aluguel não encontrado")

    # Lógica de atualização
    update_data = dados.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(aluguel, field, value)

    db.commit()
    db.refresh(aluguel)
    return aluguel.to_dict()
```

---

## 🟢 MELHORIAS GERAIS (Mês 2+)

### 12. Refatorar Arquitetura Frontend
**Arquivo:** `frontend/js/services/dataService.js`
**Criar serviço centralizado:**
```javascript
class DataService {
    constructor(apiService) {
        this.api = apiService;
        this.cache = new Map();
    }

    async getProprietarios(force = false) {
        if (!force && this.cache.has('proprietarios')) {
            return this.cache.get('proprietarios');
        }

        const data = await this.api.get('/api/proprietarios');
        this.cache.set('proprietarios', data);
        return data;
    }

    invalidateCache(key) {
        this.cache.delete(key);
    }
}
```

### 13. Implementar Monitoramento
**Arquivo:** `backend/routers/health.py`
**Criar:**
```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config import get_db
import psutil
import time

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("/detailed")
async def detailed_health(db: Session = Depends(get_db)):
    """Health check detalhado com métricas do sistema."""
    # Verificar banco de dados
    db_start = time.time()
    db.query("SELECT 1").first()
    db_time = time.time() - db_start

    # Métricas do sistema
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    return {
        "status": "healthy",
        "database": {
            "response_time": f"{db_time:.3f}s",
            "status": "ok"
        },
        "system": {
            "memory_usage": f"{memory.percent}%",
            "disk_usage": f"{disk.percent}%",
            "cpu_count": psutil.cpu_count()
        },
        "timestamp": time.time()
    }
```

### 14. Adicionar Validação de Arquivos no Upload
**Arquivo:** `backend/routers/upload.py`
**Melhoria:**
```python
def validate_file_security(file_path: str) -> bool:
    """Valida segurança do arquivo antes do processamento."""
    # Verificar tamanho
    if os.path.getsize(file_path) > MAX_FILE_SIZE:
        return False

    # Verificar tipo MIME
    import magic
    mime = magic.from_file(file_path, mime=True)
    allowed_mimes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ]

    if mime not in allowed_mimes:
        return False

    # Verificar conteúdo malicioso básico
    with open(file_path, 'rb') as f:
        header = f.read(512)
        if b'<script' in header.lower() or b'javascript:' in header.lower():
            return False

    return True
```

---

## 📋 SCRIPTS DE CORREÇÃO AUTOMATIZADA

### Script de Segurança Básica
**Arquivo:** `scripts/security_fixes.sh`
```bash
#!/bin/bash

echo "🔒 Aplicando correções de segurança críticas..."

# 1. Remover secrets
if [ -f "backend/.env" ]; then
    mv backend/.env backend/.env.backup
    echo "✅ .env movido para backup"
fi

# 2. Instalar dependências seguras
pip install --upgrade -r backend/requirements.txt

# 3. Verificar vulnerabilidades
safety check --file backend/requirements.txt

echo "✅ Correções básicas aplicadas"
```

### Script de Validação
**Arquivo:** `scripts/validate_system.py`
```python
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

    # Verificar se .env existe no repositório
    if os.path.exists('.env'):
        issues.append("❌ .env encontrado no repositório")

    # Verificar secrets no código
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith(('.py', '.js', '.env')):
                try:
                    with open(os.path.join(root, file), 'r') as f:
                        content = f.read()
                        if 'SECRET_KEY' in content and 'your-secret' not in content:
                            issues.append(f"❌ Secret encontrado em {os.path.join(root, file)}")
                except:
                    pass

    return issues

def main():
    print("🔍 Validando sistema AlugueisV2...")

    issues = check_security()

    if issues:
        print("❌ Problemas encontrados:")
        for issue in issues:
            print(f"  {issue}")
        sys.exit(1)
    else:
        print("✅ Sistema validado com sucesso")

if __name__ == "__main__":
    main()
```

---

## 📚 DOCUMENTAÇÃO ADICIONAL NECESSÁRIA

### 1. Guia de Segurança
- Políticas de senha
- Configuração de CORS
- Rate limiting
- Logs de segurança

### 2. Guia de Desenvolvimento
- Padrões de código
- Estrutura de testes
- Processo de deploy
- Monitoramento

### 3. Runbook de Operações
- Backup e recuperação
- Monitoramento de performance
- Troubleshooting comum
- Escalabilidade

---

## 🎯 MÉTRICAS DE SUCESSO

Após implementar as correções:

- **Vulnerabilidades Críticas:** 0
- **Vulnerabilidades Altas:** 0
- **Cobertura de Testes:** >80%
- **Tempo Médio de Resposta:** <500ms
- **Uptime:** >99.5%
- **Security Score:** >8/10

---

## 📞 CONTATO E SUPORTE

Para questões sobre estas correções:
- **Security Issues:** Corrigir imediatamente
- **Architecture Questions:** Revisar design patterns
- **Performance Issues:** Otimizar queries e caching
- **Feature Requests:** Avaliar impacto na arquitetura existente</content>
<parameter name="filePath">/home/mloco/Escritorio/AlugueisV2/CORRECOES_RECOMENDADAS.md