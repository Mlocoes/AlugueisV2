"""
Router para endpoints de relatórios e reportes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from config import get_db
from models_final import *

router = APIRouter(prefix="/api/reportes", tags=["reportes"])

# Modelos Pydantic para responses
class ResumenMensualItem(BaseModel):
    nome_proprietario: str
    proprietario_id: int
    mes: int
    ano: int
    valor_total: float
    soma_alugueis: float
    soma_taxas: float
    quantidade_imoveis: Optional[int] = 1

    class Config:
        from_attributes = True

@router.get("/")
async def get_reportes_info():
    """Información sobre endpoints de reportes disponibles"""
    return {
        "message": "Router de Reportes - Endpoints disponibles",
        "endpoints": [
            "GET /api/reportes/anos-disponiveis - Lista años disponibles",
            "GET /api/reportes/resumen-mensual - Resumen mensual por propietario"
        ]
    }

@router.get("/anos-disponiveis")
async def get_anos_disponiveis(
    db: Session = Depends(get_db)
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

@router.get("/resumen-mensual", response_model=List[ResumenMensualItem])
async def get_resumen_mensual(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    proprietario_id: Optional[int] = None,
    nome_proprietario: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Obtém resumo mensal de aluguéis agrupado por proprietário
    """
    try:
        # Query base usando JOIN para obter dados dos proprietários e aluguéis
        query = db.query(
            func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, '')).label('nome_proprietario'),
            AluguelSimples.proprietario_id,
            AluguelSimples.mes,
            AluguelSimples.ano,
            func.sum(AluguelSimples.valor_liquido_proprietario).label('valor_total'),
            func.sum(AluguelSimples.valor_liquido_proprietario + AluguelSimples.taxa_administracao_proprietario).label('soma_alugueis'),
            func.sum(AluguelSimples.taxa_administracao_proprietario).label('soma_taxas'),
            func.count(func.distinct(AluguelSimples.imovel_id)).label('quantidade_imoveis')
        ).select_from(AluguelSimples)\
        .join(Proprietario, AluguelSimples.proprietario_id == Proprietario.id)\
        .group_by(
            func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, '')),
            AluguelSimples.proprietario_id,
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

        # Ordernar por ano, mês e nome
        query = query.order_by(
            AluguelSimples.ano.desc(),
            AluguelSimples.mes.desc(),
            func.concat(Proprietario.nome, ' ', func.coalesce(Proprietario.sobrenome, ''))
        )

        result = query.all()
        
        # Converter para lista de dicionários
        resumo_list = []
        for row in result:
            resumo_list.append({
                "nome_proprietario": row.nome_proprietario,
                "proprietario_id": row.proprietario_id,
                "mes": row.mes,
                "ano": row.ano,
                "valor_total": float(row.valor_total) if row.valor_total else 0.0,
                "soma_alugueis": float(row.soma_alugueis) if row.soma_alugueis else 0.0,
                "soma_taxas": float(row.soma_taxas) if row.soma_taxas else 0.0,
                "quantidade_imoveis": row.quantidade_imoveis if row.quantidade_imoveis else 1
            })

        return resumo_list

    except Exception as e:
        print(f"Erro ao obter resumo mensal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
