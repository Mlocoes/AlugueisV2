# Documentação: Estrutura e Inicialização do Frontend

O frontend do Sistema de Aluguéis é uma **Single-Page Application (SPA)** construída com JavaScript puro ("vanilla JS"), HTML5 e CSS3. Ele não utiliza um framework moderno como React ou Vue, mas segue uma arquitetura modular bem organizada para gerenciar a complexidade da aplicação.

## Arquivo Principal: `index.html`

`index.html` é o único ponto de entrada para a aplicação web. Sua estrutura é composta por:

1.  **Layout Básico**: Define os contêineres principais da interface:
    -   `#loading-screen`: Tela de carregamento exibida durante a inicialização.
    -   `#login-screen`: Tela de login, exibida se o usuário não estiver autenticado.
    -   `#app-container`: O contêiner principal da aplicação, que abriga a navegação e o conteúdo dinâmico. Fica oculto até que o login seja bem-sucedido.

2.  **Dependências**: Carrega todas as bibliotecas externas e arquivos CSS/JS necessários:
    -   **Bootstrap**: Para componentes de UI e layout responsivo.
    -   **Font Awesome / Bootstrap Icons**: Para ícones.
    -   **Chart.js**: Para a renderização de gráficos no dashboard e relatórios.
    -   **Arquivos JS Modulares**: Todos os arquivos JavaScript da aplicação são carregados em uma ordem específica, garantindo que as dependências entre eles sejam resolvidas.

3.  **Lógica de Inicialização (`UnifiedApp`)**: O coração da aplicação reside na classe `UnifiedApp`, definida em uma tag `<script>` no final do arquivo. Esta classe gerencia todo o ciclo de vida do frontend.

## O Processo de Inicialização

Quando um usuário acessa a `index.html`, a classe `UnifiedApp` executa os seguintes passos:

1.  **`init()`**: O método principal é chamado.
2.  **`checkSavedAuth()`**: Verifica o `localStorage` do navegador em busca de um token JWT e dados de usuário salvos de uma sessão anterior.
    -   Se um token for encontrado, ele é enviado ao backend para validação através do `authService.validateToken()`.
    -   Se o token for válido, o usuário é considerado autenticado.
3.  **Exibição da Tela Correta**:
    -   Se o usuário estiver autenticado, a `showApp()` é chamada, ocultando a tela de login e exibindo o contêiner principal da aplicação (`#app-container`).
    -   Caso contrário, a `showLogin()` é chamada, exibindo o formulário de login.
4.  **Inicialização dos Componentes**: Se o login for bem-sucedido (ou a sessão for restaurada), o método `initializeAppComponents()` é chamado para:
    -   Inicializar o `unifiedNavigator` (que constrói o menu de navegação lateral).
    -   Inicializar o `viewManager` (que gerencia qual "página" ou "módulo" é exibido na área de conteúdo principal).
    -   Navegar para a visão inicial (geralmente o dashboard).
5.  **Configuração de Eventos**: O `setupEventListeners()` configura os listeners para o formulário de login, o botão de logout e o botão de menu para dispositivos móveis.

Este fluxo garante que o usuário só tenha acesso ao conteúdo da aplicação após uma autenticação bem-sucedida, que é um pilar fundamental da segurança da SPA.

## Nota sobre `js/app.js`

O arquivo `js/app.js` contém uma classe similar chamada `SistemaAlugueisApp`. No entanto, a lógica de inicialização em `index.html` utiliza a classe `UnifiedApp`. Isso sugere que `app.js` pode ser uma versão mais antiga ou parte de uma refatoração. Para entender a aplicação principal, o foco deve ser na classe `UnifiedApp` dentro de `index.html`.
