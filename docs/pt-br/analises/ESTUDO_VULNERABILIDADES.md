# Estudo de Vulnerabilidades - Sistema de Aluguéis V2

Este documento detalha os resultados de uma análise de segurança realizada no código-fonte do Sistema de Aluguéis V2. A análise focou em vulnerabilidades comuns em aplicações web.

## Resumo Executivo

O sistema possui uma base de segurança sólida, utilizando práticas modernas como o hashing de senhas com `bcrypt`, autenticação baseada em JWT e o uso de um ORM (SQLAlchemy) que previne a maioria dos ataques de SQL Injection. No entanto, foram identificados alguns pontos de risco que devem ser tratados para garantir a segurança da aplicação em um ambiente de produção.

---

## Vulnerabilidades Identificadas

### 1. Credenciais Padrão (Risco: CRÍTICO)

-   **Descrição**: O sistema é instalado com um usuário administrador padrão com as credenciais `admin` / `admin`. Se essas credenciais não forem alteradas imediatamente após a instalação, um atacante pode obter acesso administrativo completo ao sistema.
-   **Localização**: A lógica de login está em `backend/routers/auth.py`. As credenciais são definidas pelo primeiro usuário que acessa o sistema.
-   **Impacto**: Acesso total à aplicação, incluindo a capacidade de visualizar, modificar e excluir todos os dados, além de gerenciar outros usuários.
-   **Recomendação**:
    -   **Curto Prazo**: Forçar a alteração da senha do administrador no primeiro login. O frontend deve redirecionar o usuário para uma tela de "Alterar Senha" imediatamente após o primeiro login bem-sucedido.
    -   **Longo Prazo**: Durante o processo de setup (`/setup-primeiro-admin`), exigir que o usuário defina uma senha complexa em vez de usar uma padrão.

### 2. Endpoints Públicos com Dados Sensíveis (Risco: ALTO)

-   **Descrição**: Os roteadores `extras.py` e `transferencias.py` contêm endpoints (`/reportes` e `/relatorios`, respectivamente) que são deliberadamente públicos (não exigem autenticação) para facilitar a integração com ferramentas de relatórios.
-   **Localização**: `backend/routers/extras.py` e `backend/routers/transferencias.py`.
-   **Impacto**: Qualquer pessoa com acesso à URL da API pode listar todos os "Aliases" (grupos de proprietários) e todas as "Transferências" financeiras, expondo informações potencialmente sensíveis sobre a estrutura societária e as movimentações financeiras.
-   **Recomendação**:
    -   Remover o acesso público a esses endpoints.
    -   Se a integração com ferramentas externas for necessária, implementar um mecanismo de autenticação mais seguro, como chaves de API (API Keys) específicas para esses serviços, com permissões de apenas leitura.

### 3. Padrão de Código com Risco de XSS (Risco: MÉDIO)

-   **Descrição**: A função `SecurityUtils.setSafeHTML` em `frontend/js/utils/security.js` foi projetada para inserir HTML de forma segura, mas sua implementação é falha. Ela não sanitiza o template HTML em si, apenas os dados que são inseridos nele. Embora o uso atual no código seja seguro (porque os templates são estáticos e os dados são pré-escapados), esse padrão é frágil e propenso a erros. Um futuro desenvolvedor poderia facilmente introduzir uma vulnerabilidade de Cross-Site Scripting (XSS) se passasse dados do usuário como parte do template.
-   **Impacto**: Se explorado, um ataque de XSS poderia permitir que um atacante roubasse o token JWT da sessão de outro usuário, executasse ações em seu nome ou modificasse o conteúdo da página.
-   **Recomendação**:
    -   Refatorar a função `setSafeHTML` para que ela não seja mais necessária.
    -   Adotar uma abordagem mais segura e padrão para a construção de elementos DOM: criar os elementos programaticamente (`document.createElement`) e preencher seu conteúdo usando `textContent` (que é inerentemente seguro contra XSS), em vez de construir strings HTML e usar `innerHTML`.

### 4. Falta de Validação e Rate Limiting (Risco: BAIXO)

-   **Descrição**: Os endpoints de API, especialmente os que envolvem pesquisa e importação, não possuem mecanismos de limitação de taxa (rate limiting). Um atacante poderia fazer um grande número de requisições em um curto período, sobrecarregando o servidor (Denial of Service - DoS). Além disso, os campos de busca não validam a complexidade das queries, o que poderia levar a consultas lentas ao banco de dados.
-   **Impacto**: Indisponibilidade do serviço para usuários legítimos.
-   **Recomendação**:
    -   Implementar um middleware de "rate limiting" no FastAPI para limitar o número de requisições que um cliente pode fazer por minuto.
    -   Adicionar validação nos parâmetros de busca para limitar o uso de wildcards ou o comprimento máximo da string de pesquisa.

## Outras Considerações de Segurança

-   **Duplicação de Código**: A configuração do banco de dados está duplicada em `config.py` e `database.py`. Isso aumenta a complexidade e a chance de erros de configuração. O ideal é centralizar toda a configuração em um único local.
-   **Segredos no Ambiente**: O sistema utiliza `python-dotenv` para carregar segredos, o que é uma boa prática. É crucial garantir que o arquivo `.env` nunca seja versionado no Git. O arquivo `.gitignore` deve conter uma entrada para `.env`. (Verificação necessária).
-   **CORS**: A política de CORS é configurável, o que é bom. Em produção, ela deve ser configurada para permitir apenas a origem do frontend, em vez de `*`. A configuração atual já lida bem com isso, desativando credenciais se `*` for usado.
