# 🏠 Sistema de Gestão de Aluguéis V1

**Plataforma completa e profissional para gestão de aluguéis, proprietários, imóveis e participações. Arquitetura moderna, escalável e com interface responsiva para desktop e mobile.**

[![Versão](https://img.shields.io/badge/versão-1.0-blue.svg)](./VERSION)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Licença](https://img.shields.io/badge/licença-MIT-green.svg)](./LICENSE)

---

## 📋 Visão Geral

O Sistema de Gestão de Aluguéis V1 é uma solução completa para administração imobiliária, oferecendo funcionalidades robustas para gestão de proprietários, imóveis, aluguéis mensais e participações societárias. A plataforma conta com backend modular FastAPI, frontend responsivo e versão mobile PWA.

### ✨ Características Principais

- �️ **Arquitetura Modular**: Backend organizado por módulos específicos
- 🔐 **Autenticação Segura**: Sistema JWT com login obrigatório
- 📱 **Interface Responsiva**: Desktop e versão mobile PWA
- 📊 **Dashboard Interativo**: Gráficos e métricas em tempo real
- 📈 **Relatórios Avançados**: Filtros por período e proprietário
- 📤 **Importação Excel**: Drag & drop com validação automática
- 🔄 **Scroll Vertical**: Interface consistente em todas as telas
- 🐳 **Docker Ready**: Orquestração completa com Docker Compose

---

## 🏗️ Arquitetura do Sistema

### Estrutura de Pastas

```text
AlugueisV1/
├── backend/                    # API FastAPI modular
│   ├── main.py                # Aplicação principal
│   ├── config.py              # Configurações
│   ├── models_final.py        # Modelos de dados
│   ├── database.py            # Conexão BD
│   ├── requirements.txt       # Dependências Python
│   ├── routers/              # Endpoints organizados
│   │   ├── auth.py           # Autenticação JWT
│   │   ├── alugueis.py       # CRUD aluguéis
│   │   ├── proprietarios.py  # CRUD proprietários
│   │   ├── imoveis.py        # CRUD imóveis
│   │   ├── participacoes.py  # Sistema participações
│   │   ├── reportes.py       # Relatórios e estatísticas
│   │   └── importacao.py     # Importação Excel
│   └── migrations/           # Migrações BD
├── frontend/                 # Interface web principal
│   ├── index.html           # Página principal
│   ├── mobile/              # Versão PWA mobile
│   │   ├── index.html       # Interface mobile
│   │   ├── manifest.json    # Configuração PWA
│   │   ├── sw.js           # Service Worker
│   │   └── js/             # Scripts mobile
│   └── src/
│       ├── css/
│       │   └── main.css     # Estilos globais
│       └── js/
│           ├── app.js       # Aplicação principal
│           ├── core/
│           │   ├── config.js    # Configurações
│           │   └── ui-manager.js # Gerenciador UI
│           ├── modules/         # Módulos funcionais
│           │   ├── dashboard.js
│           │   ├── loginManager.js
│           │   ├── proprietarios.js
│           │   ├── imoveis.js
│           │   ├── alugueis.js
│           │   ├── participacoes.js
│           │   ├── relatorios.js
│           │   └── importacao.js
│           └── services/       # Serviços
│               ├── api.js      # Cliente API
│               └── authService.js # Autenticação
├── database/                # Scripts BD e backups
├── docs/                    # Documentação técnica
├── scripts/                 # Scripts automação
├── docker-compose.yml       # Orquestração containers
├── nginx-frontend.conf      # Configuração proxy
└── install.sh              # Script instalação
```

---

## 🛠️ Stack Tecnológica

### Backend
- **🐍 Python 3.10+** - Linguagem principal
- **⚡ FastAPI** - Framework web moderno
- **🗄️ PostgreSQL 15+** - Banco de dados principal
- **🔗 SQLAlchemy** - ORM para Python  
- **📊 Pandas** - Processamento dados Excel
- **🔐 JWT** - Autenticação segura
- **📝 Pydantic** - Validação de dados
- **🚀 Uvicorn** - Servidor ASGI

### Frontend
- **🌐 HTML5/CSS3/JavaScript ES6+** - Tecnologias web
- **🎨 Bootstrap 5** - Framework CSS
- **📊 Chart.js** - Gráficos interativos
- **📱 PWA** - Progressive Web App
- **🔄 Fetch API** - Comunicação com backend
- **📋 Modular Architecture** - Organização por módulos

### DevOps & Infraestrutura
- **🐳 Docker & Docker Compose** - Containerização
- **🌐 Nginx** - Proxy reverso e servidor web
- **📁 Volume Persistence** - Dados persistentes
- **📊 Health Checks** - Monitoramento de saúde
- **📝 Logging** - Sistema de logs centralizado

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- **Docker** & **Docker Compose** instalados
- **Git** para clonagem do repositório
- Portas disponíveis: `3000` (frontend), `8000` (backend), `5432` (PostgreSQL)

### Instalação Rápida

1. **Clone o repositório**
   ```bash
   git clone https://github.com/Mlocoes/AlugueisV1.git
   cd AlugueisV1
   ```

2. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Edite o arquivo .env conforme necessário
   ```

3. **Inicie o sistema completo**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

4. **Acesse a aplicação**
   - 🌐 **Frontend Desktop**: [http://localhost:3000](http://localhost:3000)
   - 📱 **Versão Mobile**: [http://localhost:3000/mobile](http://localhost:3000/mobile)  
   - 🔧 **API Backend**: [http://localhost:8000](http://localhost:8000)
   - 📚 **Documentação API**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Usuário Padrão

- **Usuário**: `admin`
- **Senha**: `admin`

---

## 🧩 Módulos e Funcionalidades

### 🏠 Gestão de Proprietários
- ✅ CRUD completo de proprietários
- 📋 Dados pessoais, contato e informações bancárias
- 🔍 Sistema de busca avançada
- 📱 Interface responsiva com scroll vertical

### 🏢 Gestão de Imóveis  
- ✅ CRUD completo de imóveis
- 🏠 Informações detalhadas: localização, características, valores
- 📐 Área total, área construída, quartos, banheiros
- 🏷️ Status: ativo/inativo para controle de disponibilidade

### 💰 Gestão de Aluguéis
- ✅ Registro mensal por proprietário e imóvel
- 💵 Valores: bruto, líquido, taxas e deduções
- 📅 Controle por mês/ano com matriz visual
- 🔢 Cálculos automáticos de valores

### 📊 Sistema de Participações
- ✅ Gestão de co-propriedade e sociedade
- 🔄 Controle por versões com histórico
- 📈 Percentuais de participação por imóvel
- 👥 Múltiplos proprietários por imóvel

### 📈 Dashboard e Relatórios
- 📊 Gráficos interativos com Chart.js
- 📋 Resumos por proprietário e período
- 🔍 Filtros avançados (ano, proprietário)
- ⚡ Métricas em tempo real
- 📱 Interface limpa sem elementos desnecessários

### 📤 Importação de Dados
- 📥 Upload via drag & drop
- 📋 Templates Excel pré-formatados
- ✅ Validação automática de dados
- 📝 Log detalhado de importações
- 🔄 Auditoria completa do processo

### 🔐 Sistema de Autenticação
- 🛡️ Login obrigatório com JWT
- 🔑 Sessões seguras (não persistidas)
- 👤 Controle de tipos de usuário
- 🚪 Logout automático ao recarregar página

---

## 📱 Versão Mobile (PWA)

### Características PWA
- 📱 **Progressive Web App** completa
- 🔄 **Service Worker** para cache offline
- 📲 **Instalável** como app nativo
- 🎨 **Interface otimizada** para mobile
- 🧭 **Navegação inferior** intuitiva

### Funcionalidades Mobile
- 📊 Dashboard com métricas adaptadas
- 👥 Gestão de proprietários simplificada
- 🏢 Visualização de imóveis otimizada
- 💰 Controle de aluguéis mobile-friendly
- 📈 Participações com interface touch

---

## 🔗 API Endpoints Principais

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST   | `/auth/login` | Login de usuário |
| POST   | `/auth/validate` | Validar token |

### Proprietários
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/proprietarios/` | Listar proprietários |
| POST   | `/proprietarios/` | Criar proprietário |
| PUT    | `/proprietarios/{id}` | Atualizar proprietário |
| DELETE | `/proprietarios/{id}` | Excluir proprietário |

### Imóveis
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/imoveis/` | Listar imóveis |
| POST   | `/imoveis/` | Criar imóvel |
| PUT    | `/imoveis/{id}` | Atualizar imóvel |
| DELETE | `/imoveis/{id}` | Excluir imóvel |

### Aluguéis
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/alugueis/` | Listar aluguéis |
| POST   | `/alugueis/` | Criar aluguel |
| PUT    | `/alugueis/{id}` | Atualizar aluguel |
| DELETE | `/alugueis/{id}` | Excluir aluguel |

### Participações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/participacoes/` | Listar participações |
| POST   | `/participacoes/nova-versao` | Criar nova versão |
| PUT    | `/participacoes/{id}` | Atualizar participação |

### Relatórios
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | `/reportes/anos-disponiveis` | Anos disponíveis |
| GET    | `/reportes/resumen-mensual` | Resumo mensal |

### Importação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST   | `/importacao/excel` | Importar Excel |
| GET    | `/importacao/templates` | Download templates |

---

## 📊 Esquema de Banco de Dados

### Tabelas Principais

#### 👥 `proprietarios`
- Dados pessoais completos
- Informações de contato
- Dados bancários
- Timestamps de auditoria

#### 🏢 `imoveis`
- Informações da propriedade
- Localização detalhada
- Características físicas
- Status ativo/inativo

#### 💰 `alugueis_simples`
- Registros mensais únicos
- Valores bruto e líquido
- Associação proprietário-imóvel
- Controle por mês/ano

#### 📈 `participacoes`
- Sistema de co-propriedade
- Percentuais por imóvel
- Controle por versões
- Histórico de alterações

#### 📋 `log_importacoes`
- Auditoria de importações
- Status e resultados
- Timestamps detalhados
- Rastreamento de erros

### Relacionamentos
- **1:N** - Um proprietário pode ter múltiplos aluguéis
- **1:N** - Um imóvel pode ter múltiplos aluguéis
- **N:M** - Participações conectam proprietários e imóveis
- **Unique Constraints** - Aluguel único por proprietário/imóvel/período

---

## 🔧 Comandos e Scripts

### Docker Compose
```bash
# Iniciar serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços  
docker-compose down

# Reconstruir imagens
docker-compose build --no-cache

# Status dos serviços
docker-compose ps
```

### Desenvolvimento
```bash
# Modo desenvolvimento backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Modo desenvolvimento frontend
cd frontend
python -m http.server 3000
```

### Banco de Dados
```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U alugueisv1_usuario -d alugueisv1_db

# Backup
docker-compose exec postgres pg_dump -U alugueisv1_usuario alugueisv1_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U alugueisv1_usuario -d alugueisv1_db < backup.sql
```

---

## ⚡ Troubleshooting

### Problemas Comuns

#### **Porta já em uso**
```bash
# Verificar processos
sudo netstat -tlnp | grep ':3000\|:8000\|:5432'

# Parar containers
docker-compose down

# Limpar sistema Docker
docker system prune -f
```

#### **Erro de conexão com banco**
```bash
# Reiniciar apenas PostgreSQL
docker-compose restart postgres

# Ver logs do banco
docker-compose logs postgres -f

# Verificar saúde do container
docker-compose ps
```

#### **Frontend não carrega**
```bash
# Verificar status
curl -I http://localhost:3000

# Reconstruir frontend
docker-compose build frontend --no-cache
docker-compose up -d frontend
```

#### **Erro na importação Excel**
- Verifique se o arquivo segue o template fornecido
- Confirme que as colunas obrigatórias estão presentes
- Verifique a codificação do arquivo (UTF-8)
- Consulte os logs em `docker-compose logs backend`

### Logs e Monitoramento
```bash
# Logs de todos os serviços
docker-compose logs -f

# Logs específicos
docker-compose logs backend -f
docker-compose logs frontend -f
docker-compose logs postgres -f

# Status e recursos
docker stats
```

---

## 📚 Funcionalidades Recentes

### ✅ Melhorias Implementadas
- 🗑️ **Elementos removidos**: Total Proprietários, Valor Total, Média por Registro
- 🚫 **Botões eliminados**: Atualizar Relatório, Exportar Excel, Copiar  
- 📏 **Scroll vertical**: Aplicado consistentemente em todas as telas
- 🎯 **Interface limpa**: Relatórios simplificados e focados
- 🔧 **Correções de erro**: Eliminadas referências a elementos removidos

### 📱 PWA Mobile
- 📲 Instalável como aplicativo nativo
- 🔄 Cache offline com Service Worker
- 🧭 Navegação inferior otimizada
- 📊 Interface adaptada para touch
- ⚡ Performance otimizada

---

## 🚀 Roadmap Futuro

### Curto Prazo
- [ ] 🔐 Expansão do sistema de roles/permissões
- [ ] 📊 Novos tipos de relatórios e gráficos
- [ ] 🔄 Sincronização offline para PWA
- [ ] 📧 Sistema de notificações

### Médio Prazo  
- [ ] 📱 App mobile nativo (React Native/Flutter)
- [ ] 🌐 API GraphQL complementar
- [ ] 🔗 Integrações bancárias
- [ ] 📄 Geração de contratos PDF

### Longo Prazo
- [ ] 🤖 Análise preditiva com IA
- [ ] ⛓️ Integração blockchain para contratos
- [ ] 🌍 Versão multi-idioma
- [ ] 🏢 Sistema multi-empresa

---

## 🤝 Contribuição

### Como Contribuir
1. 🍴 Faça fork do repositório
2. 🌿 Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. ✍️ Faça commits descritivos
4. 📤 Push e abra Pull Request
5. 📋 Siga os padrões de código

### Padrões de Desenvolvimento
- **Python**: Seguir PEP 8
- **JavaScript**: ES6+ com comentários JSDoc
- **Commits**: Mensagens claras e descritivas
- **Testes**: Incluir testes quando aplicável
- **Documentação**: Atualizar README quando relevante

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

### Permissões
- ✅ Uso comercial
- ✅ Modificação  
- ✅ Distribuição
- ✅ Uso privado

### Limitações
- ❌ Responsabilidade
- ❌ Garantia

---

## � Créditos e Agradecimentos

### Desenvolvido por
- **Mlocoes** - [GitHub](https://github.com/Mlocoes)

### Tecnologias Utilizadas
- [FastAPI](https://fastapi.tiangolo.com/) - Framework web Python
- [PostgreSQL](https://www.postgresql.org/) - Banco de dados
- [Bootstrap](https://getbootstrap.com/) - Framework CSS
- [Chart.js](https://www.chartjs.org/) - Biblioteca de gráficos
- [Docker](https://www.docker.com/) - Containerização

### Agradecimentos
- Comunidade open source
- Contribuidores do projeto
- Usuários e testadores

---

⭐ **Se este projeto foi útil, considere dar uma estrela no GitHub!** ⭐

---

## 📞 Suporte

Para suporte, dúvidas ou sugestões:

- 🐛 **Issues**: [GitHub Issues](https://github.com/Mlocoes/AlugueisV1/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/Mlocoes/AlugueisV1/discussions)
- 📧 **E-mail**: [Contato do desenvolvedor]

**Documentação completa**: Consulte a pasta `/docs` para documentação técnica detalhada.

---

*Última atualização: Setembro 2025*
- **JWT** (autenticação)

### Frontend
- **HTML5/CSS3/JavaScript ES6+**
- **Bootstrap 5**
- **Chart.js**
- **Fetch API**

### DevOps
- **Docker & Docker Compose**
- **Nginx** (opcional)
- **Adminer** (gestão BD)
- **Bash Scripts**

---

## 🚀 Instalação Rápida (Docker)

1. **Clone e acesse o projeto**
   ```bash
   git clone https://github.com/[SEU_USUARIO]/SistemaAlugueisV2.git
   cd SistemaAlugueisV2
   ```
2. **Inicie todo o sistema**
   ```bash
   chmod +x run_script.sh
   ./run_script.sh start
   ```
3. **Acesse o sistema**
   - 🌐 **Frontend**: http://localhost:3000
   - 🔧 **API Backend**: http://localhost:8000
   - 📚 **Documentação API**: http://localhost:8000/docs
   - 🗄️ **Adminer (BD)**: http://localhost:8080

---

## 🔒 Novas Funcionalidades de Autenticação

### Login Seguro
- Modal de login obrigatório para todos os usuários
- Autenticação via usuário e senha (exemplo: admin/admin)
- Token JWT gerado e validado no backend
- Dados de autenticação mantidos apenas na sessão (não são salvos no navegador)
- A cada recarregamento de página, o sistema exige novo login
- Logout limpa todos os dados e força novo login

### Fluxo de Usuário
1. **Acesso ao sistema:** Modal de login aparece automaticamente
2. **Login realizado:** Usuário acessa todas as funcionalidades normalmente
3. **Recarregamento (Ctrl+F5):** Modal de login aparece novamente, exigindo nova autenticação
4. **Logout:** Limpa dados e exige novo login

### Segurança
- Nenhum dado de autenticação é persistido entre sessões
- Validação de token sempre feita no backend
- Usuário só acessa o sistema após autenticação válida

---

## 🧩 Módulos e Funcionalidades

### Backend (FastAPI)
- CRUD completo de proprietários, imóveis, aluguéis e participações
- Importação de dados via Excel (validação, logs, auditoria)
- Endpoints RESTful documentados
- Relatórios e estatísticas avançadas
- Segurança e validação de dados
- Autenticação JWT

### Frontend
- Interface moderna e responsiva
- Dashboard com gráficos interativos
- Sistema de navegação modular
- Importação de dados com drag&drop e templates Excel
- Validação e análise prévia dos dados
- Modal de login obrigatório

### Banco de Dados
- Estrutura normalizada e otimizada
- Relacionamento entre proprietários, imóveis, aluguéis e participações
- Auditoria de importações
- Scripts de migração e limpeza

### Automação e Scripts
- Scripts para migração, backup, limpeza e verificação
- Orquestração completa com Docker Compose
- Monitoramento e logs centralizados

---

## 🔗 Endpoints Principais

### Aluguéis
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET    | /alugueis/           | Listar aluguéis |
| POST   | /alugueis/           | Criar aluguel   |
| PUT    | /alugueis/{id}       | Atualizar aluguel |
| DELETE | /alugueis/{id}       | Excluir aluguel |

### Proprietários
| Método | Endpoint | Descrição |
|--------|----------|-------------|
| GET    | /api/v1/propietarios/ | Listar proprietários |
| POST   | /api/v1/propietarios/ | Criar proprietário |

### Inmuebles
| Método | Endpoint | Descrição |
|--------|----------|-------------|
| GET    | /api/v1/inmuebles/ | Listar imóveis |
| POST   | /api/v1/inmuebles/ | Criar imóvel |

### Importação Excel
| Método | Endpoint | Descrição |
|--------|----------|-------------|
| POST   | /api/v1/importacao/excel/ | Importar dados desde Excel |

---

## 📥 Importação Masiva e Plantilhas Excel

O sistema suporta importação massiva de dados desde arquivos Excel. São fornecidas plantilhas para cada tipo de entidade:

- **Base2025.xlsx**: Proprietários, imóveis, participações, aluguéis
- **ModeloPropietarios.xlsx**: Estrutura de proprietários
- **ModeloInmuebles.xlsx**: Estrutura de imóveis
- **ModeloParticipacoes.xlsx**: Estrutura de participações
- **ModeloAlquileres.xlsx**: Estrutura de aluguéis

**Passos para importar:**
1. Baixar a plantilha pela interface
2. Preencher os dados seguindo o modelo
3. Subir o arquivo via drag&drop ou seleção
4. Analisar estrutura e validar dados
5. Confirmar importação

**Validações automáticas:**
- Formato e colunas requeridas
- Integridade referencial
- Unicidade de registros
- Auditoria e log de importações

---

## � Dashboard e Relatórios

- Gráficos de evolução mensal/anual
- Resumos por proprietário, imóvel e período
- Filtros avançados e exportação de dados
- Métricas financeiras em tempo real

---

## 🗄️ Esquema de Banco de Dados

Tabelas principais:
- **propietarios**: Dados pessoais e bancários
- **inmuebles**: Informação detalhada de propriedades
- **alquileres_simple**: Registro mensal por proprietário e imóvel
- **participaciones**: Porcentagens de co-propriedade
- **log_importaciones_simple**: Auditoria de importações

Relações:
- Um proprietário pode ter muitos aluguéis e participações
- Um imóvel pode ter muitos aluguéis e participações
- Um aluguel é único por imóvel, proprietário, mês e ano

Restrições:
- Unicidade e checks em campos chave
- Integridade referencial e lógica

---

## ⚡ Troubleshooting e Manutenção

### Problemas Comuns
- Porta ocupada: `./run_script.sh stop && ./run_script.sh start`
- Banco de dados não acessível: `docker-compose restart postgres`
- Importação falhou: Verificar formato e logs em `logs/import_*.log`

### Scripts de Manutenção
- `aplicar_estrutura_final.sh`: Migração de BD
- `limpar_base_datos.sh`: Limpeza completa
- `backup_database.sh`: Backup manual
- `reset_emergencia.sh`: Reseteo total

### Monitoramento
- Logs centralizados em `logs/`
- Comando: `./run_script.sh logs -f`

---

## 🚀 Roadmap e Melhorias Futuras

- Autenticação JWT e roles
- Dashboard avançado com WebSockets
- Exportação de relatórios PDF/Excel
- App móvel nativa
- Integração bancária e blockchain
- Tests automatizados e CI/CD

---

## 🤝 Contribuição

1. Faça um fork do repositório
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Realize commits descritivos
4. Faça push e abra um Pull Request
5. Siga os padrões de código e documentação

---

## 📄 Licença e Créditos

MIT. Ver [LICENSE](LICENSE).

**Desenvolvido por:** Seu Nome ([Seu GitHub](https://github.com/seu-usuario)) e colaboradores

**Agradecimentos:** FastAPI, PostgreSQL, Bootstrap, Chart.js e a comunidade open source

---

⭐ **Dê uma estrela se foi útil!** ⭐

## 🚀 Vista Geral do Sistema

O **Sistema de Aluguéis V2** é uma solução completa que automatiza a gestão de:
- **Imóveis**: Propriedades com informação detalhada (localização, características, valores)
- **Proprietários**: Gestão completa de dados pessoais e bancários
- **Aluguéis**: Registro mensal com cálculos automáticos de taxas e valores líquidos
- **Relatórios**: Dashboard com métricas financeiras e gráficos interativos
- **Importação/Exportação**: Integração com Excel para migração massiva de dados

---

## 🔧 Troubleshooting e Resolução de Problemas

### **🚨 Problemas Comuns**

#### **Erro: Porta já em uso**
```bash
# Verificar processos usando portas
sudo netstat -tlnp | grep ':8000\|:3000\|:5432'

# Parar serviços se estiverem em execução
./run_script.sh stop

# Forçar limpeza de contêineres
docker-compose down --remove-orphans
docker system prune -f
```

#### **Erro: Banco de dados não acessível**
```bash
# Verificar estado do PostgreSQL
./run_script.sh status

# Reiniciar apenas o banco de dados
docker-compose restart postgres

# Ver logs do banco de dados
docker-compose logs postgres -f
```

#### **Erro: Frontend não carrega**
```bash
# Verificar estado do frontend
curl -I http://localhost:3000

# Reiniciar frontend
docker-compose restart frontend

# Reconstruir frontend
docker-compose build frontend --no-cache
```

#### **Erro: Importação de Excel falhou**
```bash
# Verificar formato do arquivo
# O arquivo deve ter as colunas requeridas
# Verificar encoding (deve ser UTF-8)

# Ver logs específicos de importação
tail -f logs/import_*.log

# Testar com arquivo de exemplo
curl -X POST -F "file=@Base2025.xlsx" http://localhost:8000/api/v1/importacao/excel/
```

### **🔍 Comandos de Diagnóstico**

#### **Estado do Sistema**
```bash
# Estado completo do sistema
./run_script.sh check

# Estado de serviços Docker
docker-compose ps

# Uso de recursos
docker stats

# Logs em tempo real
./run_script.sh logs -f
```

#### **Verificação de Banco de Dados**
```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U admin -d aluguel_db

# Verificar tabelas
\dt

# Contar registros
SELECT COUNT(*) FROM proprietarios;
SELECT COUNT(*) FROM inmuebles;
SELECT COUNT(*) FROM alquileres_simple;
```

#### **Verificação de API**
```bash
# Health check
curl http://localhost:8000/health

# Documentação de API
curl http://localhost:8000/docs

# Teste de endpoints
curl -X GET http://localhost:8000/api/v1/propietarios/
curl -X GET http://localhost:8000/api/v1/estadisticas/resumo/
```

### **🛠 Scripts de Manutenção**

#### **Limpeza do Sistema**
```bash
# Limpeza leve (mantém dados)
./scripts/limpar_sistema.sh --light

# Limpeza completa (elimina todos os dados)
./scripts/limpar_sistema_completo.sh

# Limpeza de logs
./scripts/clean_logs.sh
```

#### **Backup e Restauração**
```bash
# Criar backup automático
./run_script.sh backup

# Restaurar desde backup
./run_script.sh restore backup_2024-01-15.sql

# Backup manual
./scripts/backup_database.sh
```

#### **Reseteo de Emergência**
```bash
# Em caso de problemas graves
./reset_emergencia.sh

# Este script:
# 1. Para todos os serviços
# 2. Remove contêineres e volumes
# 3. Reconstrói tudo do zero
# 4. Aplica a estrutura de BD
# 5. Inicia serviços
```

### **📋 Logs e Monitoramento**

#### **Localizações de Logs**
| Tipo | Localização | Descrição |
|------|-----------|-------------|
| Sistema | `logs/system.log` | Logs gerais do sistema |
| Backend | `logs/backend.log` | Logs de FastAPI |
| Banco de Dados | `logs/postgres.log` | Logs de PostgreSQL |
| Importação | `logs/import_*.log` | Logs de importações |
| Nginx | `logs/nginx.log` | Logs do servidor web |

#### **Monitoramento em Tempo Real**
```bash
# Todos os logs
tail -f logs/*.log

# Apenas erros
grep -i error logs/*.log | tail -f

# Logs específicos por serviço
docker-compose logs backend -f
docker-compose logs postgres -f
docker-compose logs frontend -f
```

### **⚡ Otimização de Desempenho**

#### **PostgreSQL**
```sql
-- Otimizar consultas lentas
EXPLAIN ANALYZE SELECT * FROM aluguel_simple 
JOIN inmuebles ON aluguel_simple.inmueble_id = inmuebles.id;

-- Reconstruir índices
REINDEX DATABASE aluguel_db;

-- Atualizar estatísticas
ANALYZE;
```

#### **Contêineres Docker**
```bash
# Limpeza de imagens não utilizadas
docker image prune -f

# Otimizar uso de memória
docker-compose down
docker-compose up -d --scale backend=2  # Escalar se necessário

# Monitorar recursos
docker stats --format "table {{.Container}}	{{.CPUPerc}}	{{.MemUsage}}"
```

---

## 🗄️ Esquema e Relações do Banco de Dados

### Tabelas Principais

- **proprietarios**: Informação de cada proprietário (nome, documento, dados bancários, etc.).
- **inmuebles**: Informação de cada imóvel (nome, endereço, tipo, cidade, etc.).
- **alquileres_simple**: Registro de cada aluguel mensal por proprietário e imóvel, com cálculo automático de taxas e valores líquidos.
- **log_importaciones_simple**: Histórico de importações de dados desde Excel.

### Relações Chave

- Um **proprietário** pode ter muitos registros em **alquileres_simple** (`proprietarios.id` → `alquileres_simple.propietario_id`).
- Um **imóvel** pode estar associado a muitos registros em **alquileres_simple** (relação lógica por nome, não FK direta).
- **alquileres_simple** representa a relação mensal entre um proprietário e um imóvel.

### Restrições e Integridade

- Unicidade em `alquileres_simple` por (`nome_propriedade`, `mes`, `ano`, `proprietario_id`).
- Unicidade em `inmuebles` por `nome` e `endereco`.
- Checks: mes entre 1-12, ano entre 2020-2050, taxas não negativas.
- Integridade referencial explícita para proprietários, lógica para imóveis.

---

### 🔗 Relações e Restrições

```mermaid
erDiagram
    PROPIETARIOS ||--o{ ALQUILERES_SIMPLE : "posee"
    INMUEBLES ||--o{ ALQUILERES_SIMPLE : "genera"
    PROPIETARIOS ||--o{ PARTICIPACIONES : "participa_en"
    INMUEBLES ||--o{ PARTICIPACIONES : "tiene_participantes"
    LOG_IMPORTACIONES_SIMPLE }|--|| ALQUILERES_SIMPLE : "importa"

    PROPIETARIOS {
        int id PK
        string nombre UK
        string apellido
        string documento
        string banco
        string cuenta
        boolean activo
        timestamp fecha_creacion
    }
    
    INMUEBLES {
        int id PK
        string uuid
        string nombre UK
        string direccion_completa
        string tipo
        numeric area_total
        int dormitorios
        numeric valor_mercado
        boolean activo
    }
    
    ALQUILERES_SIMPLE {
        int id PK
        int inmueble_id FK
        int propietario_id FK
        int mes "1-12"
        int ano "2020-2050"
        numeric valor_alquiler_propietario
        numeric taxa_administracao_total
        numeric valor_liquido_propietario
        timestamp fecha_creacion
    }
    
    PARTICIPACIONES {
        int id PK
        int propietario_id FK
        int inmueble_id FK
        numeric porcentaje "0-100"
    }
    
    LOG_IMPORTACIONES_SIMPLE {
        int id PK
        string nombre_archivo
        int registros_procesados
        int registros_exitosos
        string estado
        timestamp fecha_importacion
    }
```

#### **Restrições de Integridade**

**Restrições Únicas:**
- `proprietarios.nome` - Um nome por proprietário
- `inmuebles.nome` - Um nome por imóvel
- `alquileres_simple(inmueble_id, mes, ano, propietario_id)` - Um aluguel por período

**Validações de Negócio:**
- `mes` entre 1 e 12
- `ano` entre 2020 e 2050
- `taxa_administracao_total >= 0`
- `porcentaje` em participações entre 0 e 100

**Índices Otimizados:**
- `idx_alquileres_inmueble` em `inmueble_id`
- `idx_alquileres_propietario` em `propietario_id`
- `idx_alquileres_periodo` em `(ano, mes)`
- `idx_alquileres_fecha_creacion` em `fecha_creacion`

---

## �🛠️ Tecnologias Utilizadas

### Backend
- **FastAPI** (Python)
- **SQLAlchemy** (ORM)
- **PostgreSQL**
- **Pandas** (processamento de Excel)
- **Uvicorn** (ASGI server)

### Frontend
- **HTML5/CSS3/JavaScript**
- **Bootstrap 5**
- **Chart.js**
- **Fetch API**

### DevOps
- **Docker & Docker Compose**
- **Nginx** (opcional)
- **Git**

---

## 🎮 Sistema de Gestão e Automação

### 🚀 Script Mestre (`run_script.sh`)

O script principal centraliza todas as operações do sistema:

```bash
./run_script.sh <comando> [opções]
```

#### **Comandos Principais**

| Comando | Descrição | Exemplo |
|---------|-------------|---------|
| `start` | Inicia todo o sistema com Docker | `./run_script.sh start` |
| `stop` | Para todos os serviços | `./run_script.sh stop` |
| `restart` | Reinicia o sistema completo | `./run_script.sh restart` |
| `status` | Verifica o estado de serviços | `./run_script.sh status` |
| `logs` | Mostra logs do sistema | `./run_script.sh logs` |
| `clean` | Limpa contêineres e volumes | `./run_script.sh clean` |
| `backup` | Cria backup do banco de dados | `./run_script.sh backup` |
| `restore` | Restaura backup | `./run_script.sh restore <arquivo>` |
| `migrate` | Executa migrações de BD | `./run_script.sh migrate` |
| `check` | Verificação completa do sistema | `./run_script.sh check` |

### 🤖 Scripts Especializados (`/scripts`)

#### **Gestão de Banco de Dados**
- `aplicar_estrutura_final.sh` - Migração a nova estrutura
- `limpar_base_datos.sh` - Limpeza completa de dados
- `gestionar_db.sh` - Operações avançadas de BD

#### **Operações do Sistema**
- `start_total_system.sh` - Início completo
- `stop_total_system.sh` - Parada controlada
- `check_system_status.sh` - Verificação de estado
- `system_summary.sh` - Resumo do sistema

#### **Manutenção**
- `limpar_sistema_completo.sh` - Limpeza total
- `verificar_estado.sh` - Diagnóstico avançado

### 📊 Monitoramento e Logs

**Localizações de logs:**
- `logs/backend.log` - Logs do servidor FastAPI
- `logs/database.log` - Logs de PostgreSQL
- `logs/import_*.log` - Logs de importações
- `logs/system.log` - Logs do sistema geral

**Comando para monitoramento em tempo real:**
```bash
./run_script.sh logs -f  # Seguimento em tempo real
tail -f logs/*.log        # Todos os logs
```

---

## 🆕 Mudanças Recentes no Frontend Móvel

- O dashboard agora soma corretamente os valores de aluguel usando o campo `valor_liquido_proprietario`.
- A tela de imóveis exibe o status "Alugado" de acordo com o campo `ativo` (Sim = ativo, Não = inativo).
- A tela de aluguéis mostra os valores reais, corrigindo o uso do campo do backend.
- Todas as telas foram revisadas para garantir que os dados exibidos correspondam aos valores reais do banco de dados.

---

## � Dashboard e Funcionalidades Avançadas

- **Gráficos de distribuição** por imóvel e proprietário.
- **Filtros avançados**: ano, mes, proprietário, imóvel.
- **Exportação de dados**: JSON e CSV.
- **Importação massiva** desde Excel (`Base2025.xlsx`, `Exemplo_Estrutura_Simple.xlsx`).
- **Relatórios financeiros**: totais, médias, crescimento mensal/anual.
- **Estado do sistema**: health check e verificação de conexão.

---

## 🚀 Despliegue e Produção

### Desenvolvimento Local
```bash
./run_script.sh start
```

### Produção
1. Configurar variáveis de ambiente (ver `.env.example` se existir)
2. Usar Docker Compose com perfil de produção
3. Configurar nginx como proxy reverso (opcional)
4. Implementar SSL/TLS se necessário

---

## 🤝 Contribuição e Boas Práticas

1. Faça fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Realize commits descritivos
4. Faça push e abra um Pull Request

**Padrões:**
- Scripts em `scripts/` usando template
- Documentação atualizada em cada mudança relevante
- Código Python seguindo PEP8

---

## 📚 Documentação e Recursos

- [`docs/`](./docs/) - Documentação técnica, migrações e estrutura
- [`scripts/README.md`](./scripts/README.md) - Uso de scripts e automação
- [API Docs](http://localhost:8000/docs) - Swagger interativo (requer backend ativo)

---

## 🐛 Solução de Problemas

**Porta ocupada:**
```bash
./run_script.sh stop
./run_script.sh start
```

**Banco de dados corrompido:**
```bash
./run_script.sh clean-db
```

**Sistema não responde:**
```bash
./run_script.sh check
```

---

## 📄 Licença

MIT. Ver [LICENSE](LICENSE).

---

## 👥 Autoría e Créditos

- **Desenvolvimento inicial:** Seu Nome ([Seu GitHub](https://github.com/seu-usuario))
- **Colaboradores:** Ver histórico de commits

**Agradecimentos:**
- FastAPI, PostgreSQL, Bootstrap, Chart.js e a comunidade open source.

---

⭐ **Dê uma estrela se foi útil!** ⭐
