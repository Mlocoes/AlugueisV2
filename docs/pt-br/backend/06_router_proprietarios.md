# Documentação: `backend/routers/proprietarios.py`

Este roteador é responsável por todas as operações CRUD (Criar, Ler, Atualizar, Excluir) relacionadas aos proprietários. Além das operações básicas, ele inclui uma funcionalidade robusta para importação em massa via arquivos Excel/CSV.

Todos os endpoints são protegidos e exigem um token de autenticação JWT válido.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/proprietarios`.

---

### `GET /`

-   **Descrição**: Lista todos os proprietários cadastrados, ordenados alfabeticamente pelo nome.
-   **Autenticação**: Requerida.
-   **Resposta (Sucesso)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "nome": "João",
          "sobrenome": "Silva",
          "nome_completo": "João Silva",
          "documento": "123.456.789-00",
          // ... outros campos
        }
      ]
    }
    ```

---

### `POST /`

-   **Descrição**: Cria um novo proprietário.
-   **Autenticação**: Requerida.
-   **Corpo da Requisição**: Um objeto JSON com os dados do proprietário, seguindo a estrutura do modelo `Proprietario`.
    ```json
    {
      "nome": "Maria",
      "sobrenome": "Souza",
      "email": "maria.souza@example.com",
      "documento": "987.654.321-00"
    }
    ```
-   **Resposta (Sucesso)**: Retorna o objeto do proprietário recém-criado.

---

### `GET /{proprietario_id}`

-   **Descrição**: Obtém os dados de um proprietário específico pelo seu ID.
-   **Autenticação**: Requerida.
-   **Parâmetros de URL**:
    -   `proprietario_id` (int): O ID do proprietário.
-   **Resposta (Sucesso)**: Retorna o objeto do proprietário.
-   **Resposta (Falha)**: `404 Not Found` se o proprietário não for encontrado.

---

### `PUT /{proprietario_id}`

-   **Descrição**: Atualiza os dados de um proprietário existente.
-   **Autenticação**: Requerida.
-   **Parâmetros de URL**:
    -   `proprietario_id` (int): O ID do proprietário a ser atualizado.
-   **Corpo da Requisição**: Um objeto JSON com os campos a serem atualizados.
-   **Resposta (Sucesso)**: Retorna o objeto do proprietário com os dados atualizados.

---

### `DELETE /{proprietario_id}`

-   **Descrição**: Exclui um proprietário. A exclusão só é permitida se o proprietário não tiver aluguéis ou participações ativas associadas, garantindo a integridade dos dados.
-   **Autenticação**: Requerida.
-   **Parâmetros de URL**:
    -   `proprietario_id` (int): O ID do proprietário a ser excluído.
-   **Resposta (Sucesso)**: `{"mensagem": "Proprietário excluído com sucesso"}`
-   **Resposta (Falha)**:
    -   `404 Not Found`: Se o proprietário não existir.
    -   `400 Bad Request`: Se houver registros associados, com uma mensagem detalhando o bloqueio.

---

### `POST /importar/`

-   **Descrição**: Permite a importação em massa de proprietários a partir de um arquivo Excel (`.xlsx`, `.xls`) ou CSV.
-   **Autenticação**: Requerida.
-   **Corpo da Requisição**: `multipart/form-data` contendo o arquivo.
-   **Lógica de Importação**:
    -   O sistema lê o arquivo e normaliza os nomes das colunas.
    -   Ele verifica a existência de proprietários para evitar duplicatas, usando o campo `documento` como chave principal ou o `nome` e `sobrenome` como alternativa.
    -   Processa cada linha, criando novos proprietários.
-   **Resposta**: Um resumo detalhado da operação.
    ```json
    {
      "processados": 5,
      "criados": 4,
      "erros": 1,
      "detalhe_erros": [
        "Linha 3: Proprietário já existe (documento/nome)."
      ],
      "mensagem": "Processados: 5, Criados: 4, Erros: 1"
    }
    ```
