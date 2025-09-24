# 🛠️ Guia de Desenvolvimento - Sistema AlugueisV2

## Visão Geral

Este guia estabelece os padrões e melhores práticas para desenvolvimento no Sistema AlugueisV2, garantindo consistência, qualidade e manutenibilidade do código.

## 📁 Estrutura do Projeto

```
AlugueisV2/
├── backend/                 # API FastAPI
│   ├── main.py             # Ponto de entrada da aplicação
│   ├── config.py           # Configurações globais
│   ├── models_final.py     # Modelos SQLAlchemy
│   ├── routers/            # Endpoints organizados por módulo
│   │   ├── auth.py         # Autenticação e autorização
│   │   ├── alugueis.py     # Gestão de aluguéis
│   │   ├── upload.py       # Upload e processamento de arquivos
│   │   └── health.py       # Monitoramento de saúde
│   ├── utils/              # Utilitários
│   │   └── error_handlers.py # Tratamento de erros
│   └── tests/              # Testes automatizados
├── frontend/               # Interface web
├── scripts/                # Scripts de automação
│   ├── security_fixes.sh   # Correções de segurança
│   └── validate_system.py  # Validação do sistema
├── docs/                   # Documentação
└── docker-compose.yml      # Orquestração de containers
```

## 🐍 Padrões de Código Python

### 1. Estilo de Código
- **PEP 8**: Seguir guia de estilo Python
- **Black**: Formatador automático de código
- **isort**: Organizador de imports
- **flake8**: Linter para qualidade de código

### 2. Convenções de Nomenclatura
```python
# Classes
class UsuarioModel:
    pass

# Funções e métodos
def criar_usuario():
    pass

def get_usuario_by_id():
    pass

# Variáveis
usuario_ativo = True
lista_de_usuarios = []

# Constantes
MAX_FILE_SIZE = 10 * 1024 * 1024
DEFAULT_TIMEOUT = 30
```

### 3. Estrutura de Funções
```python
def processar_upload_arquivo(
    file: UploadFile,
    db: Session,
    current_user: Usuario
) -> Dict[str, Any]:
    """
    Processa upload de arquivo Excel/CSV.

    Args:
        file: Arquivo enviado pelo usuário
        db: Sessão do banco de dados
        current_user: Usuário autenticado

    Returns:
        Dict com resultado do processamento

    Raises:
        HTTPException: Em caso de erro de validação
    """
    try:
        # Validação
        validate_file_security(file)

        # Processamento
        dados = processar_excel(file)

        # Persistência
        salvar_dados(db, dados)

        return {"status": "success", "registros": len(dados)}

    except Exception as e:
        logger.error(f"Erro no processamento: {e}")
        raise HTTPException(500, "Erro interno do servidor")
```

## 🗄️ Padrões de Banco de Dados

### 1. Modelos SQLAlchemy
```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from config import Base

class Aluguel(Base):
    __tablename__ = "alugueis"

    id = Column(Integer, primary_key=True, index=True)
    valor = Column(Float, nullable=False)
    data_vencimento = Column(Date, nullable=False)
    status = Column(String(20), default="pendente")

    # Relacionamentos
    imovel_id = Column(Integer, ForeignKey("imoveis.id"))
    imovel = relationship("Imovel", back_populates="alugueis")

    proprietario_id = Column(Integer, ForeignKey("proprietarios.id"))
    proprietario = relationship("Proprietario", back_populates="alugueis")
```

### 2. Queries Otimizadas
```python
# ❌ Evitar N+1 queries
alugueis = db.query(Aluguel).all()
for aluguel in alugueis:
    print(aluguel.proprietario.nome)  # N+1 queries!

# ✅ Usar joins
alugueis = db.query(Aluguel).options(
    joinedload(Aluguel.proprietario)
).all()
```

### 3. Transações
```python
def criar_aluguel_com_imovel(aluguel_data: dict, imovel_data: dict):
    with db.begin():
        # Criar imóvel primeiro
        imovel = Imovel(**imovel_data)
        db.add(imovel)
        db.flush()  # Obter ID

        # Criar aluguel
        aluguel = Aluguel(imovel_id=imovel.id, **aluguel_data)
        db.add(aluguel)

        return aluguel
```

## 🌐 Padrões de API

### 1. Estrutura de Endpoints
```
GET    /api/alugueis           # Listar aluguéis
GET    /api/alugueis/{id}      # Obter aluguel específico
POST   /api/alugueis           # Criar novo aluguel
PUT    /api/alugueis/{id}      # Atualizar aluguel
DELETE /api/alugueis/{id}      # Remover aluguel
```

### 2. Respostas Padronizadas
```python
# Sucesso
{
    "status": "success",
    "data": {...},
    "message": "Operação realizada com sucesso"
}

# Erro
{
    "status": "error",
    "message": "Descrição do erro",
    "code": "ERROR_CODE",
    "details": {...}
}

# Paginação
{
    "data": [...],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total": 150,
        "total_pages": 8
    }
}
```

### 3. Códigos de Status HTTP
- **200 OK**: Sucesso
- **201 Created**: Recurso criado
- **400 Bad Request**: Dados inválidos
- **401 Unauthorized**: Não autenticado
- **403 Forbidden**: Sem permissão
- **404 Not Found**: Recurso não encontrado
- **422 Unprocessable Entity**: Validação falhou
- **429 Too Many Requests**: Rate limit excedido
- **500 Internal Server Error**: Erro interno

