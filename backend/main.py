"""
FastAPI Backend para Sistema de Aluguéis V2 - Estrutura Modular
Implementação refatorizada com estrutura organizada por módulos
"""
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

import os
import time
from fastapi_utils.tasks import repeat_every

from config import APP_CONFIG, CORS_CONFIG, get_db, UPLOAD_DIR
from models_final import AluguelSimples, Imovel
from routers import alugueis, estadisticas, importacao, upload, auth
from routers import proprietarios, imoveis, participacoes, reportes, extras, transferencias
from routers.auth import verify_token

# Configuração da aplicação

app = FastAPI(**APP_CONFIG)
app.add_middleware(CORSMiddleware, **CORS_CONFIG)

# Tarefa de limpeza de arquivos de upload
@app.on_event("startup")
@repeat_every(seconds=6 * 60 * 60)  # Executar a cada 6 horas
def cleanup_old_uploads():
    """Remove arquivos antigos do diretório de upload."""
    now = time.time()
    cutoff = now - (24 * 60 * 60)  # 24 horas atrás

    try:
        for filename in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(file_path):
                if os.path.getmtime(file_path) < cutoff:
                    os.remove(file_path)
                    print(f"Arquivo de upload antigo removido: {filename}")
    except Exception as e:
        print(f"Erro na limpeza de arquivos de upload: {e}")


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

@app.get("/api/health")
async def api_health_check(db: Session = Depends(get_db)):
    """Verificação de saúde do sistema via API"""
    return await health_check(db)

# =====================================================
# ENDPOINTS DE COMPATIBILIDAD REMOVIDOS
# Usar los routers específicos en /api/ en su lugar
# =====================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
