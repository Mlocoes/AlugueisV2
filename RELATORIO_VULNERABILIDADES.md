# Relatório de Vulnerabilidades do Sistema AlugueisV2

## Data da Análise
26 de Setembro de 2025

## Resumo Executivo
Uma análise de segurança completa do sistema AlugueisV2 foi conduzida, abrangendo tanto o backend quanto o frontend. A análise revelou várias vulnerabilidades críticas e de alto risco que expõem o sistema a ataques graves, como apropriação de contas de administrador, execução de ações não autorizadas em nome de usuários e roubo de sessões.

Embora o sistema demonstre a intenção de seguir boas práticas de segurança, falhas significativas na implementação comprometem sua postura de segurança geral. A correção imediata dessas vulnerabilidades é fortemente recomendada para proteger a integridade e a confidencialidade dos dados gerenciados pela aplicação.

## Vulnerabilidades Identificadas

### Backend

| ID | Vulnerabilidade | Risco | Detalhes |
| :--- | :--- | :--- | :--- |
| **BE-01** | **Chave Secreta CSRF Hardcoded** | <span style="color:red">**Crítico**</span> | A chave secreta para a proteção contra Cross-Site Request Forgery (CSRF) está hardcoded no arquivo `backend/main.py`. Isso anula completamente a proteção CSRF, permitindo que um invasor crie solicitações maliciosas que serão executadas no contexto de um usuário autenticado. |
| **BE-02** | **Credenciais Padrão Fracas e Setup Inseguro** | <span style="color:red">**Crítico**</span> | O sistema permite a criação do primeiro administrador através de um endpoint (`/api/auth/setup-primeiro-admin`) que não exige uma senha forte. A documentação sugere o uso de credenciais fracas (`admin:admin00`), o que torna trivial a tomada de controle da conta de administrador. |
| **BE-03** | **Modo `DEBUG` Inseguro por Padrão** | <span style="color:orange">**Médio**</span> | O modo `DEBUG` do FastAPI está habilitado por padrão em ambientes de não produção (`backend/config.py`). Se um ambiente de desenvolvimento ou teste for exposto à internet, isso pode vazar informações sensíveis de configuração e rastreamentos de pilha detalhados. |
| **BE-04** | **Rate Limiting Genérico** | <span style="color:yellow">**Baixo**</span> | Embora o endpoint de login tenha rate limiting, outras ações sensíveis (como criação de usuários ou upload de arquivos) não possuem limites de taxa específicos, conforme recomendado no próprio guia de segurança do projeto. |

### Frontend

| ID | Vulnerabilidade | Risco | Detalhes |
| :--- | :--- | :--- | :--- |
| **FE-01** | **Armazenamento Inseguro de JWT** | <span style="color:red">**Alto**</span> | O token de autenticação (JWT) é armazenado no `localStorage` (`frontend/index.html`), que é acessível via JavaScript. Qualquer vulnerabilidade de Cross-Site Scripting (XSS) pode ser explorada para roubar o token e sequestrar a sessão do usuário. |
| **FE-02** | **Proteção contra XSS Falha** | <span style="color:red">**Alto**</span> | A função `SecurityUtils.setSafeHTML` (`frontend/js/utils/security.js`) tenta sanitizar dados, mas os insere no DOM usando `.innerHTML`. Isso não protege contra ataques de XSS onde o payload malicioso está no próprio template HTML, tornando a sanitização ineficaz. |

## Recomendações de Melhoria

Para mitigar os riscos identificados, as seguintes ações são recomendadas:

1.  **BE-01:** Remova a chave secreta CSRF hardcoded e configure-a para ser carregada a partir de uma variável de ambiente segura.
2.  **BE-02:** Desabilite a criação de usuário com senha padrão. Implemente um processo de setup que gere uma senha de administrador forte e única, exibida apenas uma vez.
3.  **BE-03:** Configure o modo `DEBUG` para ser explicitamente desabilitado por padrão, exigindo uma variável de ambiente para ser ativado.
4.  **FE-01:** Refatore o sistema de autenticação para usar cookies `HttpOnly` e `Secure` para armazenar o JWT, tornando-o inacessível para o JavaScript do lado do cliente.
5.  **FE-02:** Substitua todos os usos de `setSafeHTML` por `textContent` sempre que possível. Para casos em que o HTML é necessário, utilize uma biblioteca de sanitização robusta como o DOMPurify para prevenir XSS.

A implementação dessas correções fortalecerá significativamente a segurança do sistema AlugueisV2.