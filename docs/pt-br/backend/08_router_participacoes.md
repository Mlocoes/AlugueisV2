# Documentação: `backend/routers/participacoes.py`

Este roteador gerencia as participações, que representam a porcentagem de posse de cada proprietário sobre um imóvel. A principal característica deste módulo é o **versionamento de dados**: cada alteração em uma participação não modifica o registro existente, mas cria um novo conjunto de participações com um novo timestamp (`data_registro`). Isso preserva o histórico completo das composições societárias ao longo do tempo.

Todos os endpoints são protegidos e exigem um token de autenticação JWT válido.

## Conceito de Versionamento

-   **Conjunto de Participações**: Um "conjunto" é a coleção de todas as participações válidas em um determinado momento. Cada conjunto é identificado por um `data_registro` único.
-   **Criação e Atualização**: Quando uma participação é criada ou atualizada, o sistema:
    1.  Copia todas as participações do conjunto mais recente.
    2.  Aplica a alteração desejada (adiciona, remove ou modifica uma participação).
    3.  Salva todos esses registros como um novo conjunto com um novo `data_registro`.
-   Isso garante que o histórico nunca seja perdido, permitindo auditorias e consultas a estados passados.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/participacoes`.

---

### `GET /datas`

-   **Descrição**: Lista todas as datas distintas dos conjuntos de participações disponíveis, permitindo ao frontend oferecer um seletor de "versões" históricas.
-   **Resposta (Sucesso)**:
    ```json
    {
      "success": true,
      "datas": [
        "2023-10-27T10:00:00",
        "2023-09-15T15:30:00"
      ]
    }
    ```

---

### `GET /`

-   **Descrição**: Lista as participações. Se o parâmetro `data_registro` for fornecido, retorna o conjunto daquela data. Caso contrário, retorna o conjunto mais recente.
-   **Parâmetros de Query**:
    -   `data_registro` (str, opcional): A data (em formato ISO) do conjunto a ser buscado.
-   **Resposta (Sucesso)**: Uma lista de objetos de participação.

---

### `POST /`

-   **Descrição**: Cria uma nova participação. **Importante**: Esta ação cria uma nova versão de todo o conjunto de participações.
-   **Corpo da Requisição**:
    ```json
    {
      "imovel_id": 1,
      "proprietario_id": 2,
      "porcentagem": 50.0
    }
    ```
-   **Resposta (Sucesso)**: Retorna o objeto da participação recém-criada.

---

### `PUT /{participacao_id}`

-   **Descrição**: Atualiza uma participação existente. Assim como na criação, esta ação também gera uma nova versão de todo o conjunto.
-   **Parâmetros de URL**: `participacao_id` (int).
-   **Corpo da Requisição**: `{ "porcentagem": 75.0 }`
-   **Resposta (Sucesso)**: Retorna o objeto da participação atualizada.

---

### `DELETE /{participacao_id}`

-   **Descrição**: Exclui um registro de participação. **Atenção**: Esta é uma exclusão direta e não cria uma nova versão. Deve ser usada com cuidado, geralmente para corrigir erros.
-   **Resposta (Sucesso)**: `{"mensagem": "Participação excluída com sucesso"}`

---

### `POST /importar/`

-   **Descrição**: Realiza a importação em massa de um conjunto completo de participações a partir de um arquivo Excel. O arquivo deve ter os imóveis nas linhas e os proprietários nas colunas.
-   **Lógica de Importação**:
    -   Lê a matriz do Excel.
    -   Para cada célula com valor, busca o imóvel e o proprietário correspondentes.
    -   Cria um conjunto completo de novos registros de participação com um `data_registro` único para o lote.
-   **Resposta**: Um resumo da operação, incluindo o número de participações criadas e os erros encontrados.

---

### `POST /nova-versao`

-   **Descrição**: Endpoint dedicado para criar uma nova versão completa do conjunto de participações a partir de uma lista de dados. É a forma mais controlada de atualizar todo o estado das participações.
-   **Acesso**: Apenas administradores.
-   **Corpo da Requisição**:
    ```json
    {
      "participacoes": [
        { "imovel_id": 1, "proprietario_id": 1, "porcentagem": 50.0 },
        { "imovel_id": 1, "proprietario_id": 2, "porcentagem": 50.0 }
      ]
    }
    ```
-   **Validação**: O endpoint valida se a soma das porcentagens para cada imóvel é 100%.
-   **Resposta**: Confirmação da criação da nova versão.
