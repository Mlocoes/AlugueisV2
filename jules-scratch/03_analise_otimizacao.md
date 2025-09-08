# Análise de Otimização

Esta seção foca em identificar gargalos de performance e oportunidades de melhoria no backend e no frontend.

### 1. Otimização do Banco de Dados (Risco Alto)

A análise dos modelos de dados (`backend/models_final.py`) revelou uma falha de otimização significativa.

*   **Problema: Ausência de Índices em Chaves Estrangeiras:** As colunas que servem como chaves estrangeiras (ex: `imovel_id`, `proprietario_id` nas tabelas `alugueis` e `participacoes`) não possuem índices de banco de dados explícitos.
*   **Impacto:** Qualquer consulta que filtre ou ordene por essas colunas (operações extremamente comuns em uma aplicação deste tipo) forçará o banco de dados a realizar uma varredura completa da tabela (`full table scan`). À medida que a quantidade de dados cresce, a performance dessas consultas se degradará drasticamente, causando lentidão em toda a aplicação.
*   **Recomendação Urgente:** Adicionar `index=True` a todas as colunas de chave estrangeira e a outras colunas que são frequentemente usadas em cláusulas `WHERE` (como `ano` e `mes` na tabela `alugueis`).
    *   **Exemplo:** `imovel_id = Column(Integer, ForeignKey('imoveis.id'), nullable=False, index=True)`

### 2. Otimização do Processamento de Arquivos (Risco Alto)

A funcionalidade de importação de planilhas Excel (`backend/routers/importacao.py`) representa um grande gargalo de performance e instabilidade.

*   **Problema 1: Processamento Síncrono e Bloqueante:** O arquivo Excel é lido e processado pela biblioteca Pandas diretamente no endpoint da API. Isso bloqueia o processo do servidor, impedindo-o de responder a outras requisições. Arquivos grandes podem facilmente causar timeouts e esgotar a memória do servidor.
*   **Problema 2: Consultas N+1:** O código itera sobre as linhas da planilha e executa consultas ao banco de dados dentro do loop. Isso resulta em um número excessivo de consultas, sobrecarregando o banco de dados e aumentando o tempo de processamento.
*   **Recomendação:**
    1.  **Usar Tarefas em Segundo Plano:** Mover toda a lógica de processamento de arquivos para uma tarefa em segundo plano (background task) usando `BackgroundTasks` do FastAPI ou uma fila de tarefas como Celery. O endpoint da API deve apenas aceitar o upload e agendar a tarefa.
    2.  **Implementar Operações em Massa (Bulk):** Refatorar a lógica para evitar consultas em loop. O ideal é ler os dados da planilha, coletar os identificadores, buscar os registros necessários do banco de dados de uma só vez e, por fim, inserir os novos dados em massa.

### 3. Otimização do Carregamento do Frontend (Risco Médio)

A forma como os recursos do frontend são carregados em `frontend/index.html` é ineficiente e prejudica a experiência do usuário.

*   **Problema 1: Múltiplos Scripts Bloqueantes:** A página carrega mais de 20 arquivos JavaScript individuais. O navegador precisa fazer uma requisição para cada um, e eles bloqueiam a renderização da página até serem baixados e executados.
*   **Problema 2: Não Utilização do "Bundler":** O projeto possui `Vite`, uma ferramenta de build, mas ela não está sendo usada para gerar uma versão de produção. O principal benefício do Vite, que é agrupar (bundle) e minificar todo o código em um único arquivo otimizado, está sendo desperdiçado.
*   **Recomendação:**
    1.  **Gerar Build de Produção:** Utilizar o comando `vite build` para gerar os arquivos de produção e carregar apenas o arquivo JavaScript otimizado no `index.html`.
    2.  **(Solução Paliativa) Usar `defer`:** Como medida imediata, adicionar o atributo `defer` a todas as tags `<script>`. Isso fará com que o navegador baixe os scripts em paralelo sem bloquear a renderização do HTML.
        *   **Exemplo:** `<script src="js/core/config.js" defer></script>`
