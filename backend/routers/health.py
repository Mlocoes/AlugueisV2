"""
Router para verificações de saúde e monitoramento
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config import get_db
import psutil
import time
from datetime import datetime
from sqlalchemy import text

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("/detailed")
async def detailed_health(db: Session = Depends(get_db)):
    """Health check detalhado com métricas do sistema."""
    # Verificar banco de dados
    db_start = time.time()
    try:
        # Usar uma query mais simples
        result = db.execute(text("SELECT 1"))
        result.fetchone()
        db_status = "ok"
        db_time = time.time() - db_start
    except Exception as e:
        print(f"Database error: {e}")  # Debug
        db_status = "error"
        db_time = -1

    # Métricas do sistema
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')

    return {
        "status": "healthy" if db_status == "ok" else "unhealthy",
        "database": {
            "response_time": f"{db_time:.3f}s" if db_time >= 0 else "N/A",
            "status": db_status
        },
        "system": {
            "memory_usage": f"{memory.percent}%",
            "disk_usage": f"{disk.percent}%",
            "cpu_count": psutil.cpu_count(),
            "cpu_percent": psutil.cpu_percent(interval=1)
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/ping")
async def ping():
    """Endpoint simples de ping."""
    return {"status": "pong", "timestamp": datetime.utcnow().isoformat() + "Z"}