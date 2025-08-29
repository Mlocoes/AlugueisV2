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

router = APIRouter(prefix="/participacoes", tags=["participacoes"])

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

        # Criar novo conjunto, copiando todas as participações atuais, substituindo/adicionando a nova
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
                observacoes=p.observacoes,
                ativo=p.ativo,
                data_registro=data_registro_novo
            )
            novas_participacoes.append(nova)

        # Adicionar/atualizar a participação
        nova_participacao = Participacao(
            imovel_id=dados["imovel_id"],
            proprietario_id=dados["proprietario_id"],
            porcentagem=dados["porcentagem"],
            observacoes=dados.get("observacoes"),
            ativo=True,
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
                observacoes=valores.get("observacoes"),
                ativo=valores.get("ativo", True),
                data_registro=data_registro_novo
            )
            novas_participacoes.append(nova)
        else:
            nova = Participacao(
                imovel_id=p.imovel_id,
                proprietario_id=p.proprietario_id,
                porcentagem=p.porcentagem,
                observacoes=p.observacoes,
                ativo=p.ativo,
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

@router.post("/importar/", response_model=Dict)
async def importar_participacoes(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Importa participações de um arquivo Excel."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="O arquivo deve ser do tipo Excel (.xlsx ou .xls)")

    try:
        conteudo = await file.read()
        df = pd.read_excel(conteudo)

        # Estrutura: 1ª coluna = nome do imóvel, 2ª e 3ª ignoradas, 4ª em diante = nome do proprietário (célula = percentual)
        colunas = df.columns.tolist()
        nomes_proprietarios = colunas[3:]

        processados = 0
        criados = 0
        erros = []
        
        # Gerar um timestamp único para este conjunto global
        # Se já existir uma data igual, adicionar alguns microssegundos
        data_registro_lote = datetime.now()
        
        # Verificar se já existe participação com esta data_registro
        existe_data = db.query(Participacao).filter(
            Participacao.data_registro >= data_registro_lote.replace(microsecond=0),
            Participacao.data_registro < data_registro_lote.replace(microsecond=0) + timedelta(seconds=1)
        ).first()
        
        if existe_data:
            # Se existe, criar nova data adicionando 1 segundo
            data_registro_lote = data_registro_lote + timedelta(seconds=1)
            print(f"📅 Ajustando data_registro para evitar duplicatas: {data_registro_lote}")

        print(f"📅 Usando data_registro_lote: {data_registro_lote}")

        # Criar lista apenas com as participações do novo lote
        novas_participacoes = []
        for index, row in df.iterrows():
            nome_imovel = row[colunas[0]]
            imovel = db.query(Imovel).filter(Imovel.nome == nome_imovel).first()
            if not imovel:
                erros.append(f"Linha {index + 2}: Imóvel '{nome_imovel}' não encontrado.")
                processados += 1
                continue

            for nome_prop in nomes_proprietarios:
                percentual = row[nome_prop]
                if pd.isna(percentual) or percentual == 0:
                    continue
                if isinstance(percentual, str):
                    percentual = percentual.strip().replace(',', '.')
                    if percentual.endswith('%'):
                        percentual = percentual.replace('%', '')
                    try:
                        percentual = float(percentual)
                    except Exception:
                        erros.append(f"Linha {index + 2}: Valor de participação inválido para '{nome_prop}': '{row[nome_prop]}'")
                        continue
                if 0 < percentual < 1:
                    percentual = percentual * 100
                
                # Buscar proprietário por nome o por nome completo
                proprietario = db.query(Proprietario).filter(Proprietario.nome == nome_prop).first()
                if not proprietario:
                    # Buscar por nome completo si no se encontró por nome
                    proprietario = db.query(Proprietario).filter(
                        func.concat(Proprietario.nome, ' ', Proprietario.sobrenome) == nome_prop
                    ).first()
                
                if not proprietario:
                    erros.append(f"Linha {index + 2}: Proprietário '{nome_prop}' não encontrado.")
                    continue
                nova_participacao = Participacao(
                    imovel_id=imovel.id,
                    proprietario_id=proprietario.id,
                    porcentagem=percentual,
                    observacoes=None,
                    ativo=True,
                    data_registro=data_registro_lote
                )
                novas_participacoes.append(nova_participacao)
                criados += 1
            processados += 1

        # Persistir todas as novas participações
        for p in novas_participacoes:
            db.add(p)
        db.commit()

        return {
            "processados": processados,
            "criados": criados,
            "erros": len(erros),
            "detalhe_errores": erros[:10],
            "mensagem": f"Processados: {processados}, Criados: {criados}, Erros: {len(erros)}"
        }

    except Exception as e:
        db.rollback()
        print(f"Erro na importação de participações: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar o arquivo: {str(e)}")


@router.post("/nova-versao", response_model=Dict)
def criar_nova_versao_participacoes(payload: Dict, db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
    """Criar uma NOVA VERSÃO do conjunto de participações.
    Espera payload com a chave 'participacoes' contendo lista de itens:
    [{ imovel_id, proprietario_id, porcentagem, observacoes?, ativo? }]

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
                "porcentagem": porcentagem,
                "observacoes": it.get("observacoes"),
                "ativo": bool(it.get("ativo", True))
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
                observacoes=it.get("observacoes"),
                ativo=it.get("ativo", True),
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
