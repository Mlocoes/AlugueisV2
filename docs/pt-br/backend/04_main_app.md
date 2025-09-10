# Documentação: `backend/main.py`

O arquivo `main.py` é o ponto de entrada da aplicação backend. Ele é responsável por inicializar a instância do FastAPI, configurar middlewares, registrar os módulos de rotas e definir endpoints globais como o de verificação de saúde (health check).

## Principais Responsabilidades

1.  **Inicialização da Aplicação**: Cria a instância principal do FastAPI, carregando as configurações (título, descrição, etc.) definidas no arquivo `config.py`.
    ```python
    app = FastAPI(**APP_CONFIG)
    ```

2.  **Configuração de Middleware**: Adiciona o `CORSMiddleware` à aplicação, utilizando as configurações de `CORS_CONFIG` (também de `config.py`). Isso é crucial para permitir que o frontend (hospedado em um domínio ou porta diferente) possa se comunicar com a API.
    ```python
    app.add_middleware(CORSMiddleware, **CORS_CONFIG)
    ```

3.  **Inclusão de Roteadores (Routers)**: A aplicação segue um padrão de design modular. Em vez de definir todos os endpoints neste arquivo, eles são organizados em arquivos separados no diretório `routers/`. O `main.py` é responsável por importar e incluir esses roteadores.
    ```python
    from routers import alugueis, estadisticas, importacao, ...

    app.include_router(auth.router)
    app.include_router(alugueis.router)
    # ... e assim por diante para todos os outros roteadores
    ```
    Isso mantém o código organizado e escalável.

4.  **Tarefa em Background (Background Task)**: O `main.py` define uma tarefa de limpeza que é executada periodicamente.
    -   **Função**: `cleanup_old_uploads()`
    -   **Ação**: Remove arquivos do diretório de upload (`UPLOAD_DIR`) que são mais antigos que 24 horas.
    -   **Frequência**: É executada a cada 6 horas, graças ao decorador `@repeat_every(seconds=...)` da biblioteca `fastapi-utils`.
    -   **Ciclo de Vida**: A tarefa é iniciada junto com a aplicação, através do decorador `@app.on_event("startup")`.

5.  **Endpoints Globais**:
    -   `GET /`: Endpoint raiz que retorna uma mensagem de boas-vindas com informações básicas sobre a API, seu estado e versão.
    -   `GET /health` e `GET /api/health`: Endpoint de "health check". Ele verifica a saúde do sistema, incluindo a conectividade com o banco de dados ao realizar uma contagem simples na tabela de aluguéis. Retorna um status `healthy` se tudo estiver funcionando ou um erro 500 caso contrário. É uma prática essencial para monitoramento de sistemas em produção.

## Execução da Aplicação

O bloco `if __name__ == "__main__":` permite que a aplicação seja executada diretamente com o Uvicorn, um servidor ASGI.
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```
Isso é útil para desenvolvimento e testes locais, mas em um ambiente de produção, a aplicação geralmente é executada por um gerenciador de processos como o Gunicorn, com o Uvicorn como classe de worker.
