# Documentação: `backend/models_final.py`

Este arquivo é o pilar da camada de dados da aplicação. Ele define todas as tabelas do banco de dados usando o ORM do SQLAlchemy, estabelece os relacionamentos entre elas e também inclui os esquemas Pydantic para validação de dados na API.

## Estrutura Geral

O arquivo é dividido em três seções principais:
1.  **Modelos SQLAlchemy (Tabelas)**: Classes que mapeiam para as tabelas do banco de dados.
2.  **Esquemas Pydantic (Validação)**: Classes que definem a estrutura dos dados para as requisições e respostas da API.
3.  **Classes Utilitárias**: Classes auxiliares com lógica de negócio (validação, cálculos).

---

## Modelos SQLAlchemy (Tabelas do Banco de Dados)

Cada classe herda de `Base` (declarada em `config.py`) e representa uma tabela no banco de dados PostgreSQL.

### `Usuario`
-   **Tabela**: `usuarios`
-   **Propósito**: Armazenar as credenciais e informações dos usuários do sistema.
-   **Campos Principais**:
    -   `id`: Chave primária.
    -   `usuario`: Nome de usuário (único).
    -   `senha`: Senha hash.
    -   `tipo_de_usuario`: Nível de permissão (ex: 'admin', 'leitura').

### `Imovel`
-   **Tabela**: `imoveis`
-   **Propósito**: Armazenar informações detalhadas sobre cada imóvel.
-   **Campos Principais**:
    -   `id`: Chave primária.
    -   `uuid`: Identificador único universal.
    -   `nome`: Nome ou apelido do imóvel (único).
    -   `endereco`: Endereço completo.
    -   `alugado`: Flag booleana que indica se o imóvel está atualmente alugado.
-   **Relacionamentos**:
    -   `alugueis`: Um-para-muitos com `AluguelSimples`.
    -   `participacoes`: Um-para-muitos com `Participacao`.

### `Proprietario`
-   **Tabela**: `proprietarios`
-   **Propósito**: Manter o cadastro dos proprietários dos imóveis.
-   **Campos Principais**:
    -   `id`: Chave primária.
    -   `nome` / `sobrenome`: Nome completo do proprietário.
    -   `documento`: Documento de identificação (único).
    -   `banco`, `agencia`, `conta`: Informações bancárias para pagamentos.
-   **Relacionamentos**:
    -   `alugueis`: Um-para-muitos com `AluguelSimples`.
    -   `participacoes`: Um-para-muitos com `Participacao`.

### `AluguelSimples`
-   **Tabela**: `alugueis`
-   **Propósito**: Registrar os valores de aluguel recebidos para cada proprietário em um determinado mês/ano.
-   **Campos Principais**:
    -   `id`: Chave primária.
    -   `imovel_id`: Chave estrangeira para `imoveis`.
    -   `proprietario_id`: Chave estrangeira para `proprietarios`.
    -   `mes`, `ano`: Período de referência do aluguel.
    -   `valor_liquido_proprietario`: Valor final a ser recebido pelo proprietário.
-   **Constraints**:
    -   `uq_aluguel_simples_periodo`: Garante que só exista um registro por imóvel, proprietário, mês e ano.

### `Participacao`
-   **Tabela**: `participacoes`
-   **Propósito**: Definir a porcentagem de posse de cada proprietário sobre um imóvel.
-   **Campos Principais**:
    -   `id`: Chave primária.
    -   `imovel_id`: Chave estrangeira para `imoveis`.
    -   `proprietario_id`: Chave estrangeira para `proprietarios`.
    -   `porcentagem`: A porcentagem de participação (ex: 50.00 para 50%).
-   **Constraints**:
    -   `uniq_participacao_data`: Garante que um proprietário tenha apenas um registro de participação por imóvel em uma mesma data.

### `LogImportacao`
-   **Tabela**: `log_importacoes`
-   **Propósito**: Registrar o histórico de importações de dados (Excel), incluindo sucesso, falhas e outros metadados.

### `Alias`
-   **Tabela**: `alias`
-   **Propósito**: Agrupar múltiplos proprietários sob um único "apelido" (alias), para facilitar a gestão de grupos ou famílias.
-   **Campos Principais**:
    -   `alias`: Nome do grupo.
    -   `id_proprietarios`: Um array (em formato JSON) dos IDs dos proprietários que pertencem ao grupo.

### `Transferencia`
-   **Tabela**: `transferencias`
-   **Propósito**: Registrar transferências de valores entre proprietários ou grupos (alias).
-   **Campos Principais**:
    -   `alias_id`: Chave estrangeira para `alias`.
    -   `valor_total`: O montante total da transferência.
    -   `origem_id_proprietario`, `destino_id_proprietario`: IDs dos proprietários envolvidos.

---

## Esquemas Pydantic

Para cada modelo SQLAlchemy, existe um esquema Pydantic correspondente (ex: `ImovelSchema`). Esses esquemas são usados pelo FastAPI para:
-   **Validação de Requisições**: Garantir que os dados enviados para a API (ex: em um POST ou PUT) estejam no formato correto.
-   **Serialização de Respostas**: Definir a estrutura dos dados que a API retorna, ocultando campos internos se necessário.
-   **Documentação Automática**: Gerar a documentação interativa da API (Swagger/ReDoc) com exemplos claros dos modelos de dados.

---

## Classes Utilitárias

-   `AluguelSimplesValidator`: Contém métodos estáticos para validar dados de aluguéis, como `validar_mes` e `validar_ano`.
-   `ResumenCalculator`: Fornece lógica para calcular resumos e estatísticas a partir de uma lista de aluguéis.

A presença dessas classes no arquivo de modelos é uma escolha de design. Em projetos maiores, essa lógica de negócio é frequentemente movida para um diretório de `serviços` ou `utils` para manter os modelos focados apenas na estrutura dos dados.
