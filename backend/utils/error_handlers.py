"""
Tratamento padronizado de erros para AlugueisV2
"""
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def create_error_response(status_code: int, message: str, details: str = None):
    """Cria resposta de erro padronizada."""
    error_data = {
        "error": {
            "message": message,
            "status_code": status_code,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    }

    if details:
        error_data["error"]["details"] = details

    return JSONResponse(status_code=status_code, content=error_data)

async def global_exception_handler(request: Request, exc: Exception):
    """Handler global de exceções."""
    logger.error(f"Exception: {exc}", exc_info=True)

    if isinstance(exc, HTTPException):
        return create_error_response(exc.status_code, str(exc.detail))

    return create_error_response(500, "Erro interno do servidor")

def log_security_event(event: str, user: str = None, ip: str = None, details: dict = None):
    """Registra eventos de segurança."""
    log_data = {
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
        "user": user,
        "ip": ip,
        "details": details or {}
    }

    logger.warning(f"SECURITY EVENT: {log_data}")

def validate_input_data(data: dict, required_fields: list, max_lengths: dict = None) -> list:
    """Valida dados de entrada e retorna lista de erros."""
    errors = []

    # Verificar campos obrigatórios
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"Campo '{field}' é obrigatório")

    # Verificar comprimentos máximos
    if max_lengths:
        for field, max_len in max_lengths.items():
            if field in data and len(str(data[field])) > max_len:
                errors.append(f"Campo '{field}' excede o tamanho máximo de {max_len} caracteres")

    return errors