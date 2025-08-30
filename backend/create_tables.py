from models_final import Base
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://alugueisv2_usuario:alugueisv2_senha@192.168.0.7:5432/alugueisv2_db')
engine = create_engine(DATABASE_URL)

# Crear todas las tablas
Base.metadata.create_all(engine)
print('Tablas creadas/verificadas exitosamente')

with engine.connect() as conn:
    result = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
    print('=== TABLAS EXISTENTES ===')
    for row in result:
        print(row.tablename)
