"""
Router para Extras - Sistema de Alias
Acesso exclusivo para administradores
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import json
from datetime import datetime

from config import get_db
from models_final import Extra, ExtraCreate, ExtraUpdate, ExtraResponse, Proprietario
from routers.auth import verify_token, is_admin

router = APIRouter(
    prefix="/api/extras",
    tags=["extras"],
    responses={404: {"description": "Extra não encontrado"}},
)

def verify_admin_access(current_user = Depends(is_admin)):
    """Verificar se o usuário é administrador"""
    return current_user

@router.get("/", response_model=List[ExtraResponse])
async def listar_extras(
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de registros"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_access)
):
    """Listar todos os extras (apenas administradores)"""
    try:
        query = db.query(Extra)
        
        if ativo is not None:
            query = query.filter(Extra.ativo == ativo)
        
        extras = query.offset(skip).limit(limit).all()
        return [extra.to_dict() for extra in extras]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar extras: {str(e)}")

@router.get("/{extra_id}", response_model=ExtraResponse)
async def obter_extra(
    extra_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)
):
    """Obter um extra específico por ID"""
    extra = db.query(Extra).filter(Extra.id == extra_id).first()
    if not extra:
        raise HTTPException(status_code=404, detail="Extra não encontrado")
    
    return extra.to_dict()

@router.post("/", response_model=ExtraResponse)
async def criar_extra(
    extra_data: ExtraCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_access)
):
    """Criar um novo extra"""
    try:
        # Verificar se já existe um alias com o mesmo nome
        existing_extra = db.query(Extra).filter(Extra.alias == extra_data.alias).first()
        if existing_extra:
            raise HTTPException(status_code=400, detail="Já existe um alias com este nome")
        
        # Validar proprietários se fornecidos
        if extra_data.id_proprietarios:
            try:
                proprietario_ids = json.loads(extra_data.id_proprietarios)
                if not isinstance(proprietario_ids, list):
                    raise HTTPException(status_code=400, detail="id_proprietarios deve ser um array JSON")
                
                # Verificar se todos os proprietários existem
                for prop_id in proprietario_ids:
                    proprietario = db.query(Proprietario).filter(Proprietario.id == prop_id).first()
                    if not proprietario:
                        raise HTTPException(status_code=400, detail=f"Proprietário com ID {prop_id} não encontrado")
            
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="id_proprietarios deve ser um JSON válido")
        
        # Criar novo extra (apenas alias)
        novo_extra = Extra(
            alias=extra_data.alias,
            id_proprietarios=extra_data.id_proprietarios,
            ativo=extra_data.ativo
        )
        
        db.add(novo_extra)
        db.commit()
        db.refresh(novo_extra)
        
        return novo_extra.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar extra: {str(e)}")

@router.put("/{extra_id}", response_model=ExtraResponse)
async def atualizar_extra(
    extra_id: int,
    extra_data: ExtraUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_access)
):
    """Atualizar um extra existente"""
    try:
        extra = db.query(Extra).filter(Extra.id == extra_id).first()
        if not extra:
            raise HTTPException(status_code=404, detail="Extra não encontrado")
        
        # Atualizar campos se fornecidos
        if extra_data.alias is not None:
            # Verificar se já existe outro alias com o mesmo nome
            existing_extra = db.query(Extra).filter(
                Extra.alias == extra_data.alias,
                Extra.id != extra_id
            ).first()
            if existing_extra:
                raise HTTPException(status_code=400, detail="Já existe um alias com este nome")
            extra.alias = extra_data.alias
        
        if extra_data.id_proprietarios is not None:
            if extra_data.id_proprietarios:
                try:
                    proprietario_ids = json.loads(extra_data.id_proprietarios)
                    if not isinstance(proprietario_ids, list):
                        raise HTTPException(status_code=400, detail="id_proprietarios deve ser um array JSON")
                    
                    # Verificar se todos os proprietários existem
                    for prop_id in proprietario_ids:
                        proprietario = db.query(Proprietario).filter(Proprietario.id == prop_id).first()
                        if not proprietario:
                            raise HTTPException(status_code=400, detail=f"Proprietário com ID {prop_id} não encontrado")
                
                except json.JSONDecodeError:
                    raise HTTPException(status_code=400, detail="id_proprietarios deve ser um JSON válido")
            
            extra.id_proprietarios = extra_data.id_proprietarios
        
        if extra_data.ativo is not None:
            extra.ativo = extra_data.ativo
        
        db.commit()
        db.refresh(extra)
        
        return extra.to_dict()
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar extra: {str(e)}")

@router.delete("/{extra_id}")
async def deletar_extra(
    extra_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_access)
):
    """Deletar um extra (soft delete)"""
    try:
        extra = db.query(Extra).filter(Extra.id == extra_id).first()
        if not extra:
            raise HTTPException(status_code=404, detail="Extra não encontrado")
        
        # Soft delete - apenas marcar como inativo
        extra.ativo = False
        db.commit()
        
        return {"message": "Extra deletado com sucesso"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar extra: {str(e)}")

# Endpoint para busca por alias
@router.get("/buscar/{alias}", response_model=ExtraResponse)
async def buscar_por_alias(
    alias: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)
):
    """Buscar extra por alias"""
    extra = db.query(Extra).filter(
        Extra.alias == alias,
        Extra.ativo == True
    ).first()
    
    if not extra:
        raise HTTPException(status_code=404, detail="Alias não encontrado")
    
    return extra.to_dict()

@router.get("/proprietarios/disponiveis", response_model=List[dict])
async def listar_proprietarios_disponiveis(
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)
):
    """Listar proprietários disponíveis para seleção"""
    try:
        proprietarios = db.query(Proprietario).filter(Proprietario.ativo == True).all()
        return [{"id": p.id, "nome": p.nome, "sobrenome": p.sobrenome} for p in proprietarios]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar proprietários: {str(e)}")

@router.get("/estatisticas")
async def obter_estatisticas(
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)
):
    """Obter estatísticas dos extras"""
    try:
        total_extras = db.query(func.count(Extra.id)).scalar()
        extras_ativos = db.query(func.count(Extra.id)).filter(Extra.ativo == True).scalar()
        
        return {
            "total_extras": total_extras,
            "extras_ativos": extras_ativos,
            "extras_inativos": total_extras - extras_ativos
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")
