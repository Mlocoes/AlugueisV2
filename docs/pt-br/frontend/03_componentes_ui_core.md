# Documentação: Componentes Core da UI

O coração da interface do usuário é gerenciado por um conjunto de classes no diretório `js/core/`. Elas trabalham juntas para criar uma experiência de Single-Page Application (SPA) reativa e organizada.

## O Fluxo de Navegação e Renderização

A interação do usuário com a UI segue um fluxo claro e desacoplado:

1.  **Clique na Navegação**: O usuário clica em um item de menu (ex: "Proprietários").
2.  **`navigator.js`**: Captura o clique, atualiza a URL do navegador (sem recarregar a página) e dispara um evento global chamado `navigate`.
3.  **`view-manager.js`**: Escuta o evento `navigate`, identifica qual "view" foi solicitada (ex: 'proprietarios') e a renderiza na área de conteúdo principal.
4.  **Módulo da View**: O `view-manager` então carrega e inicializa o módulo JavaScript correspondente (ex: `proprietarios.js`), que é responsável por buscar os dados da API e popular a view com eles.

Este padrão de eventos permite que os componentes sejam independentes e se comuniquem de forma organizada.

---

## `js/core/navigator.js`

-   **Responsabilidade**: Construir e gerenciar a navegação principal da aplicação.
-   **Funcionalidades**:
    -   **Navegação Responsiva**: Detecta o tipo de dispositivo (através de um `deviceManager`) e renderiza uma barra de navegação lateral (`side-nav`) para desktops ou uma barra inferior (`bottom-nav`) para dispositivos móveis.
    -   **Controle de Acesso**: Renderiza os itens de menu com base no tipo de usuário logado. Por exemplo, o item "Extras" só é exibido para administradores.
    -   **Gerenciamento de Estado**: Mantém o controle da view ativa, atualiza a URL do navegador com `history.pushState`, e dispara o evento `navigate` para que outros componentes (como o `view-manager`) saibam que precisam reagir a uma mudança de página.

---

## `js/core/view-manager.js`

-   **Responsabilidade**: Gerenciar o conteúdo principal da aplicação, atuando como um "roteador" de views.
-   **Funcionalidades**:
    -   **Registro de Views**: Mantém um mapa de todas as "páginas" (views) disponíveis na aplicação. Cada registro contém o ID da view, seu título, o template HTML, e uma lista dos módulos JS que ela requer.
    -   **Renderização de Conteúdo**: Ao receber o evento `navigate`, ele busca o template HTML da view solicitada e o injeta no contêiner `#main-content`.
    -   **Inicialização de Módulos**: Após renderizar o HTML, ele chama o método `.load()` do módulo JavaScript associado àquela view (ex: `dashboardModule.load()`). É neste ponto que os dados da API são buscados e a view é preenchida.
    -   **Templates HTML**: Os templates para cada view estão "hardcoded" como strings dentro dos métodos `getDashboardTemplate()`, `getProprietariosTemplate()`, etc.

---

## `js/core/ui-manager.js`

-   **Responsabilidade**: Fornecer um conjunto de utilitários para gerenciar elementos comuns da interface do usuário.
-   **Funcionalidades**:
    -   **Alertas e Notificações**: Contém métodos (`showAlert`, `showSuccess`, `showError`) para exibir alertas "toast" não-bloqueantes no canto da tela.
    -   **Gerenciamento de Modais**: Funções para mostrar e esconder modais do Bootstrap.
    -   **Controle de Acesso de UI**: Possui a lógica (`checkAdminPermission`) para verificar o tipo do usuário e métodos (`updateActionButtonsVisibility`) para mostrar ou esconder elementos da UI (como botões de "Excluir") com base nessa permissão.
    -   **`showTab()` (Legacy)**: Contém um método `showTab` que parece ser de uma arquitetura anterior baseada em abas. Na arquitetura atual, o `view-manager` é o principal controlador de conteúdo.
