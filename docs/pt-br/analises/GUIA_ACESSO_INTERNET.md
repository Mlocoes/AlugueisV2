# Guia de Acesso e Deploy na Internet

Este documento descreve a arquitetura de rede do Sistema de Aluguéis V2 e fornece um guia sobre como implantar a aplicação em um ambiente de produção acessível pela internet.

## Arquitetura de Rede Local (Desenvolvimento)

O `docker-compose.yml` principal é projetado para um ambiente de desenvolvimento local simples e eficaz.

### Componentes

-   **`postgres_v1`**: O banco de dados PostgreSQL.
-   **`adminer_v1`**: Uma interface web para gerenciar o banco de dados.
-   **`backend_v1`**: A API FastAPI.
-   **`frontend_v1`**: O servidor Nginx que serve a aplicação frontend.

### Comunicação entre Serviços

1.  **Rede Interna**: Todos os serviços são conectados a uma rede Docker customizada (`alugueisV1_network`). Isso permite que eles se comuniquem uns com os outros usando seus nomes de serviço como hostname (ex: o backend se conecta ao banco de dados através de `postgres_v1:5432`).
2.  **Exposição de Portas**: Os serviços expõem suas portas diretamente na máquina host:
    -   Frontend: `localhost:3000`
    -   Backend (API): `localhost:8000`
    -   Adminer: `localhost:8080`
    -   Postgres: `localhost:5432`
3.  **Proxy Reverso (Nginx)**: O Nginx do serviço `frontend_v1` atua como um proxy reverso para o backend. Qualquer requisição que o navegador faça para `http://localhost:3000/api/...` é internamente redirecionada pelo Nginx para o serviço `backend_v1:8000`. Isso simplifica o desenvolvimento e evita problemas de CORS, pois para o navegador, tanto o site quanto a API estão na mesma origem (`localhost:3000`).

Este setup é ideal para desenvolvimento, mas **não é seguro para produção** porque expõe as portas do backend e do banco de dados diretamente.

---

## Arquitetura de Produção com Traefik

Para expor a aplicação na internet de forma segura, o sistema está preparado para usar o **Traefik**, um moderno proxy reverso e load balancer. O arquivo `docker-compose.traefik.yml` adapta a aplicação para este cenário.

**Pré-requisito**: Você precisa ter uma instância do Traefik v2 já rodando em seu servidor. A configuração do Traefik em si está fora do escopo deste guia, mas ele deve ser configurado para observar os contêineres Docker e usar um resolvedor de certificados como o Let's Encrypt.

### Passos para o Deploy em Produção

#### 1. Configurar o Ambiente

-   **Servidor**: Prepare um servidor Linux (VPS ou dedicado) com Docker e Docker Compose instalados.
-   **DNS**: Configure os registros DNS do seu domínio. Você precisará de dois subdomínios (ou um domínio principal e um subdomínio):
    -   `app.seusite.com` -> apontando para o IP do seu servidor (para o frontend).
    -   `api.seusite.com` -> apontando para o IP do seu servidor (para o backend).
-   **Variáveis de Ambiente**: Crie um arquivo `.env` na raiz do projeto no seu servidor com as seguintes variáveis:
    ```env
    # Configuração do Banco de Dados (use senhas fortes!)
    POSTGRES_DB=alugueisv2_prod
    POSTGRES_USER=user_prod
    POSTGRES_PASSWORD=senha_super_segura_aqui

    # Configuração da Aplicação
    DATABASE_URL=postgresql://user_prod:senha_super_segura_aqui@postgres_v1:5432/alugueisv2_prod
    SECRET_KEY=outra_chave_secreta_muito_longa_e_aleatoria
    DEBUG=false
    ENV=production

    # Domínios para o Traefik
    FRONTEND_DOMAIN=app.seusite.com
    BACKEND_DOMAIN=api.seusite.com

    # Ativar Traefik
    USE_TRAEFIK=true
    ```

#### 2. Iniciar a Aplicação com Traefik

No servidor, dentro do diretório do projeto, execute o seguinte comando:

```bash
docker-compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

### O que Acontece com este Comando?

-   O `-f` permite combinar múltiplos arquivos de compose. O `docker-compose.traefik.yml` sobrescreve partes do `docker-compose.yml`.
-   **Portas Fechadas**: As portas dos serviços `backend_v1` e `frontend_v1` não são mais expostas diretamente. O único ponto de entrada para eles será o Traefik.
-   **Labels do Traefik**: As `labels` nos serviços são ativadas (`traefik.enable=true`). O Traefik as lerá e automaticamente:
    -   Configurará a rota `app.seusite.com` para apontar para o serviço `frontend_v1`.
    -   Configurará a rota `api.seusite.com` para apontar para o serviço `backend_v1`.
    -   Solicitará e configurará certificados SSL/TLS (HTTPS) para ambos os domínios usando o resolvedor de certificados definido (no exemplo, `cloudflare`).
    -   Aplicará middlewares para adicionar cabeçalhos de segurança e gerenciar o CORS diretamente no proxy, que é a abordagem mais segura e eficiente.

### 3. Acesso à Aplicação

Após a execução, a aplicação estará acessível de forma segura através de:

-   **Frontend**: `https://app.seusite.com`
-   **Backend**: `https://api.seusite.com`

O Traefik cuidará do roteamento, do HTTPS e da comunicação segura entre o mundo exterior e os contêineres Docker.
