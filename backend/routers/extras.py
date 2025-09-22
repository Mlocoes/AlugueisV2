"""
Router para Alias - Sistema de Grupos de Proprietários
Acesso exclusivo para administradores
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import json
from datetime import datetime

from config import get_db
from models_final import Alias, AliasCreate, AliasUpdate, AliasResponse, Proprietario, Usuario
from routers.auth import verify_token, is_admin

router = APIRouter(
    prefix="/api/extras",
    tags=["extras"],
    responses={404: {"description": "Alias não encontrado"}},
)

def verify_admin_access(current_user = Depends(is_admin)):
    """Verificar se o usuário é administrador"""
    return current_user

@router.get("/reportes", response_model=List[AliasResponse])
async def listar_aliases_para_relatorios(db: Session = Depends(get_db)):
    """
    Endpoint público para consultar aliases em relatórios
    Não requer autenticação para facilitar integração com relatórios
    """
    try:
        aliases = db.query(Alias).all()
        return [alias.to_dict() for alias in aliases]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar aliases para relatórios: {str(e)}"
        )

# Rutas específicas (deben ir ANTES de las rutas dinámicas)
@router.get("/proprietarios/disponiveis")
async def listar_proprietarios_disponiveis(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin_access)
):
    """Listar proprietários disponíveis para seleção em alias"""
    try:
        proprietarios = db.query(Proprietario).all()
        data = [{"id": p.id, "nome": p.nome, "sobrenome": p.sobrenome} for p in proprietarios]
        return {"success": True, "data": data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar proprietários disponíveis: {str(e)}")

@router.get("/estatisticas")
async def obter_estatisticas_alias(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin_access)
):
    """Obter estatísticas dos alias"""
    try:
        total_alias = db.query(func.count(Alias.id)).scalar()
        
        return {
            "total_alias": total_alias,
            "endpoint": "alias",
            "status": "ok"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")

@router.get("/{alias_id}/proprietarios/relatorios")
async def obter_proprietarios_alias_para_relatorios(
    alias_id: int,
    db: Session = Depends(get_db)
):
    """
    Endpoint público para obter proprietários de um alias em relatórios
    Não requer autenticação para facilitar integração com relatórios
    """
    try:
        alias = db.query(Alias).filter(Alias.id == alias_id).first()
        if not alias:
            raise HTTPException(status_code=404, detail="Alias não encontrado")
        
        if not alias.id_proprietarios:
            return []
        
        proprietario_ids = json.loads(alias.id_proprietarios)
        proprietarios = db.query(Proprietario).filter(Proprietario.id.in_(proprietario_ids)).all()
        
        return [{"id": p.id, "nome": p.nome, "sobrenome": p.sobrenome} for p in proprietarios]
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Formato inválido de proprietários no alias")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao obter proprietários do alias para relatórios: {str(e)}"
        )

# Rutas generales
@router.get("/", response_model=List[AliasResponse])
async def listar_extras(
    skip: int = Query(0, ge=0, description="Número de registros para pular"),
    limit: int = Query(100, ge=1, le=1000, description="Limite de registros"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin_access)
):
    """Listar todos os alias (apenas administradores)"""
    try:
        query = db.query(Alias)
        alias_list = query.offset(skip).limit(limit).all()
        return [alias_obj.to_dict() for alias_obj in alias_list]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar alias: {str(e)}")

@router.get("/{alias_id}", response_model=AliasResponse)
async def obter_extra(
    alias_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """Obter um alias específico por ID"""
    alias_obj = db.query(Alias).filter(Alias.id == alias_id).first()
    if not alias_obj:
        raise HTTPException(status_code=404, detail="Alias não encontrado")
    
    return alias_obj.to_dict()

async def validar_e_obter_proprietarios(db: Session, id_proprietarios_json: Optional[str]):
    """
    Valida o JSON de IDs de proprietários e verifica se todos existem no banco.
    Retorna a lista de IDs validados. Evita ataques N+1.
    """
    if not id_proprietarios_json:
        return None
    try:
        proprietario_ids = json.loads(id_proprietarios_json)
        if not isinstance(proprietario_ids, list):
            raise HTTPException(status_code=400, detail="id_proprietarios deve ser um JSON array de IDs.")

        if not proprietario_ids:
            return []

        # Validação em lote para evitar N+1 queries
        proprietarios_encontrados = db.query(Proprietario.id).filter(Proprietario.id.in_(proprietario_ids)).all()
        ids_encontrados = {p_id for p_id, in proprietarios_encontrados}
        
        ids_nao_encontrados = set(proprietario_ids) - ids_encontrados
        if ids_nao_encontrados:
            raise HTTPException(status_code=404, detail=f"Proprietários com IDs {list(ids_nao_encontrados)} não encontrados.")
            
        return proprietario_ids
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Formato JSON inválido para id_proprietarios.")

@router.post("/", response_model=AliasResponse)
async def criar_extra(
    alias_data: AliasCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin_access)
):
    """Criar um novo alias"""
    if db.query(Alias).filter(Alias.alias == alias_data.alias).first():
        raise HTTPException(status_code=400, detail="Já existe um alias com este nome")

    await validar_e_obter_proprietarios(db, alias_data.id_proprietarios)

    try:
        new_alias = Alias(**alias_data.dict())
        db.add(new_alias)
        db.commit()
        db.refresh(new_alias)
        return new_alias.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar alias: {str(e)}")

@router.put("/{alias_id}", response_model=AliasResponse)
async def atualizar_extra(
    alias_id: int,
    alias_data: AliasUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin_access)
):
    """Atualizar um alias existente"""
    alias_obj = db.query(Alias).filter(Alias.id == alias_id).first()
    if not alias_obj:
        raise HTTPException(status_code=404, detail="Alias não encontrado")

    if alias_data.alias and alias_data.alias != alias_obj.alias:
        if db.query(Alias).filter(Alias.alias == alias_data.alias).first():
            raise HTTPException(status_code=400, detail="Já existe um alias com este nome")

    if alias_data.id_proprietarios is not None:
        await validar_e_obter_proprietarios(db, alias_data.id_proprietarios)

    try:
        update_data = alias_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(alias_obj, key, value)
        
        db.commit()
        db.refresh(alias_obj)
        return alias_obj.to_dict()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar alias: {str(e)}")

@router.delete("/{alias_id}")
async def deletar_extra(
    alias_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_admin_access)
):
    """Deletar um alias"""
    try:
        alias_obj = db.query(Alias).filter(Alias.id == alias_id).first()
        if not alias_obj:
            raise HTTPException(status_code=404, detail="Alias não encontrado")
        
        db.delete(alias_obj)
        db.commit()
        
        return {"message": f"Alias '{alias_obj.alias}' deletado com sucesso"}
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar alias: {str(e)}")

@router.get("/{alias_id}/proprietarios")
async def obter_proprietarios_do_alias(
    alias_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(is_admin)
):
    """Obter a lista detalhada de proprietários de um alias"""
    alias_obj = db.query(Alias).filter(Alias.id == alias_id).first()
    if not alias_obj:
        raise HTTPException(status_code=404, detail="Alias não encontrado")

    proprietarios_list = []
    if alias_obj.id_proprietarios:
        try:
            proprietario_ids = json.loads(alias_obj.id_proprietarios)
            if proprietario_ids:
                proprietarios = db.query(Proprietario).filter(Proprietario.id.in_(proprietario_ids)).all()
                proprietarios_list = [
                    {"id": p.id, "nome": p.nome, "sobrenome": p.sobrenome} for p in proprietarios
                ]
        except (json.JSONDecodeError, TypeError):
            # Se o JSON for inválido, simplesmente retorna a lista vazia mas loga o erro.
            print(f"[ERROR] JSON inválido para alias ID: {alias_id}")

    return {
        "alias": alias_obj.alias,
        "proprietarios": proprietarios_list
    }
