# 🔒 Guia de Segurança - Sistema AlugueisV2

## Visão Geral

Este documento descreve as políticas e práticas de segurança implementadas no Sistema AlugueisV2, incluindo configurações de autenticação, autorização, proteção contra ataques comuns e melhores práticas.

## 📋 Políticas de Segurança

### 1. Autenticação e Autorização

#### JWT (JSON Web Tokens)
- **Algoritmo**: HS256
- **Expiração**: 8 horas (480 minutos)
- **Payload**: Contém `sub` (usuário), `tipo` (nível de acesso)
- **Refresh Tokens**: Não implementado (recomendado para produção)

#### Níveis de Usuário
- **Administrador**: Acesso completo ao sistema
- **Usuário**: Acesso limitado às próprias operações
- **Visitante**: Acesso apenas a endpoints públicos

#### Credenciais Padrão (Ambiente de Desenvolvimento)
```
Usuário: admin
Senha: admin00
```

### 2. Rate Limiting

#### Configuração Atual
- **Limite por IP**: 5 tentativas de login por minuto
- **Janela de Tempo**: 1 minuto
- **Bloqueio**: HTTP 429 (Too Many Requests)

#### Expansão Recomendada
```python
# Configurações adicionais recomendadas
@limiter.limit("10/minute")  # API geral
@limiter.limit("100/hour")   # Uploads
@limiter.limit("1000/day")   # Downloads
```

### 3. CORS (Cross-Origin Resource Sharing)

#### Configuração de Desenvolvimento
```python
CORS_CONFIG = {
    "allow_origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type"],
    "max_age": 86400
}
```

#### Configuração de Produção
```python
CORS_CONFIG = {
    "allow_origins": ["https://alugueis.seudominio.com"],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "X-API-Key"],
    "max_age": 86400
}
```

## 🛡️ Proteções Implementadas

### 1. Prevenção de SQL Injection
- **ORM Utilizado**: SQLAlchemy com parâmetros preparados
- **Validação de Entrada**: Sanitização de strings
- **Limitação de Tamanho**: Máximo 1000 caracteres por campo

### 2. Proteção XSS (Cross-Site Scripting)
- **Frontend**: Uso de `SecurityUtils.escapeHtml()`
- **Backend**: Validação de conteúdo HTML
- **Uploads**: Verificação de tipos MIME e conteúdo

### 3. Validação de Uploads
- **Tamanho Máximo**: 10MB por arquivo
- **Tipos Permitidos**: Excel (.xlsx, .xls), CSV
- **Verificação de Conteúdo**: Detecção de scripts maliciosos

### 4. Logs de Segurança
```python
def log_security_event(event: str, user: str = None, ip: str = None, details: dict = None):
    """Registra eventos de segurança."""
    log_data = {
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
        "user": user,
        "ip": ip,
        "details": details or {}
    }
    logger.warning(f"SECURITY EVENT: {log_data}")
```

## 🔐 Configuração de Ambiente

### Variáveis de Ambiente Seguras
```bash
# Produção - NUNCA committar
SECRET_KEY=your-256-bit-secret-key-here
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/dbname
ENV=production
DEBUG=false
CORS_ALLOW_ORIGINS=https://alugueis.seudominio.com

# Desenvolvimento
ENV=development
DEBUG=true
CORS_ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Arquivo .env.example
```bash
# Copiar para .env e configurar valores reais
ENV=development
SECRET_KEY=your-secret-key-here
DEBUG=true
CORS_ALLOW_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/dbname
```

## 📊 Monitoramento de Segurança

### Health Checks
- **Endpoint**: `/api/health/detailed`
- **Métricas**: CPU, memória, disco, resposta do banco
- **Status**: Healthy/Unhealthy

### Logs de Segurança
```json
{
  "event": "login_failed",
  "timestamp": "2024-01-01T12:00:00Z",
  "user": "unknown",
  "ip": "192.168.1.100",
  "details": {
    "attempts": 3,
    "user_agent": "Mozilla/5.0..."
  }
}
```

## 🚨 Resposta a Incidentes

### Procedimentos de Segurança

#### 1. Suspeita de Violação
1. **Isolar** o sistema afetado
2. **Documentar** evidências
3. **Notificar** equipe de segurança
4. **Analisar** logs de acesso

#### 2. Comprometimento Confirmado
1. **Alterar** todas as credenciais
2. **Auditar** permissões de acesso
3. **Verificar** integridade de dados
4. **Implementar** correções necessárias

#### 3. Recuperação
1. **Restaurar** backup limpo
2. **Atualizar** todas as dependências
3. **Revisar** configurações de segurança
4. **Monitorar** comportamento por 30 dias

## 🔧 Manutenção de Segurança

### Checklist Mensal
- [ ] Verificar vulnerabilidades em dependências
- [ ] Analisar logs de segurança
- [ ] Testar procedimentos de backup
- [ ] Validar configurações CORS
- [ ] Verificar expiração de certificados

### Checklist Trimestral
- [ ] Atualizar dependências críticas
- [ ] Revisar políticas de senha
- [ ] Testar plano de recuperação de desastres
- [ ] Auditar acessos de usuários
- [ ] Validar configurações de firewall

## 📞 Contato de Segurança

**Responsável por Segurança**: [Nome do responsável]
**Email**: security@seudominio.com
**Telefone**: [Número de emergência]

---

*Este documento deve ser revisado anualmente ou após qualquer incidente de segurança.*