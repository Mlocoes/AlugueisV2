# Documentação: Módulos de View (`js/modules/`)

O diretório `js/modules/` contém as classes JavaScript que controlam a lógica para cada "página" ou "view" da aplicação. Cada arquivo corresponde a uma funcionalidade principal do sistema (Dashboard, Proprietários, Imóveis, etc.).

## Arquitetura Comum dos Módulos

Todos os módulos de view seguem um padrão de design consistente, o que torna o código previsível e fácil de manter. A estrutura típica de uma classe de módulo (ex: `ProprietariosModule`) é:

-   **`constructor()`**: Inicializa o estado interno do módulo. Por exemplo, pode criar um array vazio para armazenar os dados que serão buscados da API (ex: `this.proprietarios = []`).
-   **`init()`**: É chamado uma única vez para configurar os "event listeners" dos elementos estáticos da view (botões de "Novo", formulários, etc.).
-   **`load()`**: É o ponto de entrada principal do módulo, chamado pelo `view-manager` sempre que a view é exibida. Ele garante que o módulo seja inicializado e, em seguida, chama a função para carregar os dados.
-   **`loadData()` (ex: `loadProprietarios()`)**: Método assíncrono que usa o `apiService` para buscar os dados necessários do backend.
-   **`render()` (ex: `renderTable()`)**: Após os dados serem recebidos, este método gera dinamicamente o HTML (geralmente linhas de uma tabela) e o injeta no DOM para exibir os dados ao usuário.
-   **Manipuladores de Eventos (Handlers)**: Funções que respondem a ações do usuário, como cliques em botões de editar ou excluir. Esses métodos geralmente chamam o `apiService` para realizar as operações de CRUD e, em seguida, recarregam os dados para atualizar a tabela.
-   **`refresh()`**: Um método público que simplesmente chama `load()` para permitir que a view seja atualizada externamente.

---

## Descrição dos Módulos

### `dashboard.js`
-   **Responsabilidade**: Gerencia a tela principal do dashboard.
-   **Funcionalidades**: Busca dados agregados da API de estatísticas e usa a biblioteca `Chart.js` para renderizar gráficos de KPIs, como a evolução da receita.

### `proprietarios.js`
-   **Responsabilidade**: Gerencia a tela de CRUD de Proprietários.
-   **Funcionalidades**: Lista todos os proprietários em uma tabela, permite a criação, edição e exclusão de proprietários através de modais.

### `imoveis.js`
-   **Responsabilidade**: Gerencia a tela de CRUD de Imóveis.
-   **Funcionalidades**: Similar ao módulo de proprietários, mas para a entidade Imóvel. Lista os imóveis e permite as operações de CRUD.

### `participacoes.js`
-   **Responsabilidade**: Gerencia a tela de Participações, que é mais complexa.
-   **Funcionalidades**:
    -   Exibe as participações em uma matriz (Imóveis vs. Proprietários).
    -   Permite ao usuário selecionar uma "versão" (data) histórica das participações para visualização.
    -   Lida com a edição de porcentagens diretamente na matriz.

### `alugueis.js`
-   **Responsabilidade**: Gerencia a tela de visualização de Aluguéis.
-   **Funcionalidades**:
    -   Permite ao usuário filtrar os aluguéis por ano e mês.
    -   Exibe os dados em uma matriz similar à de participações, mostrando o valor do aluguel para cada proprietário de cada imóvel.

### `relatorios.js`
-   **Responsabilidade**: Gerencia a tela de Relatórios Financeiros.
-   **Funcionalidades**: Busca dados do endpoint de relatórios e os exibe em uma tabela detalhada, com filtros por período e proprietário.

### `extras.js`
-   **Responsabilidade**: Gerencia a tela de "Extras", que lida com os Aliases (grupos de proprietários) e as Transferências.
-   **Funcionalidades**: Permite o CRUD de Aliases e Transferências.

### `importacao.js`
-   **Responsabilidade**: Gerencia a tela de Importação de Dados.
-   **Funcionalidades**:
    -   Controla os formulários de upload de arquivos.
    -   Interage com os endpoints do `upload.py` no backend para seguir o fluxo de upload, processamento e importação final.
    -   Exibe os resultados e os erros da importação para o usuário.

### `loginManager.js` e `usuarioManager.js`
-   **Responsabilidade**: Módulos que lidam especificamente com a lógica de login e gerenciamento de usuários (uma funcionalidade de administrador), respectivamente. Eles controlam os modais e formulários relacionados a essas tarefas.
