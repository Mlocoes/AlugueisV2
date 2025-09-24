# Análise de Segurança, Qualidade e Funcionalidades - Tela de Importar (AlugueisV2)

## Funcionalidades Verificadas

### Frontend
- Formulários de importação para proprietários, imóveis, participações e aluguéis.
- Upload de arquivo via input file com validação básica de tipo.
- Envio do arquivo para endpoint `/api/upload/` (upload inicial).
- Processamento do arquivo via endpoint `/api/upload/process/{fileId}` (validação e detecção de tipos).
- Importação final via endpoint `/api/upload/import/{fileId}`.
- Feedback visual de progresso (loading, sucesso, erro).
- Exibição de resultados de validação (erros e avisos).
- Atualização automática dos módulos relevantes após importação.
- Inicialização e binding de eventos nos formulários.

### Backend
- Sistema multi-etapas: upload → processamento → importação.
- Validação de tipo de arquivo (Excel, CSV, TSV) e MIME type.
- Validação de tamanho máximo de arquivo (configurável).
- Detecção automática de tipo de dados por planilha (proprietários, imóveis, etc.).
- Validação de dados específicos por tipo (colunas obrigatórias, formatos, consistência).
- Importação em lote usando `bulk_insert_mappings` e `bulk_update_mappings`.
- Logs de importação com `LogImportacaoSimple`.
- Limpeza automática de arquivos antigos.
- Templates de exemplo para download.

## Vulnerabilidades Encontradas

### Frontend
- Falta de validação robusta do arquivo antes do envio (tipo, tamanho, conteúdo).
- Mensagens de erro do backend exibidas diretamente ao usuário sem tratamento.
- Ausência de sanitização dos dados importados antes de exibir ou processar.
- Possível perda de referência de eventos após reconstrução do DOM.
- Não há proteção contra upload de arquivos maliciosos (ex: scripts em CSV).

### Backend
- Validação de dados insuficiente (falta regex para formatos específicos como e-mail, telefone).
- Exposição de detalhes de exceções em mensagens de erro (poderia vazar informações sensíveis).
- Falta de sanitização de dados importados (risco de XSS se dados forem exibidos).
- Possível injeção SQL se dados não forem tratados adequadamente (embora use SQLAlchemy).
- Arquivos temporários podem acumular se limpeza falhar.
- Não há rate limiting para uploads.

## Códigos Duplicados
- Lógica de validação de arquivos similar a outros módulos (proprietários, imóveis).
- Métodos de feedback visual (loading, erro) repetidos em outros módulos.
- Mapeamento de colunas e detecção de tipos poderia ser centralizado.
- Tratamento de erros e logs similar em outros endpoints.

## Correções Propostas

### Frontend
- Implementar validação completa de arquivo antes do envio (tipo, tamanho, MIME).
- Tratar mensagens de erro do backend para exibir apenas informações amigáveis.
- Sanitizar todos os dados importados antes de exibir.
- Adicionar proteção contra arquivos maliciosos (verificar conteúdo).
- Centralizar lógica de upload/processamento em um utilitário global.

### Backend
- Adicionar validação extra com regex para campos como e-mail, telefone, documentos.
- Padronizar tratamento de erros para não expor detalhes internos.
- Implementar sanitização de dados importados (remover tags HTML, escapar caracteres).
- Adicionar rate limiting e validação de conteúdo de arquivos.
- Melhorar limpeza de arquivos temporários com jobs agendados.
- Centralizar mapeamento de colunas e detecção de tipos.

## Exemplo de Correção (Frontend - Validação de Arquivo)

```js
function validateFile(file) {
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) return false;
    if (file.size > maxSize) return false;
    // Verificar se não contém scripts
    if (file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (/<script/i.test(content)) throw new Error('Arquivo suspeito');
        };
        reader.readAsText(file);
    }
    return true;
}
```

## Exemplo de Correção (Backend - Sanitização e Validação)

```python
import re
from html import escape

def sanitize_string(value):
    if not isinstance(value, str):
        return value
    # Escapar HTML
    value = escape(value)
    # Remover caracteres de controle
    value = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value)
    return value

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# No processamento:
for row in df.iterrows():
    email = sanitize_string(row.get('email'))
    if email and not validate_email(email):
        errors.append(f"E-mail inválido: {email}")
```

## Recomendações Gerais
- Realizar testes automatizados de segurança (XSS, injeção, upload de arquivos maliciosos).
- Implementar rate limiting para prevenir abuso.
- Refatorar utilitários duplicados para módulos globais.
- Documentar todos os fluxos de validação e sanitização.
- Adicionar monitoramento e alertas para falhas de importação.

---

*Arquivo gerado por GitHub Copilot em 23/09/2025.*
</content>
<parameter name="filePath">/home/mloco/Escritorio/AlugueisV2/ANALISE_IMPORTAR_COMPLETA.md