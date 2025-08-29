import os
import sys
import psycopg2
from psycopg2 import sql
from passlib.context import CryptContext
from dotenv import load_dotenv

# Carregar variáveis do .env
load_dotenv()

DB = os.getenv('POSTGRES_DB')
USER = os.getenv('POSTGRES_USER')
PASSWORD = os.getenv('POSTGRES_PASSWORD')
HOST = os.getenv('POSTGRES_HOST', 'localhost')
PORT = os.getenv('POSTGRES_PORT', '5432')

admin_user = os.getenv('ADMIN_USER', 'admin')
admin_pass = os.getenv('ADMIN_PASS', 'admin')

# Gerar hash compatível com o backend (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = pwd_context.hash(admin_pass)

try:
    conn = psycopg2.connect(dbname=DB, user=USER, password=PASSWORD, host=HOST, port=PORT)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, usuario VARCHAR(50) UNIQUE NOT NULL, senha VARCHAR(128) NOT NULL, tipo_de_usuario VARCHAR(20) NOT NULL, data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
    # Verifica se já existe na tabela usuarios
    cur.execute("SELECT COUNT(*) FROM usuarios WHERE usuario=%s", (admin_user,))
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO usuarios (usuario, senha, tipo_de_usuario) VALUES (%s, %s, %s)",
                    (admin_user, hashed_password, 'administrador'))
        conn.commit()
        print(f'Usuário admin criado: {admin_user}')
    else:
        print(f'Usuário admin já existe: {admin_user}')
    cur.close()
    conn.close()
except Exception as e:
    print(f'Erro ao criar usuário admin: {e}')
    sys.exit(1)
