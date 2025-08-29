"""
Router para importação de dados via Excel
Sistema de Aluguéis V2 - Compatível com tabelas atuais
"""
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_
from config import get_db
from models_final import Proprietario, Imovel, AluguelSimples, LogImportacao, Usuario
from .auth import is_admin

router = APIRouter(prefix="/importacao", tags=["importacao"])

@router.post("/importar-excel/")
async def importar_proprietarios_excel(file: UploadFile = File(...), db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
    """Importa proprietários a partir de arquivo Excel."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Arquivo deve ser Excel (.xlsx ou .xls)")

    try:
        conteudo = await file.read()
        df = pd.read_excel(conteudo)

        colunas_esperadas = ["Nome", "Sobrenome", "Documento", "Email"]
        for col in colunas_esperadas:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Coluna '{col}' obrigatória não encontrada")

        registros_processados = 0
        registros_sucesso = 0
        registros_erros = 0
        erros_detalhe = []

        for indice, fila in df.iterrows():
            registros_processados += 1
            try:
                nome = str(fila["Nome"]).strip()
                sobrenome = str(fila.get("Sobrenome", "")).strip()
                documento = str(fila.get("Documento", "")).strip()
                email = str(fila.get("Email", "")).strip()

                if not nome:
                    erros_detalhe.append(f"Linha {indice + 2}: Nome obrigatório não informado")
                    registros_erros += 1
                    continue

                existe = db.query(Proprietario).filter(Proprietario.nome == nome).first()
                if existe:
                    erros_detalhe.append(f"Linha {indice + 2}: Proprietário '{nome}' já existe")
                    registros_erros += 1
                    continue

                novo_proprietario = Proprietario(
                    nome=nome,
                    sobrenome=sobrenome,
                    documento=documento,
                    email=email
                )
                db.add(novo_proprietario)
                registros_sucesso += 1

            except Exception as e:
                registros_erros += 1
                erros_detalhe.append(f"Linha {indice + 2}: Erro inesperado - {str(e)}")

        db.commit()

        return {
            "processados": registros_processados,
            "sucesso": registros_sucesso,
            "erros": registros_erros,
            "detalhe_erros": erros_detalhe[:10] if len(erros_detalhe) > 10 else erros_detalhe
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

@router.post("/importar-alquileres-modelo/")
async def importar_alugueis_excel(file: UploadFile = File(...), db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
    """Importa aluguéis a partir de arquivo Excel com múltiplas abas, usando o nome da primeira coluna como data de referência."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Arquivo deve ser Excel (.xlsx ou .xls)")

    try:
        conteudo = await file.read()
        
        # Ler todas as abas do arquivo Excel
        excel_file = pd.ExcelFile(conteudo)
        
        # Obter proprietários da base de dados
        proprietarios_bd = db.query(Proprietario).all()
        proprietarios_map = {p.nome.strip().lower(): p for p in proprietarios_bd}

        registros_processados = 0
        registros_sucesso = 0
        registros_erros = 0
        erros_detalhe = []
        abas_processadas = 0

        # Processar cada aba
        for nome_aba in excel_file.sheet_names:
            try:
                abas_processadas += 1
                df = pd.read_excel(conteudo, sheet_name=nome_aba)
                
                if df.empty:
                    erros_detalhe.append(f"Aba '{nome_aba}': Aba vazia")
                    continue

                # Obter data de referência do nome da primeira coluna
                try:
                    primera_columna = df.columns[0]
                    
                    # Tentar converter o nome da coluna para data
                    if isinstance(primera_columna, pd.Timestamp):
                        data_ref = primera_columna
                    else:
                        data_ref = pd.to_datetime(str(primera_columna))
                    
                    mes = data_ref.month
                    ano = data_ref.year
                    
                except Exception as e:
                    erros_detalhe.append(f"Aba '{nome_aba}': Erro ao processar data no nome da primeira coluna '{primera_columna}' - {str(e)}")
                    continue

                # Verificar se existem as colunas necessárias
                colunas_esperadas = ["Valor Total", "Taxa de Administração"]
                for col in colunas_esperadas:
                    if col not in df.columns:
                        erros_detalhe.append(f"Aba '{nome_aba}': Coluna '{col}' não encontrada")
                        continue

                # Identificar colunas de proprietários (entre Valor Total e Taxa de Administração)
                try:
                    idx_valor_total = list(df.columns).index("Valor Total")
                    idx_taxa_adm = list(df.columns).index("Taxa de Administração")
                    colunas_proprietarios = list(df.columns)[idx_valor_total+1:idx_taxa_adm]
                except Exception as e:
                    erros_detalhe.append(f"Aba '{nome_aba}': Erro na estrutura das colunas - {str(e)}")
                    continue

                # Processar cada linha da aba
                for indice, fila in df.iterrows():
                    registros_processados += 1
                    try:
                        nome_imovel = str(fila[primera_columna]).strip()
                        valor_total = fila["Valor Total"]
                        taxa_administracao = fila["Taxa de Administração"]

                        if pd.isna(valor_total) or valor_total == 0:
                            erros_detalhe.append(f"Aba '{nome_aba}' - Linha {indice + 2}: Valor total vazio ou zero")
                            registros_erros += 1
                            continue

                        # Verificar se o imóvel existe
                        imovel = db.query(Imovel).filter(Imovel.nome == nome_imovel).first()
                        if not imovel:
                            erros_detalhe.append(f"Aba '{nome_aba}' - Linha {indice + 2}: Imóvel '{nome_imovel}' não encontrado")
                            registros_erros += 1
                            continue

                        # Processar cada proprietário
                        for col_prop in colunas_proprietarios:
                            valor_prop = fila[col_prop]
                            if pd.notna(valor_prop) and valor_prop != 0:
                                nome_prop = col_prop.strip().lower()
                                propietario = proprietarios_map.get(nome_prop)
                                if not propietario:
                                    erros_detalhe.append(f"Aba '{nome_aba}' - Linha {indice + 2}: Proprietário '{col_prop}' não encontrado na base")
                                    registros_erros += 1
                                    continue

                                # Verificar se já existe registro para este período
                                existe = db.query(AluguelSimples).filter(
                                    and_(
                                        AluguelSimples.imovel_id == imovel.id,
                                        AluguelSimples.proprietario_id == propietario.id,
                                        AluguelSimples.mes == mes,
                                        AluguelSimples.ano == ano
                                    )
                                ).first()
                                if existe:
                                    erros_detalhe.append(f"Aba '{nome_aba}' - Linha {indice + 2}: Registro duplicado para {col_prop} em {mes}/{ano}")
                                    continue

                                # Criar novo registro de aluguel
                                novo_aluguel = AluguelSimples(
                                    imovel_id=imovel.id,
                                    proprietario_id=propietario.id,
                                    mes=mes,
                                    ano=ano,
                                    valor_aluguel_proprietario=valor_prop,
                                    taxa_administracao_total=taxa_administracao if pd.notna(taxa_administracao) else 0,
                                    taxa_administracao_proprietario=0,
                                    valor_liquido_proprietario=valor_prop
                                )
                                db.add(novo_aluguel)
                                registros_sucesso += 1

                    except Exception as e:
                        registros_erros += 1
                        erros_detalhe.append(f"Aba '{nome_aba}' - Linha {indice + 2}: Erro inesperado - {str(e)}")

            except Exception as e:
                erros_detalhe.append(f"Aba '{nome_aba}': Erro ao processar aba - {str(e)}")

        db.commit()

        return {
            "processados": registros_processados,
            "sucesso": registros_sucesso,
            "erros": registros_erros,
            "abas_processadas": abas_processadas,
            "detalhe_erros": erros_detalhe[:15] if len(erros_detalhe) > 15 else erros_detalhe,
            "mensagem": f"Processadas {abas_processadas} abas: {registros_processados} registros, {registros_sucesso} sucessos, {registros_erros} erros"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar arquivo: {str(e)}")

@router.get("/logs/importacoes")
async def obter_logs_importacao(db: Session = Depends(get_db), admin_user: Usuario = Depends(is_admin)):
    """Obtém histórico de importações realizadas"""
    try:
        logs = db.query(LogImportacao).order_by(LogImportacao.data_importacao.desc()).limit(10).all()
        return [log.to_dict() for log in logs]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter logs: {str(e)}")