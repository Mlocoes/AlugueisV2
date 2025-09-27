from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict
import pandas as pd
import traceback
from datetime import datetime
from models_final import Imovel, AluguelSimples, Usuario, Participacao
from config import get_db
from .auth import verify_token_flexible

router = APIRouter(prefix="/api/imoveis", tags=["imoveis"])

@router.get("/")
def listar_imoveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista todos os imóveis em ordem alfabética."""
    try:
        imoveis = db.query(Imovel).order_by(Imovel.nome).all()
        return {"success": True, "data": [imovel.to_dict() for imovel in imoveis]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar imóveis: {str(e)}")

@router.get("/{imovel_id}")
def obter_imovel(imovel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtém um imóvel específico pelo seu ID."""
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    return {"success": True, "data": imovel.to_dict()}

@router.post("/")
def criar_imovel(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Cria um novo imóvel a partir de um dicionário de dados."""
    try:
        novo_imovel = Imovel(**dados)
        db.add(novo_imovel)
        db.commit()
        db.refresh(novo_imovel)
        return {"success": True, "data": novo_imovel.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar imóvel: {str(e)}")

@router.put("/{imovel_id}", response_model=Dict)
def atualizar_imovel(imovel_id: int, dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Atualiza os dados de um imóvel existente."""
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")

    campos_modelo = [c.key for c in Imovel.__table__.columns]
    for campo, valor in dados.items():
        if campo in campos_modelo:
            setattr(imovel, campo, valor)

    imovel.data_atualizacao = datetime.now()
    db.commit()
    db.refresh(imovel)
    return imovel.to_dict()

@router.delete("/{imovel_id}")
def excluir_imovel(imovel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Exclui um imóvel, se não tiver aluguéis ou participações ativas associados."""
    import traceback
    from sqlalchemy.exc import SQLAlchemyError
    
    try:
        imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
        if not imovel:
            raise HTTPException(status_code=404, detail="Imóvel não encontrado")

        # Verificar se existem aluguéis associados a este imóvel
        alugueis_count = db.query(AluguelSimples).filter(AluguelSimples.imovel_id == imovel_id).count()
        if alugueis_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível excluir o imóvel porque tem {alugueis_count} aluguel(is) associado(s). Remova primeiro os aluguéis ou desative o imóvel."
            )

        # Verificar participações ativas (apenas com porcentagem > 0)
        participacoes_ativas_count = db.query(Participacao).filter(
            Participacao.imovel_id == imovel_id,
            Participacao.porcentagem > 0
        ).count()
        if participacoes_ativas_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível excluir o imóvel porque tem {participacoes_ativas_count} participação(ões) ativa(s) associada(s). Remova as participações primeiro."
            )

        # Limpar participações vazias (porcentagem = 0) antes de excluir
        participacoes_vazias = db.query(Participacao).filter(
            Participacao.imovel_id == imovel_id,
            Participacao.porcentagem == 0
        ).delete(synchronize_session=False)
        
        if participacoes_vazias > 0:
            print(f"Removidas {participacoes_vazias} participações vazias do imóvel {imovel_id}")

        db.delete(imovel)
        db.commit()
        return {"mensagem": "Imóvel excluído com sucesso"}
        
    except HTTPException:
        # Re-lançar HTTPExceptions sem modificar
        db.rollback()
        raise
    except SQLAlchemyError as e:
        # Capturar apenas erros de banco de dados
        db.rollback()
        print(f"Erro SQLAlchemy ao excluir imóvel: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor ao excluir imóvel")

@router.get("/disponiveis/", response_model=List[Dict])
def listar_imoveis_disponiveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista todos os imóveis disponíveis (não alugados)."""
    try:
        imoveis = db.query(Imovel).filter(Imovel.alugado == False).order_by(Imovel.nome).all()
        return [i.to_dict() for i in imoveis]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


