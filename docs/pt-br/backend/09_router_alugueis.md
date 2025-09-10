# Documentação: `backend/routers/alugueis.py`

Este roteador é um dos mais complexos e centrais da aplicação, responsável por gerenciar os registros de aluguéis (`AluguelSimples`). Ele vai além de simples operações CRUD, oferecendo funcionalidades avançadas de importação, listagem com filtros, e agregação de dados para relatórios.

Todos os endpoints são protegidos e exigem um token de autenticação JWT válido.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/alugueis`.

---

### `POST /importar/`

-   **Descrição**: Endpoint principal para a entrada de dados em massa. Ele importa múltiplos registros de aluguel a partir de um arquivo Excel.
-   **Formato do Excel**: O arquivo deve seguir uma estrutura de matriz:
    -   Cada **aba (worksheet)** representa um mês. O nome da aba é usado para extrair o mês e o ano.
    -   Cada **linha** representa um imóvel.
    -   A **primeira coluna** contém o nome do imóvel.
    -   As **colunas intermediárias** contêm os nomes dos proprietários nos cabeçalhos, e as células contêm o valor líquido do aluguel para aquele proprietário/imóvel.
    -   A **última coluna** contém a taxa de administração total para o imóvel naquele mês.
-   **Lógica**: O endpoint processa cada aba e cada célula da matriz, criando ou atualizando os registros de `AluguelSimples` correspondentes.
-   **Resposta**: Retorna um resumo detalhado da importação, incluindo o número de registros processados, criados/atualizados e uma lista de erros.

---

### `GET /listar`

-   **Descrição**: Lista os registros de aluguel com suporte a filtros, paginação e ordenação.
-   **Parâmetros de Query**:
    -   `skip` (int): Para paginação.
    -   `limit` (int): Para paginação.
    -   `ano` (int), `mes` (int): Para filtrar por período.
    -   `imovel_id` (int), `proprietario_id` (int): Para filtrar por entidade.
    -   `ordem` (str): 'asc' ou 'desc'.
-   **Resposta**: Uma lista de objetos de aluguel.

---

### Endpoints CRUD Básicos

-   **`POST /criar`**: Cria um único registro de aluguel (usado para entradas manuais).
-   **`GET /obter/{aluguel_id}`**: Obtém um registro de aluguel específico pelo ID.
-   **`PUT /{aluguel_id}`**: Atualiza um registro de aluguel.
-   **`DELETE /{aluguel_id}`**: Exclui um registro de aluguel.

---

### Endpoints de Agregação e Relatórios

Estes endpoints são projetados para alimentar dashboards e relatórios no frontend.

-   **`GET /anos-disponiveis/`**: Retorna uma lista de todos os anos únicos que possuem registros de aluguel.
-   **`GET /ultimo-periodo/`**: Retorna o último ano e mês para os quais existem dados, útil para carregar a visão padrão no frontend.
-   **`GET /totais-por-imovel/`**: Agrupa os dados e retorna a soma dos valores de aluguel para cada imóvel em um determinado período.
-   **`GET /totais-por-mes/`**: Agrupa os dados por mês/ano e retorna a soma total dos valores de aluguel para cada período, ideal para gráficos de tendências.

---

### `GET /distribuicao-matriz/`

-   **Descrição**: Endpoint de relatório mais poderoso, que cria uma matriz (tabela pivô) de **Proprietários vs. Imóveis**, onde cada célula contém a soma do valor líquido do aluguel.
-   **Parâmetros de Query**:
    -   `ano`, `mes`, `proprietario_id`: Filtros para a consulta.
    -   `agregacao` (str): Controla como os dados são agregados.
        -   `mes_especifico`: Retorna dados para um único mês/ano (padrão).
        -   `ano_completo`: Soma todos os meses de um determinado ano.
        -   `completo`: Soma todos os dados de todos os tempos.
-   **Resposta**: Um objeto complexo contendo os dados do período, as listas de proprietários e imóveis, e a matriz de valores.

---

### `POST /recalcular-taxas/`

-   **Descrição**: Endpoint de manutenção que aciona o `CalculoService` para recalcular as taxas de administração de todos os aluguéis, aplicando as porcentagens de participação corretas. Útil para corrigir dados em massa após uma alteração nas participações.
-   **Acesso**: Apenas administradores.
