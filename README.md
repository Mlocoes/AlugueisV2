# 🏠 Sistema de Gestão de Aluguéis V2

**Plataforma completa e profissional para gestão de aluguéis, proprietários, imóveis e participações. Desenvolvida com uma arquitetura moderna, escalável e uma interface responsiva para desktop e dispositivos móveis.**

[![Versão](https://img.shields.io/badge/versão-2.0-blue.svg)](./VERSION)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![Licença](https://img.shields.io/badge/licença-MIT-green.svg)](./LICENSE)

---

## 📋 Visão Geral

O Sistema de Gestão de Aluguéis V2 é uma solução robusta para administração imobiliária, oferecendo funcionalidades completas para o gerenciamento de proprietários, imóveis, aluguéis mensais e participações societárias. A plataforma foi construída com um backend modular em FastAPI, um frontend responsivo e uma versão mobile PWA, garantindo uma experiência de usuário fluida e acessível em qualquer dispositivo.

### ✨ Características Principais

- 🔐 **Autenticação Segura**: Sistema de autenticação baseado em JWT (JSON Web Tokens) com login obrigatório.
- 📱 **Interface Responsiva e PWA**: Experiência otimizada para desktop e uma versão mobile progressiva (PWA).
- 📊 **Dashboard Interativo**: Gráficos e métricas em tempo real para visualização de dados importantes.
- 📈 **Relatórios Avançados**: Geração de relatórios com filtros por período e proprietário.
- 📤 **Importação de Dados via Excel**: Funcionalidade de arrastar e soltar (drag & drop) para importar planilhas, com validação automática de dados.
- 🐳 **Pronto para Docker**: Orquestração completa do ambiente com Docker Compose, simplificando a instalação e o deploy.

---

## 🏗️ Arquitetura do Sistema

O sistema é dividido em três componentes principais que operam de forma integrada: Backend, Frontend e Banco de Dados.

```text
AlugueisV2/
├── backend/                    # API modular em FastAPI
│   ├── main.py                # Ponto de entrada da aplicação
│   ├── models_final.py        # Modelos de dados (SQLAlchemy)
│   ├── routers/               # Endpoints da API (ex: /imoveis, /proprietarios)
│   ├── services/              # Lógica de negócio
│   └── ...
├── frontend/                   # Interface web (Vanilla JS)
│   ├── index.html             # Página principal da aplicação
│   ├── js/                    # Código JavaScript
│   │   ├── app.js             # Lógica principal do frontend
│   │   ├── modules/           # Componentes funcionais (telas)
│   │   └── services/          # Comunicação com a API
│   └── css/                   # Estilos
├── database/                   # Scripts de banco de dados e migrações
├── docs/                       # Documentação técnica detalhada
├── docker-compose.yml          # Arquivo de orquestração dos contêineres
└── README.md                   # Este arquivo
```

### Fluxo de Dados
1.  O **Frontend** envia requisições HTTP para o **Backend**.
2.  O **Backend** (API FastAPI) processa as requisições, aplica a lógica de negócio e interage com o **Banco de Dados** (PostgreSQL).
3.  O **Banco de Dados** armazena e recupera os dados, que são retornados ao **Frontend** para exibição ao usuário.

---

## 🛠️ Stack Tecnológica

### Backend
- **🐍 Python 3.10+**
- **⚡ FastAPI** para a construção da API.
- **🗄️ PostgreSQL 15+** como banco de dados.
- **🔗 SQLAlchemy** para o ORM (Mapeamento Objeto-Relacional).
- **📊 Pandas** para manipulação de dados, especialmente na importação.
- **🔐 python-jose[cryptography]** para a implementação de JWT.

### Frontend
- **🌐 HTML5, CSS3, JavaScript (ES6+)** (Vanilla JS).
- **🎨 CSS Grid e Flexbox** para layouts responsivos.
- **📊 Chart.js** para a criação de gráficos dinâmicos.
- **📱 PWA (Progressive Web App)** para a experiência mobile.

### DevOps & Infraestrutura
- **🐳 Docker & Docker Compose** para containerização.
- **🌐 Nginx** como servidor web para o frontend.
- **🔄 Traefik** (opcional, em `docker-compose.traefik.yml`) para proxy reverso e SSL.

---

## 🚀 Instalação e Execução

### Pré-requisitos

- **Docker** e **Docker Compose** instalados na sua máquina.
- **Git** para clonar o repositório.

### Instalação Rápida

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/AlugueisV2.git
    cd AlugueisV2
    ```

2.  **Inicie os contêineres com Docker Compose:**
    Este comando irá construir as imagens e iniciar todos os serviços (backend, frontend e banco de dados).
    ```bash
    docker-compose up -d --build
    ```

3.  **Acesse a aplicação no seu navegador:**
    - 🌐 **Frontend Desktop**: [http://localhost:3000](http://localhost:3000)
    - 📚 **Documentação da API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Credenciais Padrão

-   **Usuário**: `admin`
-   **Senha**: `admin`

---

## 🤝 Como Contribuir

Contribuições são bem-vindas! Se você deseja melhorar o sistema, siga os passos abaixo:

1.  **Faça um Fork** do projeto.
2.  **Crie uma nova Branch** para sua feature: `git checkout -b feature/minha-feature`.
3.  **Faça suas alterações** e realize os commits: `git commit -m 'feat: Adiciona minha nova feature'`.
4.  **Envie suas alterações** para a sua branch: `git push origin feature/minha-feature`.
5.  **Abra um Pull Request** para que possamos avaliar as mudanças.

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License**. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.
