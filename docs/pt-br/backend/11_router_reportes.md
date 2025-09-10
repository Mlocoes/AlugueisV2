# Documentação: `backend/routers/reportes.py`

Este roteador é dedicado à geração de relatórios tabulares e detalhados, que podem ser usados para visualização ou exportação de dados consolidados. Diferente do roteador de `estadisticas` (que foca em KPIs de dashboard), este módulo gera listas de dados agregados.

Todos os endpoints são protegidos e exigem um token de autenticação JWT válido.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/reportes`.

---

### `GET /anos-disponiveis`

-   **Descrição**: Retorna uma lista de anos únicos para os quais existem registros de aluguel. É útil para preencher filtros de seleção de ano na interface de relatórios.
-   **Resposta (Sucesso)**:
    ```json
    [
      2024,
      2023,
      2022
    ]
    ```

---

### `GET /resumen-mensual`

-   **Descrição**: Endpoint principal que gera um relatório de resumo mensal, agrupado por proprietário. Para cada proprietário, em cada período, ele calcula os totais.
-   **Parâmetros de Query**:
    -   `mes` (int, opcional): Filtra pelo mês.
    -   `ano` (int, opcional): Filtra pelo ano.
    -   `proprietario_id` (int, opcional): Filtra para um proprietário específico.
    -   `nome_proprietario` (str, opcional): Filtra por parte do nome do proprietário.
-   **Lógica**: Executa uma consulta SQL complexa que agrupa os dados de `AluguelSimples` e calcula as somas necessárias.
-   **Resposta (Sucesso)**: Uma lista de objetos, onde cada objeto representa o resumo de um proprietário para um mês.
    ```json
    [
      {
        "nome_proprietario": "João Silva",
        "proprietario_id": 1,
        "mes": 10,
        "ano": 2023,
        "valor_total": 4500.50, // Valor líquido
        "soma_alugueis": 5000.50, // Valor bruto (líquido + taxas)
        "soma_taxas": 500.00,
        "quantidade_imoveis": 3
      },
      // ... outros proprietários e períodos
    ]
    ```
