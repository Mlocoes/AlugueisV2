from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Dict
import pandas as pd
import traceback
from datetime import datetime
from models_final import Proprietario, AluguelSimples, Usuario, Participacao, ProprietarioUpdateSchema
from config import get_db
from .auth import verify_token, verify_token_flexible

router = APIRouter(prefix="/api/proprietarios", tags=["proprietarios"])

def get_nome_completo(p: Proprietario):
    return f"{p.nome} {p.sobrenome}".strip() if p.sobrenome else p.nome

@router.get("/")
def listar_proprietarios(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Lista todos os proprietários em ordem alfabética."""
    avisos = []
    proprietarios = db.query(Proprietario).order_by(Proprietario.nome).all()
    data = []
    for p in proprietarios:
        try:
            item = p.to_dict()
            item["nome_completo"] = get_nome_completo(p)
            data.append(item)
        except Exception as e:
            avisos.append(f"Erro no proprietário id={getattr(p, 'id', None)}: {str(e)}")
    result = {"success": True, "data": data}
    if avisos:
        result["avisos"] = avisos
    return result

@router.post("/", response_model=Dict)
def criar_proprietario(dados: Dict, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Cria um novo proprietário."""
    try:
        novo_proprietario = Proprietario(**dados)
        db.add(novo_proprietario)
        db.commit()
        db.refresh(novo_proprietario)
        return {
            **novo_proprietario.to_dict(),
            "nome_completo": get_nome_completo(novo_proprietario)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar proprietário: {str(e)}")

@router.get("/{proprietario_id}", response_model=Dict)
def obter_proprietario(proprietario_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Obtém um proprietário específico pelo seu ID."""
    proprietario = db.query(Proprietario).filter(Proprietario.id == proprietario_id).first()
    if not proprietario:
        raise HTTPException(status_code=404, detail="Proprietário não encontrado")
    return {
        **proprietario.to_dict(),
        "nome_completo": get_nome_completo(proprietario)
    }

@router.put("/{proprietario_id}", response_model=Dict)
def atualizar_proprietario(proprietario_id: int, dados: ProprietarioUpdateSchema, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Atualiza os dados de um proprietário existente."""
    proprietario = db.query(Proprietario).filter(Proprietario.id == proprietario_id).first()
    if not proprietario:
        raise HTTPException(status_code=404, detail="Proprietário não encontrado")

    update_data = dados.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(proprietario, field, value)

    db.commit()
    db.refresh(proprietario)
    return {
        **proprietario.to_dict(),
        "nome_completo": get_nome_completo(proprietario)
    }

@router.delete("/{proprietario_id}")
def excluir_proprietario(proprietario_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token)):
    """Exclui um proprietário, se não tiver aluguéis ou participações associados."""
    import traceback
    from sqlalchemy.exc import SQLAlchemyError
    
    try:
        proprietario = db.query(Proprietario).filter(Proprietario.id == proprietario_id).first()
        if not proprietario:
            raise HTTPException(status_code=404, detail="Proprietário não encontrado")

        # Verificar aluguéis associados
        alugueis_count = db.query(AluguelSimples).filter(AluguelSimples.proprietario_id == proprietario_id).count()
        if alugueis_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível excluir o proprietário porque tem {alugueis_count} aluguel(is) associado(s)."
            )

        # Verificar participações associadas (apenas com porcentagem > 0)
        participacoes_count = db.query(Participacao).filter(
            Participacao.proprietario_id == proprietario_id,
            Participacao.porcentagem > 0
        ).count()
        if participacoes_count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Não é possível excluir o proprietário porque tem {participacoes_count} participação(ões) ativa(s) associada(s). Remova as participações primeiro."
            )

        # Limpar participações vazias (porcentagem = 0) antes de excluir
        participacoes_vazias = db.query(Participacao).filter(
            Participacao.proprietario_id == proprietario_id,
            Participacao.porcentagem == 0
        ).delete(synchronize_session=False)
        
        if participacoes_vazias > 0:
            print(f"Removidas {participacoes_vazias} participações vazias do proprietário {proprietario_id}")

        db.delete(proprietario)
        db.commit()
        return {"mensagem": "Proprietário excluído com sucesso"}
        
    except HTTPException:
        # Re-lançar HTTPExceptions sem modificar
        db.rollback()
        raise
    except SQLAlchemyError as e:
        # Capturar apenas erros de banco de dados
        db.rollback()
        print(f"Erro SQLAlchemy ao excluir proprietário: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados ao excluir proprietário: {str(e)}")
    except Exception as e:
        # Capturar outros erros inesperados
        db.rollback()
        print(f"Erro inesperado ao excluir proprietário: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao excluir proprietário: {str(e)}")

