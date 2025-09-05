"""
Router para gerenciar transferências do sistema
"""
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from config import get_db
from models_final import Transferencia, TransferenciaCreate, TransferenciaUpdate, TransferenciaResponse, Alias
from routers.auth import is_admin, is_user_or_admin

router = APIRouter(
    prefix="/api/transferencias",
    tags=["transferencias"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[TransferenciaResponse])
def listar_transferencias(db: Session = Depends(get_db), current_user = Depends(is_admin)):
    """
    Listar todas as transferências ativas (apenas administradores)
    """
    try:
        transferencias = db.query(Transferencia).order_by(desc(Transferencia.id)).all()
        return [transferencia.to_dict() for transferencia in transferencias]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar transferências: {str(e)}"
        )

@router.get("/consulta", response_model=List[TransferenciaResponse])
def consultar_transferencias(db: Session = Depends(get_db), current_user = Depends(is_user_or_admin)):
    """
    Consultar transferências para relatórios (usuários e administradores)
    """
    try:
        transferencias = db.query(Transferencia).order_by(desc(Transferencia.id)).all()
        return [transferencia.to_dict() for transferencia in transferencias]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao consultar transferências: {str(e)}"
        )

@router.get("/relatorios", response_model=List[TransferenciaResponse])
def transferencias_para_relatorios(db: Session = Depends(get_db)):
    """
    Endpoint público para consultar transferências em relatórios
    Não requer autenticação para facilitar integração com relatórios
    """
    try:
        transferencias = db.query(Transferencia).order_by(desc(Transferencia.id)).all()
        return [transferencia.to_dict() for transferencia in transferencias]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao consultar transferências para relatórios: {str(e)}"
        )

@router.get("/{transferencia_id}", response_model=TransferenciaResponse)
def obter_transferencia(transferencia_id: int, db: Session = Depends(get_db), current_user = Depends(is_admin)):
    """
    Obter uma transferência por ID (apenas administradores)
    """
    transferencia = db.query(Transferencia).filter(
        Transferencia.id == transferencia_id
    ).first()
    
    if not transferencia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transferência não encontrada"
        )
    
    return transferencia.to_dict()

@router.post("/", response_model=TransferenciaResponse)
def criar_transferencia(transferencia_data: TransferenciaCreate, db: Session = Depends(get_db), current_user = Depends(is_admin)):
    """
    Criar nova transferência (apenas administradores)
    """
    try:
        # Verificar se o alias existe
        alias = db.query(Alias).filter(Alias.id == transferencia_data.alias_id).first()
        if not alias:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alias não encontrado"
            )
        
        # Converter datas se fornecidas como string
        data_criacao = None
        data_fim = None
        
        if transferencia_data.data_criacao:
            try:
                data_criacao = datetime.fromisoformat(transferencia_data.data_criacao.replace('Z', '+00:00'))
            except ValueError:
                try:
                    data_criacao = datetime.strptime(transferencia_data.data_criacao, '%Y-%m-%d')
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Formato de data_criacao inválido"
                    )
        
        if transferencia_data.data_fim:
            try:
                data_fim = datetime.fromisoformat(transferencia_data.data_fim.replace('Z', '+00:00'))
            except ValueError:
                try:
                    data_fim = datetime.strptime(transferencia_data.data_fim, '%Y-%m-%d')
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Formato de data_fim inválido"
                    )
        
        # Criar nova transferência
        nova_transferencia = Transferencia(
            alias_id=transferencia_data.alias_id,
            nome_transferencia=transferencia_data.nome_transferencia,
            valor_total=transferencia_data.valor_total or 0.0,
            id_proprietarios=transferencia_data.id_proprietarios,
            origem_id_proprietario=transferencia_data.origem_id_proprietario,
            destino_id_proprietario=transferencia_data.destino_id_proprietario,
            data_criacao=data_criacao or datetime.now(),
            data_fim=data_fim
        )
        
        db.add(nova_transferencia)
        db.commit()
        db.refresh(nova_transferencia)
        
        return nova_transferencia.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao criar transferência: {str(e)}"
        )

