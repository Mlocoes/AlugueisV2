# Documentação: `backend/routers/estadisticas.py`

Este roteador é responsável por agregar dados e fornecer estatísticas consolidadas, sendo a principal fonte de informações para o dashboard do frontend. Ele calcula totais, médias e comparações de períodos para oferecer uma visão geral da saúde do negócio.

Todos os endpoints são protegidos e exigem um token de autenticação JWT válido.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/estadisticas`.

---

### `GET /generales`

-   **Descrição**: Fornece um conjunto de estatísticas gerais sobre o estado do sistema.
-   **Resposta (Sucesso)**: Um objeto JSON contendo:
    -   `totales`: Contagem total de aluguéis, propriedades e proprietários.
    -   `valores_monetarios`: Soma total dos valores de aluguel, taxas de administração e valores líquidos.
    -   `ultimas_importaciones`: Uma lista dos últimos 5 registros de log de importação.
    ```json
    {
      "totales": {
        "alquileres": 1500,
        "propiedades": 50,
        "propietarios": 80
      },
      "valores_monetarios": {
        "total_alquileres": 1200000.00,
        // ...
      },
      "ultimas_importaciones": [ /* ... */ ]
    }
    ```

---

### `GET /resumen/por-propiedad`

-   **Descrição**: Retorna um resumo dos dados de aluguéis agrupados por imóvel. Pode ser filtrado por ano e mês.
-   **Parâmetros de Query**:
    -   `ano` (int, opcional): Filtra os dados para um ano específico.
    -   `mes` (int, opcional): Filtra os dados para um mês específico.
-   **Lógica**: Utiliza a classe `ResumenCalculator` para calcular os totais para cada grupo de aluguéis por imóvel.
-   **Resposta**: Uma lista de objetos, onde cada objeto é um resumo para um imóvel em um determinado período.

---

### `GET /resumen/por-propietario`

-   **Descrição**: Funciona de forma semelhante ao endpoint anterior, mas agrupa os dados por proprietário.
-   **Parâmetros de Query**:
    -   `ano` (int, opcional): Filtra os dados para um ano específico.
    -   `mes` (int, opcional): Filtra os dados para um mês específico.
-   **Resposta**: Uma lista de objetos, onde cada objeto é um resumo para um proprietário em um determinado período.

---

### `GET /resumen-mensual`

-   **Descrição**: Endpoint sofisticado que calcula um resumo detalhado com KPIs (Key Performance Indicators) para o dashboard.
-   **Lógica**:
    -   Calcula a receita total do mês atual.
    -   Compara com a receita do mês anterior para calcular a variação (absoluta e percentual).
    -   Calcula o total acumulado no ano e a média mensal.
-   **Resposta**: Um objeto JSON rico em informações, incluindo dados para exibição direta no frontend.
    ```json
    {
      "periodo": { /* ... */ },
      "metricas": {
        "ingresos_mes_actual": 55000.0,
        "total_ano_actual": 650000.0,
        "media_mensual": 54166.67,
        "variacion": {
          "absoluta": 5000.0,
          "porcentual": 10.0,
          "tipo": "positiva",
          "icono": "fas fa-arrow-up",
          "clase_color": "text-success"
        }
      }
    }
    ```
    A inclusão de `icono` e `clase_color` é um exemplo de como o backend pode facilitar o trabalho do frontend, fornecendo não apenas dados brutos, mas também metadados de apresentação.
