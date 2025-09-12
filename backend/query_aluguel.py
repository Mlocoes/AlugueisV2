from sqlalchemy.orm import Session
from sqlalchemy import and_
from models_final import Proprietario, Imovel, AluguelSimples
from config import get_db

def get_aluguel_data(db: Session, proprietario_nome: str, imovel_nome: str, mes: int, ano: int):
    proprietario = db.query(Proprietario).filter(Proprietario.nome == proprietario_nome).first()
    if not proprietario:
        return f"Proprietário '{proprietario_nome}' não encontrado."

    imovel = db.query(Imovel).filter(Imovel.nome == imovel_nome).first()
    if not imovel:
        return f"Imóvel '{imovel_nome}' não encontrado."

    aluguel = db.query(AluguelSimples).filter(
        and_(
            AluguelSimples.imovel_id == imovel.id,
            AluguelSimples.proprietario_id == proprietario.id,
            AluguelSimples.mes == mes,
            AluguelSimples.ano == ano
        )
    ).first()

    if aluguel:
        return {
            "proprietario": proprietario.nome,
            "imovel": imovel.nome,
            "mes": aluguel.mes,
            "ano": aluguel.ano,
            "valor_liquido_proprietario": float(aluguel.valor_liquido_proprietario),
            "taxa_administracao_total": float(aluguel.taxa_administracao_total),
            "taxa_administracao_proprietario": float(aluguel.taxa_administracao_proprietario)
        }
    else:
        return f"Aluguel para {proprietario_nome} em {imovel_nome} para {mes}/{ano} não encontrado."

if __name__ == "__main__":
    db_session = next(get_db())
    try:
        result = get_aluguel_data(db_session, "Jandira", "Cunha Gago 223", 8, 2025)
        print(result)
    finally:
        db_session.close()
