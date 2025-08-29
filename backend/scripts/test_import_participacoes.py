import os
import sys
import pandas as pd
from sqlalchemy import create_engine
# Adiciona o diretório do backend ao sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from models_final import Participacao, Imovel, Proprietario
from database import SessionLocal

def test_import_participacoes():
    # Caminho do arquivo de teste
    excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..', 'Participacoes.xlsx'))
    assert os.path.exists(excel_path), f"Arquivo não encontrado: {excel_path}"
    
    # Ler planilha
    df = pd.read_excel(excel_path)
    print('Colunas:', df.columns.tolist())
    print('Primeiras linhas:', df.head())
    
    # Conectar ao banco
    db = SessionLocal()
    # Testar busca de imóvel e proprietário
    nome_imovel = df.iloc[0, 0]
    imovel = db.query(Imovel).filter(Imovel.nome == nome_imovel).first()
    print('Imóvel encontrado:', imovel)
    nome_prop = df.columns[3]
    proprietario = db.query(Proprietario).filter(Proprietario.nome == nome_prop).first()
    print('Proprietário encontrado:', proprietario)
    db.close()

if __name__ == "__main__":
    test_import_participacoes()
