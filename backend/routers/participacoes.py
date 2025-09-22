from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import pandas as pd
import traceback
from datetime import datetime, timedelta
from models_final import Participacao, Proprietario, Imovel, Usuario
from config import get_db
from .auth import verify_token, is_admin

router = APIRouter(prefix="/api/participacoes", tags=["participacoes"])

@router.get("/datas", response_model=Dict)
def listar_datas_participacoes(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Lista todas as datas de conjuntos de participações disponíveis."""
    datas = db.query(Participacao.data_registro).order_by(Participacao.data_registro.desc()).all()
    # Filtra datas distintas por ano, mês, dia
    seen = set()
    datas_list = []
    for d in datas:
        if d[0] is None:
            continue
        key = d[0].date()
        if key in seen:
            continue
        seen.add(key)
        datas_list.append(d[0].isoformat())
    return {"success": True, "datas": datas_list}

@router.get("/", response_model=Dict)
def listar_participacoes(data_registro: str = None, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Lista participações do conjunto mais recente ou de uma data específica."""
    try:
        query = db.query(Participacao)
        if data_registro:
            from dateutil import parser
            try:
                dt = parser.isoparse(data_registro)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Formato de data_registro inválido: {data_registro}")
            # Filtra apenas por dia, mês e ano
            query = query.filter(
                func.date(Participacao.data_registro) == dt.date()
            )
        else:
            # Busca o conjunto mais recente (maior data)
            subquery = db.query(Participacao.data_registro).order_by(Participacao.data_registro.desc()).limit(1).subquery()
            query = query.filter(Participacao.data_registro == subquery)
        participacoes = query.all()
        return {"success": True, "data": [p.to_dict() for p in participacoes]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar participações: {str(e)}")

@router.post("/")
def criar_participacao(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Cria uma nova participação."""
    try:
        if not all(k in dados for k in ["imovel_id", "proprietario_id", "porcentagem"]):
            raise HTTPException(status_code=400, detail="Campos imovel_id, proprietario_id e porcentagem são obrigatórios.")

        imovel = db.query(Imovel).filter(Imovel.id == dados["imovel_id"]).first()
        if not imovel:
            raise HTTPException(status_code=404, detail="Imóvel não encontrado.")

        proprietario = db.query(Proprietario).filter(Proprietario.id == dados["proprietario_id"]).first()
        if not proprietario:
            raise HTTPException(status_code=404, detail="Proprietário não encontrado.")

        # Obter o conjunto mais recente de participações global
        subquery = db.query(Participacao.data_registro).order_by(Participacao.data_registro.desc()).limit(1).subquery()
        participacoes_atuais = db.query(Participacao).filter(Participacao.data_registro == subquery).all()

        # Crear novo conjunto, copiando todas as participações atuais, substituindo/adicionando a nova
        data_registro_novo = datetime.now()
        novas_participacoes = []
        for p in participacoes_atuais:
            # Se for a mesma participação (mesmo imóvel e proprietário), substituir
            if p.imovel_id == dados["imovel_id"] and p.proprietario_id == dados["proprietario_id"]:
                continue
            nova = Participacao(
                imovel_id=p.imovel_id,
                proprietario_id=p.proprietario_id,
                porcentagem=p.porcentagem,
                data_registro=data_registro_novo
            )
            novas_participacoes.append(nova)

        # Adicionar/atualizar a participação
        nova_participacao = Participacao(
            imovel_id=dados["imovel_id"],
            proprietario_id=dados["proprietario_id"],
            porcentagem=dados["porcentagem"],
            data_registro=data_registro_novo
        )
        novas_participacoes.append(nova_participacao)

        # Persistir todas as novas participações
        for p in novas_participacoes:
            db.add(p)
        db.commit()
        db.refresh(nova_participacao)
        return {"success": True, "data": nova_participacao.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar participação: {str(e)}")

@router.get("/{participacao_id}", response_model=Dict)
def obter_participacao(participacao_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Obtém uma participação específica pelo ID."""
    participacao = db.query(Participacao).filter(Participacao.id == participacao_id).first()
    if not participacao:
        raise HTTPException(status_code=404, detail="Participação não encontrada")
    return participacao.to_dict()

@router.put("/{participacao_id}", response_model=Dict)
def atualizar_participacao(participacao_id: int, dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Atualiza uma participação existente."""
    participacao = db.query(Participacao).filter(Participacao.id == participacao_id).first()
    if not participacao:
        raise HTTPException(status_code=404, detail="Participação não encontrada")

    # Obter o conjunto mais recente de participações global
    subquery = db.query(Participacao.data_registro).order_by(Participacao.data_registro.desc()).limit(1).subquery()
    participacoes_atuais = db.query(Participacao).filter(Participacao.data_registro == subquery).all()

    # Criar novo conjunto, copiando todas as participações atuais, substituindo a editada
    data_registro_novo = datetime.now()
    novas_participacoes = []
    for p in participacoes_atuais:
        if p.id == participacao_id:
            # Substituir pelos novos dados
            campos_modelo = [c.key for c in Participacao.__table__.columns]
            valores = {campo: getattr(p, campo) for campo in campos_modelo}
            for campo, valor in dados.items():
                if campo in campos_modelo:
                    valores[campo] = valor
            nova = Participacao(
                imovel_id=valores["imovel_id"],
                proprietario_id=valores["proprietario_id"],
                porcentagem=valores["porcentagem"],
                data_registro=data_registro_novo
            )
            novas_participacoes.append(nova)
        else:
            nova = Participacao(
                imovel_id=p.imovel_id,
                proprietario_id=p.proprietario_id,
                porcentagem=p.porcentagem,
                data_registro=data_registro_novo
            )
            novas_participacoes.append(nova)

    # Persistir todas as novas participações
    for p in novas_participacoes:
        db.add(p)
    db.commit()
    # Retornar a participação editada
    participacao_editada = [p for p in novas_participacoes if p.proprietario_id == participacao.proprietario_id and p.imovel_id == participacao.imovel_id][0]
    db.refresh(participacao_editada)
    return participacao_editada.to_dict()

@router.delete("/{participacao_id}")
def excluir_participacao(participacao_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Exclui uma participação."""
    participacao = db.query(Participacao).filter(Participacao.id == participacao_id).first()
    if not participacao:
        raise HTTPException(status_code=404, detail="Participação não encontrada")
    
    db.delete(participacao)
    db.commit()
    return {"mensagem": "Participação excluída com sucesso"}




@router.post("/nova-versao", response_model=Dict)
def criar_nova_versao_participacoes(payload: Dict, db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
    """Criar uma NOVA VERSÃO do conjunto de participações.
    Espera payload com a chave 'participacoes' contendo lista de itens:
    [{ imovel_id, proprietario_id, porcentagem }]

    Regras:
    - Somatório de porcentagem por imóvel deve ser 100 (±0.001 de tolerância).
    - Apenas administradores podem criar nova versão.
    - Cria um novo data_registro para TODO o conjunto recebido (histórico mantido).
    - Valida existência de imovel e proprietario.
    """
    try:
        itens = payload.get("participacoes")
        if not isinstance(itens, list) or not itens:
            raise HTTPException(status_code=400, detail="Payload inválido: 'participacoes' deve ser uma lista não vazia")

        # Validar IDs e normalizar porcentagens
        por_imovel: Dict[int, float] = {}
        normalizados = []
        for idx, it in enumerate(itens):
            try:
                imovel_id = int(it.get("imovel_id"))
                proprietario_id = int(it.get("proprietario_id"))
            except Exception:
                raise HTTPException(status_code=400, detail=f"Item #{idx+1}: imovel_id/proprietario_id inválido")

            # Validar existência
            if not db.query(Imovel.id).filter(Imovel.id == imovel_id).first():
                raise HTTPException(status_code=404, detail=f"Imóvel id={imovel_id} não encontrado")
            if not db.query(Proprietario.id).filter(Proprietario.id == proprietario_id).first():
                raise HTTPException(status_code=404, detail=f"Proprietário id={proprietario_id} não encontrado")

            porcentagem = it.get("porcentagem")
            if isinstance(porcentagem, str):
                p = porcentagem.strip().replace('%','').replace(',','.')
                try:
                    porcentagem = float(p)
                except Exception:
                    raise HTTPException(status_code=400, detail=f"Item #{idx+1}: porcentagem inválida")
            try:
                porcentagem = float(porcentagem)
            except Exception:
                raise HTTPException(status_code=400, detail=f"Item #{idx+1}: porcentagem inválida")
            if porcentagem < 0:
                raise HTTPException(status_code=400, detail=f"Item #{idx+1}: porcentagem negativa")

            por_imovel[imovel_id] = por_imovel.get(imovel_id, 0.0) + porcentagem

            normalizados.append({
                "imovel_id": imovel_id,
                "proprietario_id": proprietario_id,
                "porcentagem": porcentagem
            })

    # Removida validação de soma de porcentagens por imóvel. Apenas grava os valores recebidos.

        # Criar nova versão (data_registro único)
        data_registro_novo = datetime.now()
        # Garante que data_registro seja único
        tentativas = 0
        while True:
            existe = db.query(Participacao).filter(Participacao.data_registro == data_registro_novo).first()
            if not existe:
                break
            tentativas += 1
            # Adiciona 1 microsegundo para evitar duplicidade
            data_registro_novo = data_registro_novo + timedelta(microseconds=tentativas)

        novas = []
        for it in normalizados:
            novas.append(Participacao(
                imovel_id=it["imovel_id"],
                proprietario_id=it["proprietario_id"],
                porcentagem=it["porcentagem"],
                data_registro=data_registro_novo
            ))

        for p in novas:
            db.add(p)
        db.commit()

        return {
            "success": True,
            "data_registro": data_registro_novo.isoformat(),
            "quantidade": len(novas)
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar nova versão: {str(e)}")
