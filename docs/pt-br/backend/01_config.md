# Documentação: `backend/config.py`

O arquivo `config.py` é o centro de todas as configurações da aplicação backend. Ele é responsável por carregar variáveis de ambiente, configurar a conexão com o banco de dados, definir as políticas de CORS (Cross-Origin Resource Sharing) e inicializar outras configurações essenciais para a execução da API.

## Principais Responsabilidades

1.  **Carregamento de Variáveis de Ambiente**: Utiliza a biblioteca `python-dotenv` para carregar configurações de um arquivo `.env`, permitindo separar configurações sensíveis (como senhas de banco de dados) do código-fonte.
2.  **Configuração do Banco de Dados**: Define a `DATABASE_URL` e inicializa o `engine` do SQLAlchemy, que gerencia as conexões com o banco de dados PostgreSQL.
3.  **Sessão do Banco de Dados**: Cria uma `SessionLocal` e a função `get_db`, que é uma dependência do FastAPI para injetar uma sessão do banco de dados em cada requisição.
4.  **Configuração do CORS**: Define quais origens (domínios) podem acessar a API, quais métodos HTTP são permitidos, etc. A configuração é flexível e pode ser ajustada por ambiente (desenvolvimento vs. produção).
5.  **Configurações da Aplicação FastAPI**: Define metadados da aplicação como título, descrição e versão, que são exibidos na documentação automática (Swagger UI).
6.  **Gerenciamento de Segredos e Debug**: Carrega a `SECRET_KEY`, essencial para a segurança (ex: assinatura de tokens JWT), e define o modo `DEBUG`.
7.  **Diretórios de Upload**: Configura e cria os diretórios para armazenamento de arquivos de upload.

## Estrutura do Arquivo

### Variáveis de Ambiente Carregadas

-   `ENV`: O ambiente da aplicação (`development` ou `production`). Padrão: `development`.
-   `DATABASE_URL`: A URL de conexão para o banco de dados PostgreSQL.
-   `CORS_ALLOW_ORIGINS`: Uma lista de domínios permitidos, separados por vírgula. Padrão: `*`.
-   `CORS_ALLOW_CREDENTIALS`: Se as credenciais (cookies, cabeçalhos de autorização) são permitidas. Padrão: `false` em desenvolvimento, `true` em produção.
-   `SECRET_KEY`: Chave secreta para operações criptográficas. **Obrigatória**.
-   `DEBUG`: Ativa ou desativa o modo de depuração. Padrão: `true` em desenvolvimento, `false` em produção.
-   `UPLOAD_DIR`: Diretório para arquivos temporários de upload.
-   `STORAGE_DIR`: Diretório para armazenamento permanente de arquivos.

### Configuração do SQLAlchemy

```python
# Configuração do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy setup
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency para obter sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
-   `engine`: O motor do SQLAlchemy que se conecta ao banco. `pool_pre_ping=True` verifica a validade das conexões antes de usá-las.
-   `SessionLocal`: Uma fábrica de sessões do banco de dados.
-   `Base`: A base declarativa para os modelos ORM.
-   `get_db`: Uma função geradora que fornece uma sessão do banco de dados para as rotas da API e garante que a sessão seja fechada após a requisição.

### Configuração do CORS

A configuração de CORS é dinâmica, baseada no ambiente. Em produção, é mais restritiva por padrão. Se `*` é usado em `ALLOW_ORIGINS`, as credenciais são desativadas automaticamente para cumprir as políticas de segurança dos navegadores.

### Validações de Segurança

O arquivo impõe uma validação crítica: a `SECRET_KEY` **deve** ser definida, caso contrário, a aplicação não iniciará. Isso previne a execução em um estado inseguro.
