"""
FastAPI Backend para Sistema de Aluguéis V2 - Estrutura Modular
Implementação refatorizada com estrutura organizada por módulos
"""
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import APP_CONFIG, CORS_CONFIG, get_db
from models_final import AluguelSimples, Imovel
from routers import alugueis, estadisticas, importacao, upload, auth
from routers import proprietarios, imoveis, participacoes, reportes, extras, transferencias
from routers.auth import verify_token

# Configuração da aplicação

app = FastAPI(**APP_CONFIG)
app.add_middleware(CORSMiddleware, **CORS_CONFIG)

# Incluir routers
app.include_router(auth.router)
app.include_router(alugueis.router)
app.include_router(estadisticas.router)
app.include_router(importacao.router)
app.include_router(upload.router)
app.include_router(proprietarios.router)
app.include_router(imoveis.router)
app.include_router(participacoes.router)
app.include_router(reportes.router)
app.include_router(extras.router)
app.include_router(transferencias.router)

# =====================================================
# ENDPOINTS PRINCIPAIS
# =====================================================

@app.get("/")
async def root():
    """Endpoint raiz com informação do sistema"""
    return {
        "mensagem": "Sistema de Aluguéis V2 - Estrutura Modular",
        "version": "2.0.0",
        "estrutura": "Modular - Refatorizada",
        "estado": "Operativo",
        "timestamp": datetime.now().isoformat(),
        "modulos": [
            "/alugueis/ - Gestão de aluguéis",
            "/estatisticas/ - Relatórios e estatísticas", 
            "/importar-excel/ - Importação de arquivos",
            "/health - Verificação de saúde"
        ]
    }

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Verificação de saúde do sistema"""
    try:
        # Verificar conexão à BD
        total_alugueis = db.query(func.count(AluguelSimples.id)).scalar()
        
        return {
            "status": "healthy",
            "database": "connected",
            "total_alugueis": total_alugueis,
            "timestamp": datetime.now().isoformat(),
            "estrutura": "modular",
            "version": "2.0.0"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sistema não está saudável: {str(e)}")

# =====================================================
# ENDPOINTS DE COMPATIBILIDADE COM FRONTEND
# =====================================================


# Novo endpoint: devolve todos os proprietários completos
from models_final import Proprietario, Imovel, AluguelSimples

@app.get("/proprietarios")
async def listar_proprietarios(db: Session = Depends(get_db), current_user = Depends(verify_token)):
    """Devolve todos os proprietários completos"""
    try:
        proprietarios = db.query(Proprietario).order_by(Proprietario.nome).all()
        return [
            {
                "id": p.id,
                "nome": p.nome,
                "sobrenome": p.sobrenome,
                "nome_completo": f"{p.nome} {p.sobrenome}".strip(),
                "documento": p.documento,
                "tipo_documento": p.tipo_documento,
                "endereco": p.endereco,
                "banco": p.banco,
                "agencia": p.agencia,
                "conta": p.conta,
                "tipo_conta": p.tipo_conta,
                "telefone": p.telefone,
                "email": p.email,
                "ativo": bool(p.ativo),
                "data_cadastro": p.data_cadastro.isoformat() if p.data_cadastro else None,
                "data_atualizacao": p.data_atualizacao.isoformat() if p.data_atualizacao else None
            }
            for p in proprietarios
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar proprietários: {str(e)}")

@app.get("/imoveis")
async def listar_imoveis(db: Session = Depends(get_db), current_user = Depends(verify_token)):
    """Endpoint de compatibilidad: listar imoveis únicos"""
    try:
        imoveis = db.query(Imovel.nome)\
            .distinct().order_by(Imovel.nome).all()
        
        return [{"id": i+1, "nome": imovel[0], "activo": True} for i, imovel in enumerate(imoveis)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar imóveis: {str(e)}")

@app.get("/participacoes")
async def listar_participacoes(db: Session = Depends(get_db), current_user = Depends(verify_token)):
    """Endpoint de compatibilidade: participações com porcentagens calculadas"""
    try:
        # Obter todas as combinações únicas de proprietario-imovel a partir dos aluguéis
        alugueis = db.query(
            Proprietario.nome.label('nome_proprietario'),
            Imovel.nome.label('nome_imovel'),
            func.sum(AluguelSimples.valor_aluguel_proprietario).label('total_valor')
        ).join(
            Proprietario, AluguelSimples.proprietario_id == Proprietario.id
        ).join(
            Imovel, AluguelSimples.imovel_id == Imovel.id
        ).group_by(
            Proprietario.nome,
            Imovel.nome
        ).all()
        
        # Calcular o total por imóvel para calcular porcentagens
        total_por_imovel = {}
        for alq in alugueis:
            imovel = alq.nome_imovel
            valor = float(alq.total_valor)
            if imovel not in total_por_imovel:
                total_por_imovel[imovel] = 0
            total_por_imovel[imovel] += valor
        
        participacoes = []
        for i, alq in enumerate(alugueis):
            valor_total = float(alq.total_valor)
            total_imovel = total_por_imovel[alq.nome_imovel]
            
            # Calcular porcentagem: (valor do proprietário / total do imóvel) * 100
            porcentagem = (valor_total / total_imovel * 100) if total_imovel != 0 else 0
            
            participacoes.append({
                "id": i+1,
                "proprietario": alq.nome_proprietario,
                "imovel": alq.nome_imovel,
                "valor_total": valor_total,
                "porcentagem": round(porcentagem, 2)
            })
        
        return participacoes
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar participações: {str(e)}")

@app.get("/alugueis")
async def listar_alugueis(db: Session = Depends(get_db), current_user = Depends(verify_token)):
    """Endpoint para listar todos os aluguéis"""
    try:
        alugueis = db.query(AluguelSimples)\
            .join(Proprietario, AluguelSimples.proprietario_id == Proprietario.id)\
            .join(Imovel, AluguelSimples.imovel_id == Imovel.id)\
            .order_by(AluguelSimples.id)\
            .all()
        
        return [
            {
                "id": alq.id,
                "proprietario_nome": f"{alq.proprietario.nome} {alq.proprietario.sobrenome}".strip(),
                "imovel_nome": alq.imovel.nome,
                "mes": alq.mes,
                "ano": alq.ano,
                "periodo": f"{alq.mes:02d}/{alq.ano}",
                "valor_aluguel_proprietario": float(alq.valor_aluguel_proprietario),
                "taxa_administracao_proprietario": float(alq.taxa_administracao_proprietario or 0),
                                "valor_liquido_proprietario": float(alq.valor_liquido_proprietario),
                "taxa_administracao_total": float(alq.taxa_administracao_total or 0),
                "data_cadastro": alq.data_cadastro.isoformat() if alq.data_cadastro else None
            }
            for alq in alugueis
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar aluguéis: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
