# Documentação: `js/modules/dashboard.js`

Este arquivo contém a classe `DashboardModule`, que gerencia toda a lógica e interatividade da view do Dashboard, a tela principal da aplicação.

## Responsabilidades

O `DashboardModule` é responsável por:
1.  **Buscar os Dados**: Carregar os dados brutos necessários para as estatísticas e gráficos.
2.  **Processar os Dados**: Calcular KPIs e agregar dados para as visualizações.
3.  **Renderizar Componentes**: Exibir os KPIs nos cartões de estatísticas e desenhar os gráficos na tela.
4.  **Atualizar a View**: Fornecer um método para recarregar todos os dados quando necessário.

## Fluxo de Execução

Quando o `view-manager` decide exibir o dashboard, ele chama o método `dashboardModule.load()`. Este método executa os seguintes passos:

1.  **Exibe um Indicador de Carregamento**: Informa ao usuário que os dados estão sendo buscados.
2.  **Busca de Dados em Paralelo**: Faz chamadas concorrentes para a API usando o `apiService` para buscar proprietários, imóveis e aluguéis. O uso de `Promise.all()` otimiza o tempo de carregamento.
3.  **Atualiza os KPIs**: Uma vez que os dados são recebidos, o método `updateStats()` é chamado para preencher os cartões de estatísticas com os totais (ex: "Total de Proprietários").
4.  **Cria os Gráficos**: O método `createCharts()` é chamado.
    -   Primeiro, `processIncomeData()` agrupa todos os registros de aluguel por mês/ano e soma os valores, preparando os dados para o gráfico de linha.
    -   Em seguida, `createIncomeChart()` usa a biblioteca `Chart.js` para renderizar um gráfico de linha que mostra a evolução da receita ao longo do tempo.

## Métodos Principais

-   **`load()`**: O ponto de entrada principal do módulo. Orquestra todo o processo de carregamento e renderização.
-   **`updateStats()`**: Calcula e insere os valores nos elementos HTML dos cartões de estatísticas do dashboard.
-   **`createCharts()`**: Gerencia a criação dos gráficos. Ele primeiro chama `destroyAllCharts()` para limpar quaisquer instâncias de gráficos anteriores (uma boa prática para evitar problemas de renderização ao recarregar a view) e depois chama os métodos específicos de criação de cada gráfico.
-   **`processIncomeData()`**: Uma função de transformação de dados. Ela pega a lista "plana" de aluguéis e a converte em uma estrutura de dados agregada (total de receita por mês), que é o formato que o `Chart.js` espera.
-   **`refresh()`**: Um alias para `load()`, permitindo que a view seja facilmente atualizada.