@router.put("/{transferencia_id}", response_model=TransferenciaResponse)
def atualizar_transferencia(transferencia_id: int, transferencia_data: TransferenciaUpdate, db: Session = Depends(get_db), current_user = Depends(is_admin)):
    """
    Atualizar transferência (apenas administradores)
    """
    try:
        transferencia = db.query(Transferencia).filter(
            Transferencia.id == transferencia_id
        ).first()
        
        if not transferencia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transferência não encontrada"
            )
        
        # Verificar se o novo alias existe (se fornecido)
        if transferencia_data.alias_id:
            alias = db.query(Alias).filter(Alias.id == transferencia_data.alias_id).first()
            if not alias:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Alias não encontrado"
                )
        
        # Atualizar campos se fornecidos
        if transferencia_data.alias_id is not None:
            transferencia.alias_id = transferencia_data.alias_id
        if transferencia_data.nome_transferencia is not None:
            transferencia.nome_transferencia = transferencia_data.nome_transferencia
        if transferencia_data.valor_total is not None:
            transferencia.valor_total = transferencia_data.valor_total
        if transferencia_data.id_proprietarios is not None:
            transferencia.id_proprietarios = transferencia_data.id_proprietarios
        if transferencia_data.origem_id_proprietario is not None:
            transferencia.origem_id_proprietario = transferencia_data.origem_id_proprietario
        if transferencia_data.destino_id_proprietario is not None:
            transferencia.destino_id_proprietario = transferencia_data.destino_id_proprietario
        
        # Converter datas se fornecidas como string
        if transferencia_data.data_criacao:
            try:
                transferencia.data_criacao = datetime.fromisoformat(transferencia_data.data_criacao.replace('Z', '+00:00'))
            except ValueError:
                try:
                    transferencia.data_criacao = datetime.strptime(transferencia_data.data_criacao, '%Y-%m-%d')
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Formato de data_criacao inválido"
                    )
        
        if transferencia_data.data_fim:
            try:
                transferencia.data_fim = datetime.fromisoformat(transferencia_data.data_fim.replace('Z', '+00:00'))
            except ValueError:
                try:
                    transferencia.data_fim = datetime.strptime(transferencia_data.data_fim, '%Y-%m-%d')
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Formato de data_fim inválido"
                    )
        
        db.commit()
        db.refresh(transferencia)
        
        return transferencia.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao atualizar transferência: {str(e)}"
        )

@router.delete("/{transferencia_id}")
def excluir_transferencia(transferencia_id: int, db: Session = Depends(get_db), current_user = Depends(is_admin)):
    """
    Excluir transferência (apenas administradores)
    """
    try:
        transferencia = db.query(Transferencia).filter(
            Transferencia.id == transferencia_id
        ).first()
        
        if not transferencia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transferência não encontrada"
            )
        
        # Delete real
        db.delete(transferencia)
        db.commit()
        
        return {"message": "Transferência excluída com sucesso"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao excluir transferência: {str(e)}"
        )

@router.get("/alias/{alias_id}", response_model=List[TransferenciaResponse])
def listar_transferencias_por_alias(alias_id: int, db: Session = Depends(get_db), current_user = Depends(is_admin)):
    """
    Listar todas as transferências de um alias específico (apenas administradores)
    """
    try:
        # Verificar se o alias existe
        alias = db.query(Alias).filter(Alias.id == alias_id).first()
        if not alias:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alias não encontrado"
            )
        
        transferencias = db.query(Transferencia).filter(
            Transferencia.alias_id == alias_id
        ).order_by(desc(Transferencia.id)).all()
        
        return [transferencia.to_dict() for transferencia in transferencias]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar transferências do alias: {str(e)}"
        )
