
# Sistema de Aluguéis V2 - Frontend

## 📝 Descrição

Este é o frontend otimizado do Sistema de Aluguéis V2, desenvolvido com arquitetura modular, UI responsiva e integração total com o backend via API REST. O sistema permite gerenciar proprietários, imóveis, participações e aluguéis de forma eficiente e intuitiva.

## 🏗️ Estrutura de Pastas

```
frontend/
├── index.html                 # Interface principal
├── serve.sh                   # Script para servidor de desenvolvimento
├── README.md                  # Este arquivo
└── src/
    ├── css/
    │   └── main.css           # Estilos globais
    └── js/
        ├── app.js             # Inicialização da aplicação
        ├── core/
        │   ├── config.js      # Configuração global
        │   └── ui-manager.js  # Gerenciador de interface
        ├── modules/
        │   ├── proprietarios.js
        │   ├── imoveis.js
        │   ├── participacoes.js
        │   └── alugueis.js
        └── services/
            └── api.js         # Serviço centralizado de API
```

## ✨ Funcionalidades

- Interface moderna, responsiva e mobile-first
- Tabelas padronizadas para todas as entidades (proprietários, imóveis, participações, aluguéis)
- Botões de ação com ícones consistentes (visualizar, editar, excluir)
- Busca, filtros e atualização dinâmica dos dados
- Importação de dados via arquivos Excel
- Alertas e feedbacks visuais inteligentes
- Integração total com backend FastAPI

## 🚀 Instalação e Uso

### Requisitos
- Python 3.x instalado
- Backend rodando na porta 8000

### Inicialização

```bash
# Usando script automático
./serve.sh

# Ou manualmente
cd frontend
python3 -m http.server 3000
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 📦 Módulos

- **proprietarios.js**: Gerenciamento de proprietários, CRUD, visualização e importação
- **imoveis.js**: Gerenciamento de imóveis, CRUD, visualização e importação
- **participacoes.js**: Controle de participações, matriz dinâmica, edição e exclusão
- **alugueis.js**: Matriz de aluguéis, filtros por período, edição e exclusão

## 🎨 UI/UX

- Tabelas com cabeçalho escuro, spinner de carregamento e mensagem de status
- Botões de ação agrupados com ícones padronizados
- Layout consistente entre todas as telas
- Navegação por abas

## 🔌 Integração API

Endpoints principais:
- `/proprietarios`
- `/imoveis`
- `/participacoes`
- `/alugueis`
- `/health`

Exemplo de uso do serviço API:
```javascript
const proprietarios = await window.apiService.getProprietarios();
const novo = await window.apiService.createProprietario(data);
```

## � Debug e Manutenção

- Logs estruturados para inicialização, operações e erros
- Funções de debugging integradas
- Estrutura modular facilita manutenção e evolução

## 🚧 Estado Atual

- [x] Tabelas padronizadas e responsivas
- [x] Botões de ação com ícones
- [x] Importação de dados
- [x] Integração completa com backend
- [x] UI/UX consistente
- [ ] Módulo de relatórios (em desenvolvimento)
- [ ] Internacionalização futura

## 🤝 Contribuição

1. Siga o padrão modular
2. Documente novas funções
3. Use os serviços centralizados
4. Mantenha a consistência visual e de logs

---

**Sistema de Aluguéis V2 - Frontend**  
*Versão 2.1.0 - Arquitetura Modular e UI Padronizada*
