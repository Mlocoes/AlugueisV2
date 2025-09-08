# Análise de Segurança

Esta seção detalha as vulnerabilidades e os riscos de segurança identificados no projeto.

### 1. Credenciais e Segredos Expostos (Risco Crítico)

Foram encontradas múltiplas instâncias de segredos e senhas diretamente no código-fonte, o que representa uma vulnerabilidade grave.

*   **Arquivo `.env` Commitado:** Um arquivo `.env` contendo a senha do banco de dados (`POSTGRES_PASSWORD=alugueisv1_senha`) foi encontrado na raiz do projeto. Embora `.gitignore` esteja configurado para ignorar este arquivo, ele foi forçado a ser incluído no controle de versão (via `git add -f`). Isso expõe a credencial a qualquer pessoa com acesso ao repositório.
    *   **Recomendação:** O arquivo `.env` deve ser removido do histórico do Git imediatamente. Um arquivo de exemplo, como `.env.example`, deve ser criado em seu lugar, sem conter nenhum valor secreto.

*   **Senha Padrão no Script de Instalação:** O script `install.sh` contém a linha `POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-alugueisv1_senha}`. Isso define uma senha padrão fraca e conhecida se a variável de ambiente `POSTGRES_PASSWORD` não estiver definida, tornando as implantações vulneráveis.
    *   **Recomendação:** Remover a senha padrão. O script deve falhar se a variável de ambiente não for fornecida, forçando uma configuração segura.

*   **Credenciais de Teste:** O `README.md` e alguns scripts de teste (`analyze_all_endpoints.py`) contêm credenciais como `admin:admin` e `admin:admin123`.
    *   **Recomendação:** Embora seja em ambiente de teste, a prática recomendada é carregar essas credenciais de variáveis de ambiente em vez de deixá-las no código.

### 2. Vulnerabilidades nas Dependências do Backend (Risco Alto)

A verificação com a ferramenta `safety` não pôde ser totalmente eficaz devido à falta de "pinning" (fixação de versão) no arquivo `requirements.txt`.

*   **Resultado da Análise:** A ferramenta ignorou **15 vulnerabilidades potenciais** em pacotes críticos como `jinja2`, `pyjwt`, `pydantic` e `fastapi`. O fato de as versões não estarem fixadas significa que uma versão vulnerável de um pacote pode ser instalada a qualquer momento.
*   **Recomendação:** Fixar as versões de todas as dependências no `requirements.txt` usando o operador `==`. Após fixar as versões, executar novamente o `safety` para obter um relatório preciso das vulnerabilidades existentes e corrigi-las.

### 3. Vulnerabilidades nas Dependências do Frontend (Risco Alto)

A análise de segurança do frontend é **impossível** de ser realizada de forma automatizada.

*   **Causa Raiz:** A ausência de um arquivo `package.json`.
*   **Impacto**: Não há como saber quais versões do `vite` ou de outras bibliotecas JavaScript estão em uso. Portanto, não é possível usar ferramentas como `npm audit` para escanear e encontrar vulnerabilidades conhecidas, deixando o frontend exposto a riscos.
*   **Recomendação:** A criação de um `package.json` é urgente, não apenas por questões de organização, mas como uma medida de segurança fundamental.

### 4. Hashing de Senhas (Ponto Positivo)

A aplicação lida corretamente com o armazenamento de senhas dos usuários.

*   **Implementação:** O código em `backend/routers/auth.py` utiliza a biblioteca `passlib` para gerar hashes seguros das senhas (`get_password_hash`) e para verificá-las (`verify_password`).
*   **Análise:** Esta é a abordagem correta e padrão da indústria, prevenindo que as senhas dos usuários sejam comprometidas em caso de vazamento do banco de dados.
