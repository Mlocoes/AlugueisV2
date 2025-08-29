"""
Script para atualizar todas as participações do sistema para uma data específica.
Uso: python update_all_participacoes_date.py
"""

import sys
import subprocess
def ensure_package(pkg):
    try:
        __import__(pkg)
    except ImportError:
        print(f"Instalando dependência: {pkg}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

ensure_package("sqlalchemy")
ensure_package("psycopg2_binary")

from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models_final import Participacao, Base

# Configuração do banco de dados (ajuste conforme necessário)
DATABASE_URL = "postgresql://alugueisv2_usuario:alugueisv2_senha@localhost:5432/alugueisv2_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Data desejada
nova_data = datetime(2000, 1, 10)

participacoes = session.query(Participacao).all()
for p in participacoes:
    p.data_registro = nova_data
session.commit()
print(f"Atualizadas {len(participacoes)} participações para data {nova_data.date()}")
