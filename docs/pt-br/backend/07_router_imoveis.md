# Documentação: `backend/routers/imoveis.py`

Este roteador gerencia todas as operações CRUD (Criar, Ler, Atualizar, Excluir) para a entidade `Imovel`. Ele segue uma estrutura semelhante ao roteador de proprietários, incluindo endpoints para operações básicas e importação em massa.

Todos os endpoints são protegidos e exigem um token de autenticação JWT válido.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/imoveis`.

---

### `GET /`

-   **Descrição**: Lista todos os imóveis cadastrados, ordenados alfabeticamente pelo nome.
-   **Autenticação**: Requerida.
-   **Resposta (Sucesso)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "nome": "Apartamento Centro",
          "endereco": "Rua Principal, 123, Centro",
          "alugado": false,
          // ... outros campos
        }
      ]
    }
    ```

---

### `POST /`

-   **Descrição**: Cria um novo imóvel.
-   **Autenticação**: Requerida.
-   **Corpo da Requisição**: Um objeto JSON com os dados do imóvel.
    ```json
    {
      "nome": "Casa Praia",
      "endereco": "Avenida Beira Mar, 456",
      "tipo_imovel": "Casa",
      "alugado": true
    }
    ```
-   **Resposta (Sucesso)**: Retorna o objeto do imóvel recém-criado.

---

### `GET /{imovel_id}`

-   **Descrição**: Obtém os dados de um imóvel específico pelo seu ID.
-   **Autenticação**: Requerida.
-   **Parâmetros de URL**:
    -   `imovel_id` (int): O ID do imóvel.
-   **Resposta (Sucesso)**: Retorna o objeto do imóvel.
-   **Resposta (Falha)**: `404 Not Found` se o imóvel não for encontrado.

---

### `PUT /{imovel_id}`

-   **Descrição**: Atualiza os dados de um imóvel existente.
-   **Autenticação**: Requerida.
-   **Parâmetros de URL**:
    -   `imovel_id` (int): O ID do imóvel a ser atualizado.
-   **Corpo da Requisição**: Um objeto JSON com os campos a serem atualizados.
-   **Resposta (Sucesso)**: Retorna o objeto do imóvel com os dados atualizados.

---

### `DELETE /{imovel_id}`

-   **Descrição**: Exclui um imóvel. A exclusão é bloqueada se o imóvel tiver aluguéis ou participações ativas associadas, para proteger a integridade dos dados.
-   **Autenticação**: Requerida.
-   **Parâmetros de URL**:
    -   `imovel_id` (int): O ID do imóvel a ser excluído.
-   **Resposta (Sucesso)**: `{"mensagem": "Imóvel excluído com sucesso"}`
-   **Resposta (Falha)**:
    -   `404 Not Found`: Se o imóvel não existir.
    -   `400 Bad Request`: Se houver registros associados, com uma mensagem detalhando o motivo do bloqueio.

---

### `GET /disponiveis/`

-   **Descrição**: Retorna uma lista apenas com os imóveis que não estão marcados como alugados (`alugado == false`).
-   **Autenticação**: Requerida.
-   **Resposta (Sucesso)**: Uma lista de objetos de imóveis disponíveis.

---

### `POST /importar/`

-   **Descrição**: Permite a importação em massa de imóveis a partir de um arquivo Excel (`.xlsx`, `.xls`).
-   **Autenticação**: Requerida.
-   **Corpo da Requisição**: `multipart/form-data` contendo o arquivo.
-   **Lógica de Importação**:
    -   O sistema utiliza a biblioteca `pandas` para ler o arquivo Excel.
    -   Verifica a existência de um imóvel com o mesmo `nome` para evitar duplicatas.
    -   Processa cada linha da planilha para criar um novo registro de imóvel.
-   **Resposta**: Um resumo detalhado da operação, incluindo o número de imóveis processados, criados e uma lista de erros, se houver.
    ```json
    {
      "processados": 10,
      "criados": 8,
      "erros": 2,
      "detalhe_erros": [
        "Linha 5: Já existe um imóvel com o nome 'Apartamento Centro'.",
        "Linha 8: O nome do imóvel é obrigatório."
      ],
      "mensagem": "Processados: 10, Criados: 8, Erros: 2"
    }
    ```
