from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict
import pandas as pd
import traceback
from datetime import datetime
from models_final import Imovel, AluguelSimples, Usuario
from config import get_db
from .auth import verify_token

router = APIRouter(prefix="/api/imoveis", tags=["imoveis"])

@router.get("/")
def listar_imoveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Lista todos os imóveis em ordem alfabética."""
    try:
        imoveis = db.query(Imovel).order_by(Imovel.nome).all()
        return {"success": True, "data": [imovel.to_dict() for imovel in imoveis]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar imóveis: {str(e)}")

@router.get("/{imovel_id}")
def obter_imovel(imovel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Obtém um imóvel específico pelo seu ID."""
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")
    return {"success": True, "data": imovel.to_dict()}

@router.post("/")
def criar_imovel(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Cria um novo imóvel a partir de um dicionário de dados."""
    try:
        novo_imovel = Imovel(**dados)
        db.add(novo_imovel)
        db.commit()
        db.refresh(novo_imovel)
        return {"success": True, "data": novo_imovel.to_dict()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar imóvel: {str(e)}")

@router.put("/{imovel_id}", response_model=Dict)
def atualizar_imovel(imovel_id: int, dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Atualiza os dados de um imóvel existente."""
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")

    campos_modelo = [c.key for c in Imovel.__table__.columns]
    for campo, valor in dados.items():
        if campo in campos_modelo:
            setattr(imovel, campo, valor)

    imovel.data_atualizacao = datetime.now()
    db.commit()
    db.refresh(imovel)
    return imovel.to_dict()

@router.delete("/{imovel_id}")
def excluir_imovel(imovel_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Exclui um imóvel, se não tiver aluguéis associados."""
    imovel = db.query(Imovel).filter(Imovel.id == imovel_id).first()
    if not imovel:
        raise HTTPException(status_code=404, detail="Imóvel não encontrado")

    # Verifica se existem aluguéis associados a este imóvel
    alugueis_count = db.query(AluguelSimples).filter(AluguelSimples.imovel_id == imovel_id).count()
    if alugueis_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível excluir o imóvel porque tem {alugueis_count} aluguel(is) associado(s). Remova primeiro os aluguéis ou desative o imóvel."
        )

    db.delete(imovel)
    db.commit()
    return {"mensagem": "Imóvel excluído com sucesso"}

@router.get("/disponiveis/", response_model=List[Dict])
def listar_imoveis_disponiveis(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Lista todos os imóveis ativos/disponíveis."""
    try:
        imoveis = db.query(Imovel).filter(Imovel.ativo == True).order_by(Imovel.nome).all()
        return [i.to_dict() for i in imoveis]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/importar/", response_model=Dict)
async def importar_imoveis(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Importa imóveis a partir de um arquivo Excel, conforme o modelo."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="O arquivo deve ser do tipo Excel (.xlsx ou .xls)")
    
    try:
        conteudo = await file.read()
        df = pd.read_excel(conteudo)
        
        # Mapeamento das colunas do Excel para os campos do modelo (português)
        mapeamento_colunas = {
            'Nome': 'nome',
            'Endereço': 'endereco',
            'Tipo': 'tipo_imovel',
            'Área Total': 'area_total',
            'Área Construida': 'area_construida',
            'Valor Cadastral': 'valor_cadastral',
            'Valor Mercado': 'valor_mercado',
            'IPTU Anual': 'iptu_anual',
            'Condomínio': 'condominio_mensal',
            'Observações': 'observacoes',
            'Ativo': 'ativo'
        }
        if 'Nome' not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"A coluna obrigatória 'Nome' não foi encontrada. Colunas disponíveis: {list(df.columns)}"
            )
        
        processados = 0
        criados = 0
        erros = []
        
        for index, row in df.iterrows():
            processados += 1
            try:
                dados_imovel = {}
                for col_excel, col_modelo in mapeamento_colunas.items():
                    if col_excel in df.columns and pd.notna(row[col_excel]):
                        dados_imovel[col_modelo] = row[col_excel]

                if not dados_imovel.get('nome'):
                    erros.append(f"Linha {index + 2}: O nome do imóvel é obrigatório.")
                    continue

                imovel_existente = db.query(Imovel).filter(Imovel.nome == dados_imovel['nome']).first()
                if imovel_existente:
                    erros.append(f"Linha {index + 2}: Já existe um imóvel com o nome '{dados_imovel['nome']}'.")
                    continue

                # Preencher endereco_completo obrigatoriamente
                endereco = None
                if 'endereco' in dados_imovel and dados_imovel['endereco']:
                    endereco = str(dados_imovel['endereco'])
                elif 'nome' in dados_imovel and dados_imovel['nome']:
                    endereco = str(dados_imovel['nome'])
                else:
                    endereco = 'Imóvel sem endereço'
                dados_imovel['endereco'] = endereco

                novo_imovel = Imovel(**dados_imovel)
                db.add(novo_imovel)
                db.commit()
                db.refresh(novo_imovel)
                criados += 1

            except Exception as e:
                db.rollback()
                erros.append(f"Linha {index + 2}: {str(e)}")
        
        return {
            "processados": processados,
            "criados": criados,
            "erros": len(erros),
            "detalhe_erros": erros[:10],
            "mensagem": f"Processados: {processados}, Criados: {criados}, Erros: {len(erros)}"
        }
        
    except Exception as e:
        db.rollback()
        print(f"Erro na importação de imóveis: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar o arquivo: {str(e)}")
