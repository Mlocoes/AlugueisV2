# Documentação: `backend/routers/auth.py`

Este roteador é o coração da segurança da aplicação, responsável por toda a lógica de autenticação, autorização e gerenciamento de usuários. Ele utiliza JWT para sessões seguras e `passlib` para o hashing de senhas.

## Principais Funcionalidades

1.  **Segurança de Senhas**: Utiliza a biblioteca `passlib` com o algoritmo `bcrypt` para garantir que as senhas dos usuários sejam armazenadas de forma segura (hash) e nunca em texto plano.
2.  **Autenticação com JWT**: Implementa a criação e validação de JSON Web Tokens (JWT). Um token é gerado no login e deve ser enviado no cabeçalho `Authorization` de cada requisição a endpoints protegidos.
3.  **Autorização Baseada em Papéis (RBAC)**: Define dependências (`is_admin`, `is_user_or_admin`) que são usadas para proteger endpoints, garantindo que apenas usuários com o tipo (papel) correto possam acessá-los.
4.  **Setup Inicial**: Fornece um mecanismo para a criação segura do primeiro usuário administrador do sistema.

## Funções de Segurança e Dependências

-   `get_password_hash(password)`: Gera um hash bcrypt de uma senha.
-   `verify_password(plain_password, hashed_password)`: Compara uma senha em texto plano com seu hash.
-   `create_access_token(data)`: Cria um novo token JWT com os dados do usuário e um tempo de expiração.
-   `verify_token(credentials)`: Dependência do FastAPI que valida o token JWT enviado no cabeçalho `Authorization: Bearer <token>`. Se o token for inválido ou expirado, retorna um erro `401 Unauthorized`.
-   `is_admin(current_user)`: Dependência que só permite o acesso a usuários com `tipo_de_usuario == 'administrador'`. Caso contrário, retorna `403 Forbidden`.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/auth`.

---

### `GET /setup-status`

-   **Descrição**: Verifica se já existe um usuário administrador no sistema. Útil para o frontend saber se deve exibir uma tela de configuração inicial.
-   **Resposta**:
    ```json
    {
      "setup_required": true,
      "has_admin": false,
      "message": "Sistema precisa de configuração inicial"
    }
    ```

---

### `POST /setup-primeiro-admin`

-   **Descrição**: Cria o primeiro usuário do sistema, que será obrigatoriamente um administrador. Este endpoint só funciona se nenhum outro administrador existir.
-   **Corpo da Requisição**:
    ```json
    {
      "usuario": "admin_user",
      "senha": "strong_password",
      "tipo_de_usuario": "administrador" // O tipo é forçado para 'administrador' no backend
    }
    ```
-   **Resposta**: Mensagem de sucesso com os dados do usuário criado.

---

### `POST /login`

-   **Descrição**: Autentica um usuário com base em seu nome de usuário e senha.
-   **Corpo da Requisição**:
    ```json
    {
      "usuario": "admin",
      "senha": "admin"
    }
    ```
-   **Resposta (Sucesso)**: Retorna um token de acesso JWT.
    ```json
    {
      "access_token": "ey...",
      "token_type": "bearer",
      "usuario": "admin",
      "tipo_usuario": "administrador"
    }
    ```
-   **Resposta (Falha)**: `401 Unauthorized` se as credenciais forem inválidas.

---

### `GET /verify` e `POST /verify`

-   **Descrição**: Endpoint para verificar a validade de um token JWT. O frontend pode usar isso para confirmar se a sessão do usuário ainda está ativa.
-   **Autenticação**: Requer um token JWT válido.
-   **Resposta**:
    ```json
    {
      "valid": true,
      "usuario": "admin",
      "tipo": "administrador",
      "is_admin": true
    }
    ```

---

### Endpoints de Gerenciamento de Usuários (Apenas Admin)

Os seguintes endpoints requerem que o usuário fazendo a requisição seja um administrador (`Depends(is_admin)`).

-   **`POST /cadastrar-usuario`**: Cria um novo usuário (administrador, usuário ou visualizador).
-   **`GET /usuarios`**: Lista todos os usuários cadastrados no sistema.
-   **`PUT /alterar-usuario/{usuario_id}`**: Altera a senha ou o tipo de um usuário existente.
-   **`DELETE /usuario/{usuario_id}`**: Exclui um usuário. Um administrador não pode excluir a si mesmo.
