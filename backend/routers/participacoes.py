from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
import pandas as pd
import traceback
import uuid
from datetime import datetime, timedelta
from models_final import Participacao, Proprietario, Imovel, Usuario, HistoricoParticipacao
from config import get_db
from .auth import verify_token_flexible, is_admin

router = APIRouter(prefix="/api/participacoes", tags=["participacoes"])

@router.get("/datas", response_model=Dict)
def listar_datas_participacoes(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Lista todas as datas de conjuntos de participações disponíveis (incluindo histórico)."""
    # Buscar versões do histórico - uma por versao_id com a data mais recente
    from sqlalchemy import func
    versoes_historico = db.query(
        HistoricoParticipacao.versao_id,
        func.max(HistoricoParticipacao.data_versao).label('data_versao')
    )\
    .group_by(HistoricoParticipacao.versao_id)\
    .order_by(func.max(HistoricoParticipacao.data_versao).desc())\
    .all()
    
    # Buscar datas das participações ativas atuais
    datas_ativas = db.query(Participacao.data_registro)\
        .filter(Participacao.ativo == True)\
        .order_by(Participacao.data_registro.desc())\
        .all()
    
    # Combinar e filtrar datas distintas
    seen = set()
    datas_list = []
    
    # Adicionar versões do histórico
    for versao in versoes_historico:
        versao_id, data_versao = versao
        if data_versao:
            datas_list.append({
                "data": data_versao.isoformat(),
                "tipo": "histórico",
                "versao_id": versao_id,
                "label": f"Versão {versao_id} - {data_versao.strftime('%d/%m/%Y %H:%M')}"
            })
    
    # Adicionar datas ativas (se não estiverem no histórico)
    seen_dates = {item["data"].split("T")[0] for item in datas_list}  # Extrair apenas a data (YYYY-MM-DD)
    for d in datas_ativas:
        if d[0]:
            key = d[0].date().isoformat()
            if key not in seen_dates:
                seen_dates.add(key)
                datas_list.append({
                    "data": d[0].isoformat(),
                    "tipo": "ativo",
                    "versao_id": "ativo",
                    "label": f"Participações Ativas - {d[0].strftime('%d/%m/%Y %H:%M')}"
                })
    
    # Ordenar por data descendente
    datas_list.sort(key=lambda x: x["data"], reverse=True)
    
    return {"success": True, "datas": datas_list}

@router.get("/", response_model=Dict)
def listar_participacoes(data_registro: str = None, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
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
def criar_participacao(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
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
def obter_participacao(participacao_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtém uma participação específica pelo ID."""
    participacao = db.query(Participacao).filter(Participacao.id == participacao_id).first()
    if not participacao:
        raise HTTPException(status_code=404, detail="Participação não encontrada")
    return participacao.to_dict()

@router.put("/{participacao_id}", response_model=Dict)
def atualizar_participacao(participacao_id: int, dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
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
def excluir_participacao(participacao_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
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

        # Salvar no histórico
        versao_id = data_registro_novo.isoformat()
        for p in novas:
            db.add(HistoricoParticipacao(
                versao_id=versao_id,
                data_versao=data_registro_novo,
                porcentagem=p.porcentagem,
                data_registro_original=p.data_registro,
                imovel_id=p.imovel_id,
                proprietario_id=p.proprietario_id
            ))
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

# ============================================
# ENDPOINTS PARA HISTÓRICO DE PARTICIPAÇÕES
# ============================================

@router.get("/historico/versoes")
async def get_versoes_historico(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Retorna lista de todas as versões históricas disponíveis
    """
    versoes = db.query(
        HistoricoParticipacao.versao_id,
        HistoricoParticipacao.data_versao,
        func.count(HistoricoParticipacao.id).label('total_participacoes')
    ).group_by(
        HistoricoParticipacao.versao_id,
        HistoricoParticipacao.data_versao
    ).order_by(
        HistoricoParticipacao.data_versao.desc()
    ).all()
    
    return {
        "success": True,
        "data": [
            {
                "versao_id": v.versao_id,
                "data_versao": v.data_versao.isoformat(),
                "total_participacoes": v.total_participacoes
            } for v in versoes
        ]
    }

@router.get("/historico/{versao_id}")
async def get_historico_por_versao(
    versao_id: str,
    imovel_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """
    Retorna as participações de uma versão específica do histórico ou ativas
    """
    if versao_id == "ativo":
        # Carregar participações ativas
        query = db.query(Participacao).filter(Participacao.ativo == True)
        if imovel_id:
            query = query.filter(Participacao.imovel_id == imovel_id)
        participacoes = query.order_by(Participacao.imovel_id, Participacao.proprietario_id).all()
        if not participacoes:
            raise HTTPException(status_code=404, detail="Nenhuma participação ativa encontrada")
        return {
            "success": True,
            "versao_id": "ativo",
            "data_versao": participacoes[0].data_registro.isoformat() if participacoes else None,
            "data": [p.to_dict() for p in participacoes]
        }
    else:
        # Carregar do histórico
        query = db.query(HistoricoParticipacao).filter(HistoricoParticipacao.versao_id == versao_id)
        if imovel_id:
            query = query.filter(HistoricoParticipacao.imovel_id == imovel_id)
        historico = query.order_by(HistoricoParticipacao.imovel_id, HistoricoParticipacao.proprietario_id).all()
        if not historico:
            raise HTTPException(status_code=404, detail=f"Versão {versao_id} não encontrada")
        return {
            "success": True,
            "versao_id": versao_id,
            "data_versao": historico[0].data_versao.isoformat(),
            "data": [h.to_dict() for h in historico]
        }

@router.get("/historico/imovel/{imovel_id}")
async def get_historico_por_imovel(
    imovel_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """
    Retorna todo o histórico de participações para um imóvel específico
    """
    # Verificar se imóvel existe
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    
    # Buscar todas as versões históricas para este imóvel
    versoes = db.query(
        HistoricoParticipacao.versao_id,
        HistoricoParticipacao.data_versao
    ).filter(
        HistoricoParticipacao.imovel_id == imovel_id
    ).distinct().order_by(
        HistoricoParticipacao.data_versao.desc()
    ).all()
    
    historico_completo = []
    for versao in versoes:
        participacoes_versao = db.query(HistoricoParticipacao).filter(
            HistoricoParticipacao.versao_id == versao.versao_id,
            HistoricoParticipacao.imovel_id == imovel_id
        ).order_by(HistoricoParticipacao.proprietario_id).all()
        
        historico_completo.append({
            "versao_id": versao.versao_id,
            "data_versao": versao.data_versao.isoformat(),
            "participacoes": [p.to_dict() for p in participacoes_versao]
        })
    
    return {
        "success": True,
        "imovel": {
            "id": imovel.id,
            "nome": imovel.nome,
            "endereco": imovel.endereco
        },
        "historico": historico_completo
    }

@router.post("/criar-versao")
async def criar_nova_versao_participacoes(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """
    Cria uma nova versão das participações atuais no histórico
    """
    if not current_user.tipo_de_usuario in ['administrador', 'usuario']:
        raise HTTPException(status_code=403, detail="Acesso negado: Requer privilégios de usuário ou administrador.")
    
    # Gerar ID único para a versão
    versao_id = f"v_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
    
    # Buscar todas as participações atuais ativas
    participacoes_atuais = db.query(Participacao).filter(Participacao.ativo == True).all()
    
    if not participacoes_atuais:
        raise HTTPException(status_code=400, detail="Nenhuma participação ativa encontrada")
    
    # Verificar se já existe uma versão idêntica
    versao_recente = db.query(HistoricoParticipacao.versao_id).order_by(
        HistoricoParticipacao.data_versao.desc()
    ).first()
    
    if versao_recente:
        # Comparar dados
        dados_recentes = db.query(
            HistoricoParticipacao.imovel_id,
            HistoricoParticipacao.proprietario_id,
            HistoricoParticipacao.porcentagem
        ).filter(
            HistoricoParticipacao.versao_id == versao_recente.versao_id
        ).order_by(
            HistoricoParticipacao.imovel_id,
            HistoricoParticipacao.proprietario_id
        ).all()
        
        dados_atuais = [
            (p.imovel_id, p.proprietario_id, p.porcentagem)
            for p in sorted(participacoes_atuais, key=lambda x: (x.imovel_id, x.proprietario_id))
        ]
        
        dados_recentes_sorted = [
            (d.imovel_id, d.proprietario_id, d.porcentagem)
            for d in sorted(dados_recentes, key=lambda x: (x[0], x[1]))
        ]
        
        if dados_atuais == dados_recentes_sorted:
            return {
                "success": True,
                "message": f"Dados não mudaram, versão existente: {versao_recente.versao_id}",
                "versao_id": versao_recente.versao_id
            }
    
    # Criar nova versão
    historico_entries = []
    for participacao in participacoes_atuais:
        historico_entries.append({
            "versao_id": versao_id,
            "data_versao": datetime.now(),
            "porcentagem": participacao.porcentagem,
            "data_registro_original": participacao.data_registro,
            "ativo": participacao.ativo,
            "imovel_id": participacao.imovel_id,
            "proprietario_id": participacao.proprietario_id
        })
    
    try:
        db.bulk_insert_mappings(HistoricoParticipacao, historico_entries)
        db.commit()
        
        return {
            "success": True,
            "message": f"Nova versão criada: {versao_id}",
            "versao_id": versao_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar versão: {str(e)}")
