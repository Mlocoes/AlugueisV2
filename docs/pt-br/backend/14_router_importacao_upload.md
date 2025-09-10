# Documentação: `backend/routers/importacao.py` e `upload.py`

Estes dois roteadores gerenciam a importação de dados para o sistema. O `upload.py` oferece um fluxo de trabalho mais moderno e robusto, enquanto o `importacao.py` (e os endpoints `/importar` em outros roteadores) parece ser uma implementação mais antiga ou alternativa. A documentação focará no fluxo do `upload.py`, que é o recomendado.

## Fluxo de Importação Recomendado (`upload.py`)

O processo de importação é dividido em três etapas para fornecer uma experiência mais segura e interativa ao usuário:

1.  **Upload**: O usuário envia um arquivo (Excel, CSV, TSV).
2.  **Processamento e Validação**: O sistema analisa o arquivo, detecta o tipo de dados, valida as colunas e os dados, e retorna um resumo com erros e avisos.
3.  **Importação**: Se a validação for satisfatória, o usuário confirma, e o sistema importa os dados para o banco de dados.

---

### Endpoints do `upload.py`

Todos os endpoints estão prefixados com `/api/upload`.

#### `POST /`

-   **Descrição**: Recebe um arquivo e o armazena temporariamente no servidor.
-   **Corpo da Requisição**: `multipart/form-data` com o arquivo.
-   **Resposta**: Retorna um `file_id` único que será usado nas próximas etapas.
    ```json
    {
      "success": true,
      "file_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "message": "Arquivo subido exitosamente"
    }
    ```

#### `POST /process/{file_id}`

-   **Descrição**: Analisa o arquivo previamente enviado.
-   **Lógica**:
    -   Usa a classe `FileProcessor` para ler cada planilha do arquivo.
    -   **Detecta automaticamente o tipo de dados** (proprietários, imóveis, etc.) com base nas palavras-chave dos cabeçalhos das colunas.
    -   Valida os dados em cada planilha contra um conjunto de regras (ex: colunas obrigatórias, valores vazios).
-   **Resposta**: Retorna um resumo da análise, incluindo os tipos de dados detectados e uma lista de erros e avisos de validação. Isso permite que o frontend exiba uma pré-visualização para o usuário antes da importação final.

#### `POST /import/{file_id}`

-   **Descrição**: Executa a importação final dos dados para o banco de dados.
-   **Lógica**:
    -   Só funciona se o arquivo já tiver sido processado com sucesso.
    -   Cria um registro na tabela `log_importacoes` para rastrear a operação.
    -   Itera sobre os dados processados e os insere nas tabelas correspondentes (`proprietarios`, `imoveis`, etc.).
-   **Resposta**: Um resumo da importação, incluindo o número de registros importados por tipo de dado.

---

### `GET /templates/{template_type}`

-   **Descrição**: Endpoint utilitário que permite ao usuário baixar modelos (templates) de arquivos Excel pré-formatados.
-   **Parâmetros de URL**:
    -   `template_type` (str): O tipo de modelo desejado. Pode ser `proprietarios`, `imoveis`, `participacoes` ou `alugueis`.
-   **Resposta**: O download de um arquivo `.xlsx` com as colunas corretas e dados de exemplo para guiar o usuário no preenchimento.

---

## Roteador `importacao.py` (Legacy)

Este roteador contém endpoints que realizam a importação em uma única etapa, como `/importar-excel` e `/importar-alquileres-modelo`. Embora funcionais, eles são menos interativos e robustos que o fluxo provido pelo `upload.py`. Recomenda-se o uso do fluxo de `upload` para todas as novas implementações de frontend.
