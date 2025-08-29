import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Adicionar o diretório raiz ao path para encontrar os módulos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models_final import Usuario, Base
from database import DATABASE_URL

# Configuração do banco de dados
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Contexto de senha (deve ser o mesmo que em auth.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def is_hashed(password: str) -> bool:
    """Verifica se a senha parece já estar hasheada com bcrypt."""
    return password is not None and password.startswith("$2b$")

def migrate_passwords():
    """
    Migra senhas em texto plano para hashes bcrypt.
    """
    db = SessionLocal()
    try:
        print("Iniciando migração de senhas...")

        usuarios_para_atualizar = db.query(Usuario).all()

        migrados = 0
        ja_migrados = 0

        for usuario in usuarios_para_atualizar:
            if usuario.senha and not is_hashed(usuario.senha):
                print(f"Migrando senha para o usuário: {usuario.usuario}...")
                hashed_password = pwd_context.hash(usuario.senha)
                usuario.senha = hashed_password
                migrados += 1
            else:
                print(f"Senha para o usuário {usuario.usuario} já parece estar hasheada. Ignorando.")
                ja_migrados += 1

        if migrados > 0:
            db.commit()
            print(f"\n{migrados} senhas foram migradas com sucesso.")
        else:
            print("\nNenhuma senha precisou ser migrada.")

        print(f"{ja_migrados} senhas já estavam migradas.")

    except Exception as e:
        print(f"\nOcorreu um erro durante a migração: {e}")
        db.rollback()
    finally:
        db.close()
        print("\nMigração concluída.")

if __name__ == "__main__":
    # É uma boa prática verificar se o script está sendo executado diretamente
    # e talvez pedir uma confirmação.
    confirm = input("Este script irá modificar as senhas no banco de dados. Tem certeza que deseja continuar? (s/n): ")
    if confirm.lower() == 's':
        migrate_passwords()
    else:
        print("Operação cancelada.")
