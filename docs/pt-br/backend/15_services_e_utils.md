# Documentação: `services` e `utils`

Esta seção cobre os módulos de serviço e utilitários, que contêm lógica de negócio e funções de ajuda reutilizáveis.

---

## `services/calculo_service.py`

Este serviço encapsula a lógica de negócio complexa para cálculos financeiros, mantendo os roteadores (controllers) mais limpos e focados em lidar com as requisições HTTP.

### Classe `CalculoService`

#### `calcular_taxas_imovel(db, imovel_id, mes, ano)`

-   **Propósito**: Calcula e distribui a taxa de administração de um imóvel entre seus proprietários para um período específico.
-   **Lógica**:
    1.  Obtém todos os registros de aluguel para o imóvel no mês/ano.
    2.  Calcula o valor bruto total do aluguel para o imóvel.
    3.  Para cada proprietário, calcula sua porcentagem de participação no valor bruto.
    4.  Aplica essa porcentagem à taxa de administração total do imóvel para encontrar a taxa proporcional de cada proprietário.
    5.  Calcula o valor líquido final para o proprietário (valor do aluguel - taxa proporcional).
    6.  Atualiza o registro `AluguelSimples` no banco de dados com os valores calculados.

#### `recalcular_todas_las_tasas(db)`

-   **Propósito**: Função de manutenção poderosa para garantir a consistência dos dados em todo o sistema.
-   **Lógica**:
    1.  Obtém uma lista de todos os períodos únicos (combinação de imóvel, mês e ano) que têm registros de aluguel.
    2.  Itera sobre cada período e chama o método `calcular_taxas_imovel` para recalcular e atualizar os dados.
-   **Uso**: Ideal para ser executada após alterações em massa nas participações ou nos valores de aluguel, garantindo que todas as taxas proporcionais e valores líquidos sejam corrigidos.

---

## `utils/helpers.py`

Este módulo contém pequenas funções utilitárias, principalmente para formatação de dados para exibição no frontend.

### Funções

#### `limpiar_nombre_propiedad(nombre)`

-   **Propósito**: Transforma um nome de imóvel (que pode ser um endereço longo) em um nome mais curto e legível.
-   **Ações**: Remove prefixos como "Rua" e "Avenida", remove vírgulas e limita o nome a um número de palavras para evitar quebras de layout no frontend.

#### `formatear_periodo_label(ano, mes)`

-   **Propósito**: Converte um ano e um mês numérico (ex: `2023`, `10`) em uma string formatada e amigável para humanos (ex: "Oct 2023").
-   **Uso**: Principalmente para criar os rótulos (labels) dos eixos em gráficos.
