# Recomendações para o Frontend - Botão "Alterar Usuário"

Este documento descreve uma análise do botão "Alterar Usuário" na tela de "Importar" e fornece recomendações para melhorias.

## Verificação da Funcionalidade

A funcionalidade do botão "Alterar Usuário" foi verificada e o fluxo de trabalho é o seguinte:

1.  **Abertura do Modal:** O botão na tela "Importar" abre um modal chamado `modal-alterar-usuario`.
2.  **Carregamento de Usuários:** Ao abrir o modal, uma chamada de API é feita para `GET /api/auth/usuarios` para buscar a lista de usuários.
3.  **Seleção de Usuário:** Os usuários são exibidos em um menu suspenso. A seleção de um usuário exibe um formulário para alterar a senha e/ou o tipo de usuário.
4.  **Atualização de Usuário:** O envio do formulário aciona uma chamada de API `PUT /api/auth/alterar-usuario/{id}` para atualizar as informações do usuário no backend.
5.  **Exclusão de Usuário:** O modal também contém um botão "Excluir", que, após a confirmação, aciona uma chamada de API `DELETE /api/auth/usuario/{id}` para remover o usuário.

## Recomendações

### Segurança

*   **HTTPS:** A aplicação atualmente usa HTTP. É **crítico** migrar para HTTPS em um ambiente de produção para criptografar todas as comunicações, incluindo senhas e tokens de autenticação.
*   **Gerenciamento de Token:** Revise o mecanismo de token de autenticação. Considere a implementação de tokens de atualização (refresh tokens) e tempos de expiração curtos para os tokens de acesso para mitigar o risco de roubo de token.

### Experiência do Usuário (UX)

*   **Pesquisa de Usuário:** Substitua o menu suspenso de seleção de usuário por um campo de pesquisa com autocompletar. Isso melhorará a usabilidade, especialmente se a lista de usuários for longa.
*   **Atualização da Interface do Usuário:** Após atualizar ou excluir um usuário, a lista de usuários no modal deve ser atualizada automaticamente para refletir as alterações. Atualmente, o modal simplesmente fecha.
*   **Mensagens de Feedback:** Forneça mensagens de sucesso e erro mais específicas. Por exemplo, em vez de "Usuário alterado com sucesso", use "A senha do usuário 'nome_do_usuario' foi alterada com sucesso".

### Qualidade do Código

*   **Refatoração:** Refatore o código duplicado no arquivo `js/modules/usuarioManager.js`. As funções para exibir mensagens de erro e sucesso para os modais "cadastrar" e "alterar" podem ser generalizadas.
*   **Centralização de Strings:** Mova todas as strings de texto (rótulos de botões, títulos de modais, mensagens de erro, etc.) para um arquivo de localização separado (por exemplo, `locales/pt-BR.json`). Isso facilitará a manutenção e futuras traduções.

## Passo a Passo para Implementação das Recomendações

1.  **Implementar Pesquisa de Usuário:**
    *   Substitua o elemento `<select id="selecionar-usuario">` por um `<input type="text">`.
    *   Use uma biblioteca como o `Awesomplete` ou implemente uma lógica de pesquisa personalizada para filtrar os usuários enquanto o administrador digita.
    *   Ao selecionar um usuário, chame a função `selecionarUsuarioParaAlterar(usuarioId)`.

2.  **Atualizar a Interface do Usuário Automaticamente:**
    *   Na função `handleAlterarUsuario`, após uma atualização bem-sucedida, chame `carregarUsuarios()` novamente para atualizar a lista de usuários.
    *   Faça o mesmo na função `excluirUsuario`.

3.  **Melhorar as Mensagens de Feedback:**
    *   Modifique as funções `mostrarSucessoAlterar` e `mostrarErroAlterar` para aceitar um segundo parâmetro com o nome do usuário ou detalhes do erro.
    *   Construa as mensagens de feedback dinamicamente.

4.  **Refatorar o Código:**
    *   Crie funções genéricas `mostrarSucesso(modalId, mensagem)` e `mostrarErro(modalId, mensagem)` que possam ser usadas por ambos os modais.
    *   Substitua as chamadas para `mostrarSucessoAlterar`, `mostrarErroAlterar`, `mostrarSucesso`, e `mostrarErro` pelas novas funções genéricas.

5.  **Centralizar as Strings:**
    *   Crie um arquivo `frontend/js/locales/pt-BR.json`.
    *   Adicione todas as strings de texto a este arquivo com chaves (por exemplo, `"alterar_usuario_titulo": "Alterar Usuário"`).
    *   Crie um módulo de internacionalização (i18n) que carregue o arquivo de localidade e forneça uma função para traduzir chaves em texto.
    *   Substitua todas as strings de texto codificadas no código por chamadas para a função de tradução (por exemplo, `i18n.t('alterar_usuario_titulo')`).