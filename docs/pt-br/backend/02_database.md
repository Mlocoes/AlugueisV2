# Documentação: `backend/database.py`

O arquivo `database.py` desempenha um papel central e multifacetado na arquitetura do backend. Ele não apenas gerencia a configuração e a conexão com o banco de dados, mas também implementa uma camada de serviço para operações de dados específicas, encapsulando a lógica de negócio relacionada ao acesso a dados.

**Nota sobre a Estrutura:** Este arquivo apresenta uma sobreposição de responsabilidades com `config.py` (ambos configuram a conexão com o banco) e com a camada de serviços (contém classes de serviço). Em uma futura refatoração, seria ideal centralizar a configuração da conexão em `config.py` e mover as classes de serviço para o diretório `services/`.

## Principais Responsabilidades

1.  **Configuração Avançada da Conexão**: Define a conexão com o banco de dados PostgreSQL usando SQLAlchemy, mas com configurações de pool de conexões (`QueuePool`) mais detalhadas para otimizar o desempenho em um ambiente com múltiplas requisições.
2.  **Gerenciamento de Sessões**: Fornece um gerenciador de contexto (`get_db_session`) que garante que cada transação com o banco de dados seja segura (commit em caso de sucesso, rollback em caso de erro) e que a sessão seja sempre fechada.
3.  **Inicialização e Teste do Banco de Dados**: Contém funções para inicializar o esquema do banco de dados (`init_database`) e para testar a conexão (`test_connection`).
4.  **Camada de Serviço (Service Layer)**: Implementa classes de serviço que contêm a lógica de negócio para interagir com as tabelas do banco de dados.

## Classes de Serviço

O arquivo define várias classes que atuam como uma camada de serviço, cada uma focada em uma entidade do sistema:

### `PropietarioService`

-   **Responsabilidade**: Gerenciar operações relacionadas aos proprietários.
-   **Métodos Principais**:
    -   `crear_propietario`: Cria um novo proprietário.
    -   `buscar_por_nombre`: Busca um proprietário pelo nome completo.
    -   `listar_activos`: Lista todos os proprietários ativos.

### `InmuebleService`

-   **Responsabilidade**: Gerenciar operações relacionadas aos imóveis.
-   **Métodos Principais**:
    -   `crear_inmueble`: Cria um novo imóvel.
    -   `buscar_por_nombre`: Busca um imóvel pelo nome.
    -   `listar_activos`: Lista todos os imóveis ativos.

### `ParticipacionService`

-   **Responsabilidade**: Gerenciar as participações dos proprietários nos imóveis.
-   **Métodos Principais**:
    -   `crear_participacion`: Cria um novo registro de participação.
    -   `validar_suma_porcentajes`: Verifica se a soma das participações de um imóvel totaliza 100%.
    -   `obtener_participaciones_inmueble`: Retorna todas as participações de um determinado imóvel.

### `AlquilerService`

-   **Responsabilidade**: Gerenciar os registros de aluguéis mensais e suas distribuições.
-   **Métodos Principais**:
    -   `crear_alquiler_mensual`: Registra um novo aluguel mensal para um imóvel.
    -   `calcular_distribuciones`: Calcula e cria os registros de `AlquilerDetalle`, distribuindo os valores do aluguel entre os proprietários com base em suas participações.
    -   `obtener_alquileres_periodo`: Busca registros de aluguel por ano e, opcionalmente, por mês.

### `LogService`

-   **Responsabilidade**: Gerenciar logs de importação de dados.
-   **Métodos Principais**:
    -   `crear_log_importacion`: Cria um registro de log quando uma importação é iniciada.
    -   `actualizar_resultado_importacion`: Atualiza o log com o resultado da importação (sucesso, falha, número de registros, etc.).

## Funções Utilitárias

-   `get_db_session()`: Um gerenciador de contexto que simplifica o trabalho com sessões do banco de dados, garantindo que sejam fechadas corretamente.
    ```python
    with get_db_session() as session:
        # seu código de banco de dados aqui
        session.query(...)
    ```
-   `verificar_integridad_participaciones()`: Uma função de verificação que itera sobre todos os imóveis e usa o `ParticipacionService` para garantir que a soma das participações seja 100%, retornando uma lista de imóveis com problemas.
