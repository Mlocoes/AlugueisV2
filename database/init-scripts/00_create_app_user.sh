#!/bin/bash
set -e

# Aguardar PostgreSQL estar pronto
until pg_isready; do
  echo "Aguardando PostgreSQL..."
  sleep 2
done

# Tentar conectar como postgres (durante inicialização) ou como o usuário das variáveis
if psql -U postgres -d $POSTGRES_DB -c "SELECT 1;" 2>/dev/null; then
  SUPERUSER="postgres"
else
  SUPERUSER="$POSTGRES_USER"
fi

# Criar usuário da aplicação se não existir
psql -U $SUPERUSER -d $POSTGRES_DB -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$POSTGRES_USER') THEN
        CREATE ROLE $POSTGRES_USER LOGIN PASSWORD '$POSTGRES_PASSWORD';
    END IF;
END
\$\$;"

# Conceder permissões
psql -U $SUPERUSER -d $POSTGRES_DB -c "GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;"

echo "Usuário $POSTGRES_USER criado/atualizado com sucesso."