"""
Router para endpoints de relatórios e reportes
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from pydantic import BaseModel

from config import get_db
from models_final import *
from routers.auth import verify_token

router = APIRouter(prefix="/api/reportes", tags=["reportes"])

# Modelos Pydantic para responses
class ResumenMensualItem(BaseModel):
    nome_proprietario: str
    mes: int
    ano: int
    valor_total: float
    quantidade_imoveis: Optional[int] = 1

    class Config:
        from_attributes = True

class ResumenProprietarioItem(BaseModel):
    nome_proprietario: str
    total_anual: float
    quantidade_registros: int
    media_mensal: float

    class Config:
        from_attributes = True

@router.get("/resumen-mensual", response_model=List[ResumenMensualItem])
async def get_resumen_mensual(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    proprietario_id: Optional[int] = None,
    nome_proprietario: Optional[str] = None,
    db: Session = Depends(get_db)
    # current_user=Depends(verify_token)  # Temporalmente deshabilitado para pruebas
):
    """
    Obtém resumo mensal de aluguéis agrupado por proprietário
    """
    try:
        # Query base usando JOIN para obter dados dos proprietários e aluguéis
        query = db.query(
            func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, '')).label('nome_proprietario'),
            AluguelSimples.mes,
            AluguelSimples.ano,
            func.sum(AluguelSimples.valor_liquido_proprietario).label('valor_total'),
            func.count(func.distinct(AluguelSimples.imovel_id)).label('quantidade_imoveis')
        ).select_from(AluguelSimples)\
        .join(Proprietario, AluguelSimples.proprietario_id == Proprietario.id)\
        .group_by(
            Proprietario.nome,
            Proprietario.sobrenome,
            AluguelSimples.mes,
            AluguelSimples.ano
        )

        # Aplicar filtros
        if mes is not None:
            query = query.filter(AluguelSimples.mes == mes)
        
        if ano is not None:
            query = query.filter(AluguelSimples.ano == ano)
            
        if proprietario_id is not None:
            query = query.filter(AluguelSimples.proprietario_id == proprietario_id)
            
        if nome_proprietario is not None:
            query = query.filter(
                func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, '')).ilike(f"%{nome_proprietario}%")
            )

        # Ordenar por ano, mês e nome
        query = query.order_by(
            AluguelSimples.ano.desc(),
            AluguelSimples.mes.desc(),
            Proprietario.nome
        )

        result = query.all()
        
        # Converter para lista de dicionários
        resumo_list = []
        for row in result:
            resumo_list.append({
                "nome_proprietario": row.nome_proprietario,
                "mes": row.mes,
                "ano": row.ano,
                "valor_total": float(row.valor_total) if row.valor_total else 0.0,
                "quantidade_imoveis": row.quantidade_imoveis if row.quantidade_imoveis else 1
            })

        return resumo_list

    except Exception as e:
        print(f"Erro ao obter resumo mensal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/resumen-propietario", response_model=List[ResumenProprietarioItem])
async def get_resumen_propietario(
    nome_proprietario: Optional[str] = None,
    ano: Optional[int] = None,
    db: Session = Depends(get_db)
    # current_user=Depends(verify_token)  # Temporalmente deshabilitado para pruebas
):
    """
    Obtém resumo anual por proprietário
    """
    try:
        # Query para resumo por proprietário
        query = db.query(
            func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, '')).label('nome_proprietario'),
            func.sum(AluguelSimples.valor_liquido_proprietario).label('total_anual'),
            func.count(AluguelSimples.id).label('quantidade_registros'),
            func.avg(AluguelSimples.valor_liquido_proprietario).label('media_mensal')
        ).select_from(AluguelSimples)\
        .join(Proprietario, AluguelSimples.proprietario_id == Proprietario.id)\
        .group_by(Proprietario.nome, Proprietario.sobrenome)

        # Aplicar filtros
        if nome_proprietario is not None:
            query = query.filter(
                func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, '')).ilike(f"%{nome_proprietario}%")
            )
            
        if ano is not None:
            query = query.filter(AluguelSimples.ano == ano)

        # Ordenar por total anual descendente
        query = query.order_by(func.sum(AluguelSimples.valor_liquido_proprietario).desc())

        result = query.all()
        
        # Converter para lista de dicionários
        resumo_list = []
        for row in result:
            resumo_list.append({
                "nome_proprietario": row.nome_proprietario,
                "total_anual": float(row.total_anual) if row.total_anual else 0.0,
                "quantidade_registros": row.quantidade_registros if row.quantidade_registros else 0,
                "media_mensal": float(row.media_mensal) if row.media_mensal else 0.0
            })

        return resumo_list

    except Exception as e:
        print(f"Erro ao obter resumo por proprietário: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/totais-gerais")
async def get_totais_gerais(
    db: Session = Depends(get_db)
    # current_user=Depends(verify_token)  # Temporalmente deshabilitado para pruebas
):
    """
    Obtém totais gerais do sistema
    """
    try:
        # Total de proprietários
        total_proprietarios = db.query(Proprietario).count()
        
        # Total de imóveis
        total_imoveis = db.query(Imovel).count()
        
        # Total de aluguéis (valor)
        total_alugueis_valor = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)).scalar() or 0
        
        # Total de registros de aluguéis
        total_registros = db.query(AluguelSimples).count()
        
        # Média mensal
        media_mensal = float(total_alugueis_valor / total_registros) if total_registros > 0 else 0
        
        return {
            "total_proprietarios": total_proprietarios,
            "total_imoveis": total_imoveis,
            "total_alugueis_valor": float(total_alugueis_valor),
            "total_registros": total_registros,
            "media_mensal": media_mensal
        }

    except Exception as e:
        print(f"Erro ao obter totais gerais: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/anos-disponiveis")
async def get_anos_disponiveis(
    db: Session = Depends(get_db)
    # current_user=Depends(verify_token)  # Temporalmente deshabilitado para pruebas
):
    """
    Obtém lista de anos disponíveis nos dados
    """
    try:
        anos = db.query(func.distinct(AluguelSimples.ano))\
                .order_by(AluguelSimples.ano.desc()).all()
        
        return [ano[0] for ano in anos if ano[0] is not None]

    except Exception as e:
        print(f"Erro ao obter anos disponíveis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
