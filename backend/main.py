"""
FastAPI Backend para Sistema de Aluguéis V2 - Estrutura Modular
Implementação refatorizada com estrutura organizada por módulos
"""
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi_csrf_protect import CsrfProtect
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

import os
import time
from fastapi_utils.tasks import repeat_every
from fastapi.responses import JSONResponse

from config import APP_CONFIG, CORS_CONFIG, get_db, UPLOAD_DIR
from models_final import AluguelSimples, Imovel
from routers import alugueis, estadisticas, upload, auth
from routers import proprietarios, imoveis, participacoes, reportes, extras, transferencias, dashboard, health
from routers.auth import verify_token
from utils.error_handlers import global_exception_handler

# Configuração CSRF
from pydantic_settings import BaseSettings

class CsrfSettings(BaseSettings):
    secret_key: str
    cookie_samesite: str = "lax"
    token_location: str = "header"
    token_key: str = "X-CSRF-Token"

@CsrfProtect.load_config
def get_csrf_config():
    from dotenv import load_dotenv
    import os
    load_dotenv()
    csrf_secret = os.getenv("CSRF_SECRET_KEY")
    if not csrf_secret:
        raise RuntimeError("CSRF_SECRET_KEY must be set in the environment")
    return [
        ('secret_key', csrf_secret),
        ('cookie_samesite', 'lax'),
        ('token_location', 'header'),
        ('token_key', 'X-CSRF-Token')
    ]

# Configuração da aplicação

app = FastAPI(**APP_CONFIG)
app.add_middleware(CORSMiddleware, **CORS_CONFIG)


# Configuração de Rate Limiting para prevenir ataques de força bruta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Handler global de exceções
from fastapi import Request
app.add_exception_handler(Exception, global_exception_handler)

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
app.include_router(dashboard.router)
app.include_router(alugueis.router)
app.include_router(estadisticas.router)
app.include_router(upload.router)
app.include_router(proprietarios.router)
app.include_router(imoveis.router)
app.include_router(participacoes.router)
app.include_router(reportes.router)
app.include_router(extras.router)
app.include_router(transferencias.router)
app.include_router(health.router)

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

# CSRF Protection endpoints
@app.get("/api/csrf-token")
def get_csrf_token():
    # Generate CSRF token without requiring existing validation (for initial requests)
    from itsdangerous import URLSafeTimedSerializer
    from config import SECRET_KEY
    from dotenv import load_dotenv
    import os
    load_dotenv()
    csrf_secret = os.getenv("CSRF_SECRET_KEY")
    if not csrf_secret:
        raise RuntimeError("CSRF_SECRET_KEY must be set")
    
    serializer = URLSafeTimedSerializer(csrf_secret, salt="fastapi-csrf-token")
    token = serializer.dumps({"csrf": "token"})
    return {"csrf_token": token}

# O middleware fastapi-csrf-protect agora lida com a verificação de CSRF.
# O middleware manual foi removido.

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
