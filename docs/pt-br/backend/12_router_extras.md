# Documentação: `backend/routers/extras.py`

Este roteador gerencia uma funcionalidade chamada "Alias", que permite agrupar múltiplos proprietários sob um único nome. Isso é útil para gerenciar entidades complexas como famílias ou grupos de investidores.

A maioria dos endpoints neste roteador requer privilégios de administrador, dada a natureza da funcionalidade.

## Conceito de Alias

-   Um **Alias** é simplesmente um rótulo (ex: "Família Silva") que está associado a uma lista de IDs de proprietários.
-   A lista de IDs é armazenada como um array JSON em um campo de texto no banco de dados.
-   Essa funcionalidade é usada em outras partes do sistema, como em transferências, para simplificar operações que envolvem múltiplos proprietários.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/extras`.

---

### Endpoints de Gerenciamento (Apenas Admin)

-   **`GET /`**: Lista todos os aliases cadastrados, com suporte a paginação.
-   **`POST /`**: Cria um novo alias.
    -   **Corpo da Requisição**:
        ```json
        {
          "alias": "Grupo de Investimento A",
          "id_proprietarios": "[1, 5, 8]"
        }
        ```
    -   **Validação**: O endpoint verifica se o nome do alias já existe e se todos os IDs de proprietários na lista são válidos.
-   **`GET /{alias_id}`**: Obtém os detalhes de um alias específico.
-   **`PUT /{alias_id}`**: Atualiza o nome ou a lista de proprietários de um alias.
-   **`DELETE /{alias_id}`**: Exclui um alias.
-   **`GET /{alias_id}/proprietarios`**: Retorna a lista detalhada (ID, nome, sobrenome) de todos os proprietários associados a um alias.

---

### Endpoints Auxiliares (Apenas Admin)

-   **`GET /proprietarios/disponiveis`**: Retorna uma lista de todos os proprietários cadastrados no sistema. Útil para o frontend exibir uma lista de seleção ao criar ou editar um alias.
-   **`GET /estatisticas`**: Fornece estatísticas simples, como o número total de aliases cadastrados.

---

### Endpoints Públicos para Relatórios

**Atenção**: Os seguintes endpoints são públicos (não exigem token de autenticação) para facilitar a integração com sistemas de relatórios externos. Isso é uma decisão de design que deve ser considerada em termos de segurança.

-   **`GET /reportes`**: Lista todos os aliases. É uma versão pública do endpoint `GET /`.
-   **`GET /{alias_id}/proprietarios/relatorios`**: Retorna a lista de proprietários de um alias específico. É uma versão pública do endpoint `GET /{alias_id}/proprietarios`.
