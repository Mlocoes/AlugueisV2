# 📋 Runbook de Operações - Sistema AlugueisV2

## Visão Geral

Este runbook contém procedimentos operacionais para manutenção, monitoramento, backup e recuperação do Sistema AlugueisV2.

## 🚀 Inicialização do Sistema

### 1. Ambiente de Desenvolvimento
```bash
# 1. Clonar repositório
git clone https://github.com/Mlocoes/AlugueisV2.git
cd AlugueisV2

# 2. Configurar ambiente
cp backend/.env.example backend/.env
# Editar backend/.env com valores apropriados

# 3. Iniciar serviços
docker-compose up -d postgres_v2
sleep 10  # Aguardar PostgreSQL inicializar

# 4. Criar tabelas
docker exec alugueisV2_backend python3 create_tables.py

# 5. Iniciar aplicação completa
docker-compose up -d

# 6. Verificar funcionamento
curl http://localhost:8000/api/health/detailed
python scripts/validate_system.py
```

### 2. Ambiente de Produção
```bash
# Deploy com Docker Compose
docker-compose -f docker-compose.yml up -d

# Verificar health check
curl https://api.alugueis.seudominio.com/api/health/detailed

# Executar validação
python scripts/validate_system.py
```

## 📊 Monitoramento

### 1. Health Checks
```bash
# Health check básico
curl http://localhost:8000/health

# Health check detalhado
curl http://localhost:8000/api/health/detailed

# Verificar resposta esperada
{
  "status": "healthy",
  "database": {
    "response_time": "0.040s",
    "status": "ok"
  },
  "system": {
    "memory_usage": "60.5%",
    "disk_usage": "25.3%",
    "cpu_count": 4,
    "cpu_percent": 15.2
  }
}
```

### 2. Monitoramento de Containers
```bash
# Status dos containers
docker ps

# Logs dos serviços
docker logs alugueisV2_backend --tail 50
docker logs alugueisV2_postgres --tail 50
docker logs alugueisV2_frontend --tail 50

# Uso de recursos
docker stats
```

### 3. Monitoramento de Banco de Dados
```bash
# Conectar ao PostgreSQL
docker exec -it alugueisV2_postgres psql -U alugueisv2_usuario -d alugueisv2_db

# Queries de monitoramento
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables;

# Verificar conexões ativas
SELECT count(*) as conexoes_ativas FROM pg_stat_activity;

# Tamanho das tabelas
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 💾 Backup e Recuperação

### 1. Backup do Banco de Dados
```bash
#!/bin/bash
# backup_database.sh

BACKUP_DIR="/opt/alugueis/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/alugueisv2_backup_${DATE}.sql"

# Criar diretório se não existir
mkdir -p $BACKUP_DIR

# Executar backup
docker exec alugueisV2_postgres pg_dump \
    -U alugueisv2_usuario \
    -d alugueisv2_db \
    --no-password \
    --format=custom \
    --compress=9 \
    --verbose \
    > $BACKUP_FILE

# Verificar se backup foi criado
if [ $? -eq 0 ]; then
    echo "✅ Backup criado: $BACKUP_FILE"
    # Manter apenas últimos 7 backups
    ls -t ${BACKUP_DIR}/alugueisv2_backup_*.sql | tail -n +8 | xargs rm -f
else
    echo "❌ Erro no backup"
    exit 1
fi
```

### 2. Backup de Arquivos
```bash
#!/bin/bash
# backup_files.sh

SOURCE_DIR="/opt/alugueis/uploads"
BACKUP_DIR="/opt/alugueis/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar backup comprimido
tar -czf ${BACKUP_DIR}/uploads_backup_${DATE}.tar.gz -C $SOURCE_DIR .

# Limpar backups antigos (manter 7 dias)
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" -mtime +7 -delete
```

### 3. Recuperação de Dados
```bash
#!/bin/bash
# restore_database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Uso: $0 <arquivo_backup>"
    exit 1
fi

# Parar aplicação
docker-compose down backend_v2

# Restaurar banco
docker exec -i alugueisV2_postgres pg_restore \
    -U alugueisv2_usuario \
    -d alugueisv2_db \
    --clean \
    --if-exists \
    --verbose \
    < $BACKUP_FILE

# Reiniciar aplicação
docker-compose up -d backend_v2

# Verificar
curl http://localhost:8000/api/health/detailed
```

## 🔧 Troubleshooting

### Problema: Backend não inicia
```bash
# Verificar logs
docker logs alugueisV2_backend

# Verificar conectividade com banco
docker exec alugueisV2_backend python3 -c "
import psycopg2
conn = psycopg2.connect('postgresql://alugueisv2_usuario:alugueisv2_senha@postgres_v2:5432/alugueisv2_db')
print('Conexão OK')
conn.close()
"

# Verificar variáveis de ambiente
docker exec alugueisV2_backend env | grep -E "(DATABASE|SECRET)"

# Reiniciar serviço
docker-compose restart backend_v2
```

### Problema: Erro 504 Gateway Timeout
```bash
# Verificar se backend está respondendo
curl -v http://localhost:8000/health

# Verificar logs do backend
docker logs alugueisV2_backend --tail 20

# Verificar se PostgreSQL está acessível
docker exec alugueisV2_postgres pg_isready -U alugueisv2_usuario -d alugueisv2_db

