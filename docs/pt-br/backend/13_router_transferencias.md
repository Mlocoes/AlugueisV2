# Documentação: `backend/routers/transferencias.py`

Este roteador gerencia as "Transferências", que são registros de movimentações financeiras no sistema. As transferências estão frequentemente associadas a um "Alias" (grupo de proprietários), permitindo rastrear transações de um grupo como uma unidade.

## Níveis de Acesso

Este módulo implementa diferentes níveis de acesso para seus endpoints:
-   **Administrador**: Acesso total para criar, listar, visualizar, atualizar e excluir transferências.
-   **Usuário Logado**: Pode consultar a lista de transferências, mas não pode modificar dados.
-   **Público**: Um endpoint específico está disponível sem autenticação para facilitar a integração com ferramentas de relatórios.

## Endpoints da API

Todos os endpoints estão prefixados com `/api/transferencias`.

---

### Endpoints de Gerenciamento (Apenas Admin)

-   **`GET /`**: Lista todas as transferências cadastradas.
-   **`POST /`**: Cria um novo registro de transferência.
    -   **Corpo da Requisição**: Um objeto JSON com os dados da transferência, incluindo o `alias_id` ao qual ela pertence.
-   **`GET /{transferencia_id}`**: Obtém os detalhes de uma transferência específica.
-   **`PUT /{transferencia_id}`**: Atualiza os dados de uma transferência.
-   **`DELETE /{transferencia_id}`**: Exclui um registro de transferência.
-   **`GET /alias/{alias_id}`**: Lista todas as transferências associadas a um alias específico.

---

### Endpoint de Consulta (Usuário ou Admin)

-   **`GET /consulta`**: Retorna uma lista de todas as transferências. Este endpoint é acessível tanto para usuários com papel de `usuario` quanto `administrador`.

---

### Endpoint Público para Relatórios

**Atenção**: Este endpoint é público (não requer token de autenticação) para facilitar a integração com sistemas de relatórios externos.

-   **`GET /relatorios`**: Retorna uma lista de todas as transferências. É uma versão pública do endpoint `GET /consulta`.