## 🧪 Estrutura de Testes

### 1. Organização de Testes
```
backend/tests/
├── conftest.py           # Configurações compartilhadas
├── test_auth.py          # Testes de autenticação
├── test_alugueis.py      # Testes de aluguéis
├── test_upload.py        # Testes de upload
└── test_health.py        # Testes de health check
```

### 2. Exemplo de Teste
```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from models_final import Usuario

client = TestClient(app)

@pytest.fixture
def test_user(db_session: Session):
    user = Usuario(
        usuario="testuser",
        senha="hashed_password",
        tipo_de_usuario="usuario"
    )
    db_session.add(user)
    db_session.commit()
    return user

def test_create_aluguel_success(test_user):
    # Arrange
    aluguel_data = {
        "valor": 1500.00,
        "data_vencimento": "2024-02-01",
        "imovel_id": 1
    }

    # Act
    response = client.post(
        "/api/alugueis",
        json=aluguel_data,
        headers={"Authorization": f"Bearer {get_test_token()}"}
    )

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["valor"] == 1500.00
    assert "id" in data
```

### 3. Cobertura de Testes
- **Mínimo**: 80% de cobertura
- **Crítico**: 100% em funções de segurança
- **Integração**: Testes end-to-end

## 🚀 Processo de Deploy

### 1. Ambiente de Desenvolvimento
```bash
# Instalar dependências
pip install -r backend/requirements.txt

# Executar migrações
python backend/create_tables.py

# Executar testes
pytest backend/tests/

# Iniciar aplicação
uvicorn main:app --reload
```

### 2. Ambiente de Produção
```bash
# Usar Docker Compose
docker-compose up -d

# Verificar health check
curl http://localhost:8000/api/health/detailed

# Executar validação
python scripts/validate_system.py
```

### 3. Checklist de Deploy
- [ ] Executar testes automatizados
- [ ] Verificar configurações de ambiente
- [ ] Executar migrações de banco
- [ ] Verificar conectividade com banco
- [ ] Testar endpoints críticos
- [ ] Verificar logs de erro
- [ ] Executar backup antes do deploy

## 📊 Monitoramento

### 1. Métricas Essenciais
- **Performance**: Tempo de resposta das APIs
- **Disponibilidade**: Uptime do sistema
- **Erros**: Taxa de erro por endpoint
- **Uso de Recursos**: CPU, memória, disco

### 2. Logs Estruturados
```python
import logging

logger = logging.getLogger(__name__)

def log_api_request(endpoint: str, method: str, status_code: int, duration: float):
    logger.info(f"API Request: {method} {endpoint} - {status_code} - {duration:.3f}s")

def log_error(error: Exception, context: dict = None):
    logger.error(f"Error: {error}", extra=context, exc_info=True)
```

### 3. Alertas
- **Performance**: Resposta > 500ms
- **Erros**: Taxa de erro > 5%
- **Disponibilidade**: Uptime < 99.5%
- **Segurança**: Tentativas de login falhadas

## 🔧 Ferramentas de Desenvolvimento

### 1. Ambiente Local
- **Python**: 3.12+
- **PostgreSQL**: 15+
- **Docker**: 28+
- **Git**: Controle de versão

### 2. IDE e Editores
- **VS Code** com extensões:
  - Python
  - Pylance
  - Docker
  - GitLens

### 3. Utilitários
```bash
# Formatação de código
black backend/
isort backend/

# Linting
flake8 backend/

# Testes
pytest backend/tests/ --cov=backend --cov-report=html

# Segurança
bandit backend/
safety check -r backend/requirements.txt
```

## 📚 Documentação

### 1. Documentação de Código
```python
def calcular_valor_aluguel(
    valor_base: float,
    reajuste_anual: float,
    meses: int
) -> float:
    """
    Calcula o valor do aluguel com reajuste composto.

    Esta função aplica um reajuste anual composto sobre
    o valor base do aluguel por determinado número de meses.

    Args:
        valor_base (float): Valor base do aluguel
        reajuste_anual (float): Percentual de reajuste anual (ex: 0.05 para 5%)
        meses (int): Número de meses para cálculo

    Returns:
        float: Valor reajustado do aluguel

    Raises:
        ValueError: Se valores forem negativos

    Examples:
        >>> calcular_valor_aluguel(1000, 0.05, 12)
        1050.0
    """
    if valor_base < 0 or reajuste_anual < 0 or meses < 0:
        raise ValueError("Valores não podem ser negativos")

    reajuste_mensal = (1 + reajuste_anual) ** (meses / 12) - 1
    return valor_base * (1 + reajuste_mensal)
```

### 2. Documentação de API
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## 🤝 Contribuição

### 1. Fluxo de Desenvolvimento
1. **Criar branch** para feature/bugfix
2. **Implementar** código seguindo padrões
3. **Escrever testes** para nova funcionalidade
4. **Executar** todos os testes
5. **Criar PR** com descrição detalhada
6. **Code review** aprovado
7. **Merge** para main

### 2. Padrões de Commit
```
feat: adicionar funcionalidade de relatório mensal
fix: corrigir cálculo de reajuste de aluguel
docs: atualizar documentação de API
test: adicionar testes para validação de CPF
refactor: otimizar queries de listagem
```

---

*Este guia deve ser atualizado conforme o projeto evolui.*