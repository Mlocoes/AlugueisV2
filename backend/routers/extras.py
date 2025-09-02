"""
Router pafrom routers.auth import verify_token, is_admin

router = A@router.post("/", response_model=ExtraResponse)
async def criar_extra(
@router.put("/{extra_id}", response_model=ExtraResponse)
async def atualizar_extra(
    extra_id: int,
    extra_update: ExtraUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)tra: ExtraCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)ter(
    prefix="/api/extras",
    tags=["extras"],
    responses={404: {"description": "Extra não encontrado"}},
)

@router.get("/", response_model=List[ExtraResponse])
async def listar_extras(
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de registros"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    current_user: dict = Depends(is_admin) Sistema de Alias
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
        
        # Validar proprietário origem se fornecido
        if extra_data.origem_id_proprietario:
            proprietario_origem = db.query(Proprietario).filter(
                Proprietario.id == extra_data.origem_id_proprietario
            ).first()
            if not proprietario_origem:
                raise HTTPException(status_code=400, detail="Proprietário origem não encontrado")
        
        # Validar proprietário destino se fornecido
        if extra_data.destino_id_proprietario:
            proprietario_destino = db.query(Proprietario).filter(
                Proprietario.id == extra_data.destino_id_proprietario
            ).first()
            if not proprietario_destino:
                raise HTTPException(status_code=400, detail="Proprietário destino não encontrado")
        
        # Criar novo extra
        novo_extra = Extra(
            alias=extra_data.alias,
            id_proprietarios=extra_data.id_proprietarios,
            valor_transferencia=extra_data.valor_transferencia or 0.0,
            nome_transferencia=extra_data.nome_transferencia,
            origem_id_proprietario=extra_data.origem_id_proprietario,
            destino_id_proprietario=extra_data.destino_id_proprietario,
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
        
        if extra_data.valor_transferencia is not None:
            extra.valor_transferencia = extra_data.valor_transferencia
            
        if extra_data.nome_transferencia is not None:
            extra.nome_transferencia = extra_data.nome_transferencia
        
        if extra_data.origem_id_proprietario is not None:
            if extra_data.origem_id_proprietario:
                proprietario_origem = db.query(Proprietario).filter(
                    Proprietario.id == extra_data.origem_id_proprietario
                ).first()
                if not proprietario_origem:
                    raise HTTPException(status_code=400, detail="Proprietário origem não encontrado")
            extra.origem_id_proprietario = extra_data.origem_id_proprietario
        
        if extra_data.destino_id_proprietario is not None:
            if extra_data.destino_id_proprietario:
                proprietario_destino = db.query(Proprietario).filter(
                    Proprietario.id == extra_data.destino_id_proprietario
                ).first()
                if not proprietario_destino:
                    raise HTTPException(status_code=400, detail="Proprietário destino não encontrado")
            extra.destino_id_proprietario = extra_data.destino_id_proprietario
        
        if extra_data.ativo is not None:
            extra.ativo = extra_data.ativo
        
        # Actualizar fechas si se proporcionan
        if hasattr(extra_data, 'data_criacao') and extra_data.data_criacao is not None:
            # Si se proporciona data_criacao como string, convertir a datetime
            if isinstance(extra_data.data_criacao, str):
                from datetime import datetime
                extra.data_criacao = datetime.fromisoformat(extra_data.data_criacao.replace('Z', '+00:00'))
            else:
                extra.data_criacao = extra_data.data_criacao
        
        if hasattr(extra_data, 'data_fim') and extra_data.data_fim is not None:
            # Si se proporciona data_fim como string, convertir a datetime
            if isinstance(extra_data.data_fim, str):
                from datetime import datetime
                extra.data_fim = datetime.fromisoformat(extra_data.data_fim.replace('Z', '+00:00'))
            else:
                extra.data_fim = extra_data.data_fim
        else:
            # Atualizar timestamp de data_fim apenas se não foi especificado
            extra.data_fim = func.current_timestamp()
        
        db.commit()
        db.refresh(extra)
        
        return extra.to_dict()
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar extra: {str(e)}")

@router.delete("/{extra_id}")
async def excluir_extra(
    extra_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(is_admin)
):
    """Excluir um extra (soft delete - marca como inativo)"""
    try:
        extra = db.query(Extra).filter(Extra.id == extra_id).first()
        if not extra:
            raise HTTPException(status_code=404, detail="Extra não encontrado")
        
        # Soft delete - marcar como inativo
        extra.ativo = False
        extra.data_atualizacao = func.current_timestamp()
        
        db.commit()
        
        return {"message": f"Extra '{extra.alias}' foi excluído com sucesso"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao excluir extra: {str(e)}")

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
        
        valor_total_transferencias = db.query(
            func.coalesce(func.sum(Extra.valor_transferencia), 0)
        ).filter(Extra.ativo == True).scalar()
        
        return {
            "total_extras": total_extras,
            "extras_ativos": extras_ativos,
            "extras_inativos": total_extras - extras_ativos,
            "valor_total_transferencias": float(valor_total_transferencias)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")
