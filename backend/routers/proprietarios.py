from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any
import pandas as pd
import traceback
import io
from models_final import Proprietario, Usuario, ProprietarioUpdateSchema, ProprietarioCreateSchema
from config import get_db
from .auth import verify_token_flexible, is_admin

router = APIRouter(prefix="/api/proprietarios", tags=["proprietarios"])

# Limite máximo do arquivo de importação em bytes (ex: 10 MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# ===========================================
# DEPENDENCIES
# ===========================================

def get_proprietario_or_404(proprietario_id: int, db: Session = Depends(get_db)) -> Proprietario:
    """Dependency to get a proprietario by ID, raises 404 if not found."""
    proprietario = db.query(Proprietario).filter(Proprietario.id == proprietario_id).first()
    if not proprietario:
        raise HTTPException(status_code=404, detail="Proprietário não encontrado")
    return proprietario

# ===========================================
# ROUTES
# ===========================================

@router.get("/", response_model=List[Dict])
def listar_proprietarios(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista todos os proprietários em ordem alfabética."""
    try:
        proprietarios = db.query(Proprietario).order_by(Proprietario.nome).all()
        return [p.to_dict() for p in proprietarios]
    except SQLAlchemyError as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados ao listar proprietários.")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao listar proprietários.")

@router.post("/", response_model=Dict, status_code=201)
def criar_proprietario(dados: ProprietarioCreateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(is_admin)):
    """Cria um novo proprietário."""
    try:
        novo_proprietario = Proprietario(**dados.dict())
        db.add(novo_proprietario)
        db.commit()
        db.refresh(novo_proprietario)
        return novo_proprietario.to_dict()
    except SQLAlchemyError as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro de banco de dados ao criar proprietário.")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno ao criar proprietário.")

@router.get("/{proprietario_id}", response_model=Dict)
def obter_proprietario(proprietario: Proprietario = Depends(get_proprietario_or_404), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtém um proprietário específico pelo seu ID."""
    return proprietario.to_dict()

@router.put("/{proprietario_id}", response_model=Dict)
def atualizar_proprietario(dados: ProprietarioUpdateSchema, proprietario: Proprietario = Depends(get_proprietario_or_404), db: Session = Depends(get_db), current_user: Usuario = Depends(is_admin)):
    """Atualiza os dados de um proprietário existente."""
    try:
        update_data = dados.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(proprietario, field, value)

        db.commit()
        db.refresh(proprietario)
        return proprietario.to_dict()
    except SQLAlchemyError as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro de banco de dados ao atualizar proprietário.")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar proprietário.")


@router.delete("/{proprietario_id}")
def excluir_proprietario(proprietario: Proprietario = Depends(get_proprietario_or_404), db: Session = Depends(get_db), current_user: Usuario = Depends(is_admin)):
    """Exclui um proprietário. A exclusão falhará se houver aluguéis ou participações associadas."""
    try:
        db.delete(proprietario)
        db.commit()
        return {"mensagem": "Proprietário excluído com sucesso"}
    except SQLAlchemyError as e:
        db.rollback()
        if "violates foreign key constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Não é possível excluir o proprietário. Existem dependências associadas.")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro de banco de dados ao excluir proprietário.")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Erro interno ao excluir proprietário.")
