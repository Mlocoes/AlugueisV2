# Documentação: Serviços de API e Autenticação

A comunicação entre o frontend e o backend é gerenciada por dois serviços principais: `apiService.js` e `authService.js`. Eles abstraem a complexidade das requisições HTTP e do gerenciamento de sessões.

---

## `js/apiService.js`

Este arquivo (`window.apiService`) atua como uma camada de acesso a dados centralizada, um "wrapper" em torno da `fetch` API do navegador.

### Responsabilidades

1.  **Requisições Genéricas**: Fornece métodos genéricos para os principais verbos HTTP: `get()`, `post()`, `put()`, e `delete()`.
2.  **Injeção Automática de Token**: O método `getHeaders()` busca automaticamente o token de autenticação do `authService` e o adiciona ao cabeçalho `Authorization` de cada requisição. Isso elimina a necessidade de adicionar o token manualmente em cada chamada de API.
3.  **URL Base Dinâmica**: O `getBaseUrl()` determina a URL do backend, permitindo que a mesma base de código funcione em diferentes ambientes (local, desenvolvimento, produção).
4.  **Tratamento de Erros Centralizado**: O método `makeRequest()` padroniza o tratamento de respostas. Se uma requisição falhar (ex: status 404 ou 500), ele tenta extrair a mensagem de erro detalhada do corpo da resposta do backend, fornecendo feedback mais útil do que um simples "Network Error".
5.  **Contrato de API Explícito**: Além dos métodos genéricos, o `apiService` define métodos específicos para a maioria dos endpoints da API (ex: `getProprietarios()`, `createImovel()`). Isso cria um "contrato" claro que os outros módulos do frontend podem usar, tornando o código mais legível e fácil de manter.

---

## `js/services/authService.js`

Este serviço (`window.authService`) é responsável por tudo relacionado ao estado de autenticação do usuário.

### Responsabilidades

1.  **Gerenciamento de Estado**: Mantém o estado da sessão do usuário em memória, incluindo o `token` JWT, o `usuario` (username) e o `tipo` (papel/role).
2.  **Login e Logout**:
    -   `login(usuario, senha)`: Envia as credenciais para o endpoint `/api/auth/login` através do `apiService`. Se o login for bem-sucedido, armazena o token e os dados do usuário.
    -   `logout()`: Limpa os dados de autenticação da memória e também do `localStorage` do navegador, encerrando efetivamente a sessão.
3.  **Persistência de Sessão**:
    -   Embora o estado principal seja mantido em memória, o `UnifiedApp` (a classe principal da aplicação) usa o `localStorage` para persistir o token e os dados do usuário entre as sessões do navegador.
    -   `restoreFromLocalStorage()`: É chamado na inicialização da aplicação para recarregar os dados salvos.
    -   `validateToken()`: Após restaurar os dados, este método é chamado para fazer uma requisição ao endpoint `/api/auth/verify` e confirmar que o token salvo ainda é válido no backend. Isso protege contra tokens expirados ou invalidados.
4.  **Fornecimento de Credenciais**: O método `getAuthHeader()` é a ponte entre o `authService` e o `apiService`, fornecendo o cabeçalho de autorização formatado (`Bearer <token>`) para ser usado em requisições protegidas.
