# 🏠 Sistema de Gestão de Aluguéis V2

**Plataforma completa e profissional para gestão de aluguéis, proprietários, imóveis e participações. Arquitetura moderna, escalável e com interface responsiva para desktop e mobile.**

[![Versão](https://img.shields.io/badge/versão-2.0-blue.svg)](./VERSION)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Licença](https://img.shields.io/badge/licença-MIT-green.svg)](./LICENSE)

---

## 📋 Visão Geral

O Sistema de Gestão de Aluguéis V2 é uma solução completa para administração imobiliária, oferecendo funcionalidades robustas para gestão de proprietários, imóveis, aluguéis mensais e participações societárias. A plataforma conta com backend modular FastAPI, frontend responsivo e versão mobile PWA.

### ✨ Características Principais

- 🔐 **Autenticação Segura**: Sistema JWT com login obrigatório.
- 📱 **Interface Responsiva**: Desktop e versão mobile PWA.
- 📊 **Dashboard Interativo**: Gráficos e métricas em tempo real.
- 📈 **Relatórios Avançados**: Filtros por período e proprietário.
- 📤 **Importação Excel**: Drag & drop com validação automática.
- 🐳 **Docker Ready**: Orquestração completa com Docker Compose.
- 🛡️ **Segurança Avançada**: Proteções contra SQL injection, XSS, rate limiting.
- 📊 **Monitoramento**: Health checks e métricas do sistema.
- ✅ **Testes Automatizados**: Cobertura completa com pytest.

---

## 🏗️ Arquitetura do Sistema

### Estrutura de Pastas

```text
AlugueisV2/
├── backend/                    # API FastAPI modular
│   ├── main.py                # Aplicação principal
│   ├── models_final.py        # Modelos de dados
│   ├── routers/               # Endpoints organizados
│   ├── utils/                 # Utilitários e handlers
│   ├── tests/                 # Testes automatizados
│   └── requirements.txt       # Dependências Python
├── frontend/                   # Interface web principal
│   ├── index.html             # Página principal
│   ├── mobile/                # Versão PWA mobile
│   └── src/
│       ├── css/
│       └── js/
│           ├── app.js         # Aplicação principal
│           ├── modules/       # Módulos funcionais
│           └── services/      # Serviços
├── database/                   # Scripts BD e backups
├── docs/                       # Documentação técnica
│   ├── GUIA_SEGURANCA.md      # Políticas de segurança
│   ├── GUIA_DESENVOLVIMENTO.md # Padrões de desenvolvimento
│   └── RUNBOOK_OPERACOES.md   # Procedimentos operacionais
├── scripts/                    # Scripts de automação
│   ├── security_fixes.sh      # Correções de segurança
│   └── validate_system.py     # Validação do sistema
├── docker-compose.yml          # Orquestração containers
└── README.md                   # Este arquivo
```

---

## 🛠️ Stack Tecnológica

### Backend
- **🐍 Python 3.10+**
- **⚡ FastAPI**
- **🗄️ PostgreSQL 15+**
- **🔗 SQLAlchemy**
- **📊 Pandas**
- **🔐 JWT**
- **🛡️ SlowAPI** (Rate Limiting)
- **📊 psutil** (Monitoramento)

### Frontend
- **🌐 HTML5/CSS3/JavaScript ES6+**
- **🎨 Bootstrap 5**
- **📊 Chart.js**
- **📱 PWA**

### DevOps & Infraestrutura
- **🐳 Docker & Docker Compose**
- **🌐 Nginx**
- **🧪 pytest** (Testes)
- **📋 flake8** (Linting)

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Python 3.7+** e `pip`
- **Docker** & **Docker Compose** (Plugin V2)
- **Git** para clonagem do repositório

### Instalação Interativa

O sistema conta com um **instalador totalmente automático** que cuida de toda a configuração para você, desde a criação do usuário do banco de dados até a configuração dos containers Docker.

1. **Clone o repositório**
   ```bash
   git clone https://github.com/Mlocoes/AlugueisV2.git
   cd AlugueisV2
   ```

2. **Instale as dependências do script**
   ```bash
   pip install rich
   ```
   *Este passo é necessário para a interface bonita do instalador.*

3. **Execute o script de instalação**
   O script irá:
   - ✅ Verificar pré-requisitos (Docker, Docker Compose)
   - ✅ Solicitar configurações (usuário admin, banco, domínios)
   - ✅ Gerar arquivos `.env` automaticamente
   - ✅ Construir e iniciar containers Docker
   - ✅ Aguardar banco de dados ficar saudável
   - ✅ Criar usuário administrador automaticamente
   ```bash
   python3 scripts/install.py
   ```
   *Se o comando `python3` não for encontrado, tente usar `python`.*

4. **Acesse a aplicação**
   Ao final da instalação, o script exibirá um resumo com todos os URLs de acesso para o frontend, backend e o painel de gerenciamento do banco de dados, junto com as credenciais do usuário administrador que você configurou.

**🎉 O instalador é totalmente automático - você só precisa executar o comando e responder às perguntas de configuração!**

---

## 🧩 Módulos e Funcionalidades

### 🏠 Gestão de Proprietários
- CRUD completo de proprietários.
- Dados pessoais, contato e informações bancárias.
- Sistema de busca avançada.

### 🏢 Gestão de Imóveis
- CRUD completo de imóveis.
- Informações detalhadas: localização, características, valores.

### 💰 Gestão de Aluguéis
- Registro mensal por proprietário e imóvel.
- Cálculos automáticos de valores.

### 📊 Sistema de Participações
- Gestão de co-propriedade e sociedade.
- Controle por versões com histórico.
- Percentuais de participação por imóvel.

### 📈 Dashboard e Relatórios
- Gráficos interativos com Chart.js.
- Resumos por proprietário e período.
- Filtros avançados (ano, proprietário).

### 📤 Importação de Dados
- Upload via drag & drop.
- Templates Excel pré-formatados.
- Validação automática de dados.

### 🔐 Sistema de Autenticação
- Login obrigatório com JWT.
- Sessões seguras.
- Controle de tipos de usuário.

---

## 🛡️ Segurança e Validação

### Correções de Segurança Implementadas

O sistema inclui proteções avançadas contra vulnerabilidades comuns:

- ✅ **SQL Injection Prevention**: Validação de entrada e uso de SQLAlchemy ORM
- ✅ **XSS Protection**: Sanitização de dados no frontend com SecurityUtils
- ✅ **Rate Limiting**: Controle de frequência de requisições com SlowAPI
- ✅ **CORS Configuration**: Controle de origens permitidas
- ✅ **File Upload Security**: Validação de tipos MIME e tamanho de arquivos
- ✅ **Secrets Management**: Remoção de credenciais hardcoded
- ✅ **Input Validation**: Validação rigorosa de todos os dados de entrada

### Validação Automática

Execute a validação completa do sistema:

```bash
# Validação de segurança e integridade
python scripts/validate_system.py

# Correções automáticas de segurança
bash scripts/security_fixes.sh
```

### Monitoramento de Saúde

- 📊 **Health Checks**: Endpoint `/health` com métricas do sistema
- 📈 **Métricas em Tempo Real**: CPU, memória, disco e conectividade BD
- 🚨 **Alertas Automáticos**: Detecção de problemas de conectividade

---

## 🧪 Testes e Qualidade

### Executando Testes

```bash
# Entrar no container do backend
docker exec -it alugueisv2_backend bash

# Executar todos os testes
pytest backend/tests/ -v

# Executar testes específicos
pytest backend/tests/test_auth.py -v
pytest backend/tests/test_upload.py -v
pytest backend/tests/test_proprietarios.py -v
```

### Cobertura de Testes

- 🔐 **Autenticação**: Testes de login, JWT e rate limiting
- 📤 **Upload**: Validação de arquivos e segurança
- 👥 **Proprietários**: CRUD e validações de dados
- 🏥 **Health Checks**: Monitoramento e métricas

---

## 📚 Documentação

### Guias Disponíveis

- 📋 **[Guia de Segurança](docs/GUIA_SEGURANCA.md)**: Políticas, configurações e melhores práticas
- 🛠️ **[Guia de Desenvolvimento](docs/GUIA_DESENVOLVIMENTO.md)**: Padrões de código, testes e deployment
- 📖 **[Runbook de Operações](docs/RUNBOOK_OPERACOES.md)**: Procedimentos operacionais e manutenção

### Documentação da API

Acesse a documentação interativa da API em [http://192.168.0.7:8000/docs](http://192.168.0.7:8000/docs)

---

## 🔧 Solução de Problemas

### Importação de Alquileres (0 registros importados)

**Problema**: Al importar Excel de alquileres se leen los registros correctamente pero se importan 0.

**Causa**: Error en trigger `calcular_taxa_proprietario_automatico()` que buscaba columna `participacao` inexistente.

**Solución**: 
- Para **nuevas instalaciones**: ya está corregido en `database/init-scripts/000_estrutura_nova.sql`
- Para **instalaciones existentes**: ejecutar `database/migrations/009_fix_trigger_taxa_proprietario.sql`

```sql
-- Aplicar correção manualmente se necessario:
CREATE OR REPLACE FUNCTION calcular_taxa_proprietario_automatico()
RETURNS TRIGGER AS $$
BEGIN
    SELECT (porcentagem / 100.0) * NEW.taxa_administracao_total
    INTO NEW.taxa_administracao_proprietario
    FROM participacoes 
    WHERE proprietario_id = NEW.proprietario_id 
    AND imovel_id = NEW.imovel_id 
    LIMIT 1;
    
    IF NEW.taxa_administracao_proprietario IS NULL THEN
        NEW.taxa_administracao_proprietario := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Verificação de Importação Exitosa

```bash
# Verificar registros importados
docker exec -t alugueisV1_postgres psql -U alugueisv1_usuario -d alugueisv1_db -c "SELECT COUNT(*) FROM alugueis;"
```

### Problemas de Conectividade

```bash
# Verificar status dos containers
docker ps

# Verificar logs do backend
docker logs alugueisv2_backend

# Verificar conectividade com banco
docker exec alugueisv2_backend python -c "import psycopg2; print('DB OK')"
```

### Validação de Segurança

```bash
# Executar validação completa
python scripts/validate_system.py

# Verificar health check
curl http://localhost:8000/health
```

---

## 🚀 Deployment e Produção

### Ambiente de Produção

1. **Configurar variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Editar .env com configurações de produção
   ```

2. **Deploy com Traefik**
   ```bash
   docker-compose -f docker-compose.traefik.yml up -d
   ```

3. **Backup automático**
   ```bash
   bash scripts/backup.sh
   ```

### Monitoramento Contínuo

- 📊 **Métricas**: CPU, memória, conexões BD
- 🚨 **Alertas**: Falhas de conectividade, alto uso de recursos
- 📈 **Logs**: Centralizados e rotacionados

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- 📋 **PEP 8**: Padrão Python
- 🧪 **Testes**: Cobertura mínima 80%
- 📚 **Documentação**: Docstrings obrigatórios
- 🔒 **Segurança**: Revisão de segurança em PRs

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.