# Reiniciar serviços
docker-compose restart
```

### Problema: Upload falhando
```bash
# Verificar permissões do diretório
docker exec alugueisV2_backend ls -la /app/uploads/

# Verificar espaço em disco
df -h

# Verificar logs de upload
docker logs alugueisV2_backend 2>&1 | grep -i upload

# Testar upload manual
curl -X POST http://localhost:8000/api/upload/ \
  -F "file=@test.xlsx" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Problema: Alto uso de CPU/Memória
```bash
# Verificar processos
docker stats

# Verificar queries lentas no PostgreSQL
docker exec alugueisV2_postgres psql -U alugueisv2_usuario -d alugueisv2_db -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC
LIMIT 5;
"

# Reiniciar serviços se necessário
docker-compose restart backend_v2
```

## 🔄 Manutenção Programada

### 1. Atualização de Dependências
```bash
#!/bin/bash
# update_dependencies.sh

# Criar backup antes da atualização
./backup_database.sh

# Atualizar dependências
cd backend
pip install --upgrade -r requirements.txt

# Executar testes
pytest ../tests/ -v

# Se testes passarem, reconstruir containers
cd ..
docker-compose build --no-cache backend_v2
docker-compose up -d backend_v2

# Verificar funcionamento
curl http://localhost:8000/api/health/detailed
```

### 2. Limpeza de Arquivos Temporários
```bash
#!/bin/bash
# cleanup_temp_files.sh

# Limpar arquivos de upload antigos (24h)
find /opt/alugueis/uploads -name "*.xlsx" -mtime +1 -delete
find /opt/alugueis/uploads -name "*.xls" -mtime +1 -delete

# Limpar logs antigos (30 dias)
find /var/log/alugueis -name "*.log" -mtime +30 -delete

# Limpar backups antigos (30 dias)
find /opt/alugueis/backups -name "*.sql" -mtime +30 -delete
find /opt/alugueis/backups/files -name "*.tar.gz" -mtime +30 -delete
```

### 3. Otimização de Banco de Dados
```bash
#!/bin/bash
# optimize_database.sh

# Executar VACUUM ANALYZE
docker exec alugueisV2_postgres psql -U alugueisv2_usuario -d alugueisv2_db -c "VACUUM ANALYZE;"

# Reindexar tabelas
docker exec alugueisV2_postgres psql -U alugueisv2_usuario -d alugueisv2_db -c "
REINDEX DATABASE alugueisv2_db;
"

# Verificar tamanho das tabelas após otimização
docker exec alugueisV2_postgres psql -U alugueisv2_usuario -d alugueisv2_db -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## 📈 Escalabilidade

### 1. Monitoramento de Performance
```bash
# Métricas de resposta da API
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/alugueis/

# curl-format.txt
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### 2. Otimização de Queries
```sql
-- Queries problemáticas comuns
EXPLAIN ANALYZE
SELECT a.*, p.nome as proprietario_nome, i.endereco
FROM alugueis a
JOIN proprietarios p ON a.proprietario_id = p.id
JOIN imoveis i ON a.imovel_id = i.id
WHERE a.status = 'pendente';

-- Adicionar índices se necessário
CREATE INDEX IF NOT EXISTS idx_alugueis_status ON alugueis(status);
CREATE INDEX IF NOT EXISTS idx_alugueis_data_vencimento ON alugueis(data_vencimento);
```

### 3. Configuração de Cache (Recomendado)
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis

# Configuração de Redis para cache
@asynccontextmanager
async def lifespan(app: FastAPI):
    redis = aioredis.from_url("redis://localhost")
    FastAPICache.init(RedisBackend(redis), prefix="alugueis-cache")
    yield
    await FastAPICache.clear()

# Uso em endpoints
@router.get("/alugueis")
@cache(expire=300)  # Cache por 5 minutos
async def listar_alugueis():
    return await get_alugueis_from_db()
```

## 🚨 Plano de Contingência

### 1. Cenário: Perda de Dados
1. **Isolar** o ambiente afetado
2. **Identificar** ponto de falha
3. **Restaurar** do último backup válido
4. **Verificar** integridade dos dados
5. **Documentar** causa raiz
6. **Implementar** medidas preventivas

### 2. Cenário: Ataque de Segurança
1. **Desconectar** sistema da rede
2. **Preservar** evidências (logs, dumps)
3. **Notificar** equipe de segurança
4. **Alterar** todas as credenciais
5. **Auditar** acessos e permissões
6. **Reforçar** controles de segurança

### 3. Cenário: Indisponibilidade Crítica
1. **Ativar** site de contingência
2. **Redirecionar** usuários para sistema alternativo
3. **Comunicar** status aos stakeholders
4. **Investigar** causa raiz
5. **Restaurar** serviço primário
6. **Executar** testes de failover

## 📞 Contato de Emergência

**Equipe de Operações**: [Nome da equipe]
**Email**: ops@seudominio.com
**Telefone**: [Número 24/7]
**Slack**: #alugueis-ops

**Equipe de Segurança**: [Nome da equipe]
**Email**: security@seudominio.com
**Telefone**: [Número de emergência]

---

*Atualizar este runbook após cada incidente ou mudança significativa no sistema.*