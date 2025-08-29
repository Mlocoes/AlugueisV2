import os
from dotenv import load_dotenv
import psycopg2

# Carregar variáveis do .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

db_url = os.getenv('DATABASE_URL')
if not db_url:
    raise Exception('DATABASE_URL não encontrado no .env')

# Extrair credenciais do DATABASE_URL
import re
match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(\w+)', db_url)
if not match:
    raise Exception('Formato de DATABASE_URL inválido')
usuario, senha, host, porta, dbname = match.groups()
# Se host for 'postgres_v2', usar 'localhost' para conexão local
if host == 'postgres_v2':
    host = 'localhost'
superuser = os.getenv('POSTGRES_USER', 'postgres')
superpass = os.getenv('POSTGRES_PASSWORD', '')
conn = psycopg2.connect(dbname=dbname, user=superuser, password=superpass, host=host, port=porta)
conn.autocommit = True
cur = conn.cursor()

# Criar usuário e dar permissões
try:
    cur.execute(f"CREATE ROLE {usuario} LOGIN PASSWORD '{senha}';")
except Exception as e:
    print(f"Aviso: {e}")
try:
    cur.execute(f"GRANT ALL PRIVILEGES ON DATABASE {dbname} TO {usuario};")
except Exception as e:
    print(f"Aviso: {e}")
print(f"Usuário '{usuario}' criado/atualizado e permissões concedidas.")
cur.close()
conn.close()