@router.post("/importar/", response_model=Dict)
async def importar_proprietarios(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Importa proprietários a partir de um arquivo Excel ou CSV."""

    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="O arquivo deve ser do tipo Excel ou CSV.")

    try:
        conteudo = await file.read()
        import io
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(conteudo.decode('utf-8')))
        else:
            # Ler bytes Excel corretamente
            df = pd.read_excel(io.BytesIO(conteudo))

        # Normalizar nomes de colunas para minúsculas sem espaços
        df.columns = [str(c).strip() for c in df.columns]

        # Mapeamento amplo (aceita maiúsculas/minúsculas)
        mapeamento_colunas = {
            'Nome': 'nome', 'nome': 'nome',
            'Sobrenome': 'sobrenome', 'sobrenome': 'sobrenome', 'Apellido': 'sobrenome', 'apellido': 'sobrenome',
            'Documento': 'documento', 'documento': 'documento',
            'Tipo Documento': 'tipo_documento', 'tipo documento': 'tipo_documento', 'tipo_documento': 'tipo_documento',
            'Endereço': 'endereco', 'endereco': 'endereco', 'direccion': 'endereco', 'Dirección': 'endereco',
            'Telefone': 'telefone', 'telefone': 'telefone', 'teléfono': 'telefone', 'telefono': 'telefone',
            'Banco': 'banco', 'banco': 'banco',
            'Agência': 'agencia', 'agencia': 'agencia',
            'Conta': 'conta', 'conta': 'conta', 'cuenta': 'conta',
            'Tipo Conta': 'tipo_conta', 'tipo_conta': 'tipo_conta', 'tipo cuenta': 'tipo_conta'
        }
        df.rename(columns={k: v for k, v in mapeamento_colunas.items() if k in df.columns}, inplace=True)

        if 'nome' not in df.columns:
            raise HTTPException(status_code=400, detail="A coluna 'Nome' é obrigatória.")

        processados = 0
        criados = 0
        erros = []

        for index, row in df.iterrows():
            processados += 1
            try:
                dados_proprietario = {k: (v.strip() if isinstance(v, str) else v) for k, v in row.dropna().to_dict().items()}

                # Normalizar campos chave como string para evitar erros de .strip em inteiros
                nome = str(dados_proprietario.get('nome') or '').strip()
                sobrenome = str(dados_proprietario.get('sobrenome') or '').strip()
                doc = str(dados_proprietario.get('documento') or '').strip()

                if not nome:
                    erros.append(f"Linha {index + 2}: Nome do proprietário ausente.")
                    continue
                
                # Verificação de duplicidade: preferir documento; senão, nome+sobrenome
                proprietario_existente = None
                if doc:
                    proprietario_existente = db.query(Proprietario).filter(Proprietario.documento == doc).first()
                else:
                    proprietario_existente = db.query(Proprietario).filter(
                        Proprietario.nome == nome,
                        Proprietario.sobrenome == (sobrenome or None)
                    ).first()
                if proprietario_existente:
                    erros.append(f"Linha {index + 2}: Proprietário já existe (documento/nome).")
                    continue

                # Preparar dados somente com colunas válidas e strings normalizadas
                colunas_validas = [c.key for c in Proprietario.__table__.columns]
                dados_filtrados = {k: v for k, v in dados_proprietario.items() if k in colunas_validas}
                # Forçar string nos campos textuais
                for campo in ['nome','sobrenome','documento','tipo_documento','endereco','telefone','email','banco','agencia','conta','tipo_conta']:
                    if campo in dados_filtrados and dados_filtrados[campo] is not None:
                        dados_filtrados[campo] = str(dados_filtrados[campo]).strip()
                # Garantir nome e sobrenome normalizados
                dados_filtrados['nome'] = nome
                if sobrenome:
                    dados_filtrados['sobrenome'] = sobrenome

                novo_proprietario = Proprietario(**dados_filtrados)
                db.add(novo_proprietario)
                db.commit()
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
        print(f"Erro na importação de proprietários: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao processar o arquivo: {str(e)}")