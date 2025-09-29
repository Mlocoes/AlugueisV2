"""
Configuração da aplicação FastAPI - Sistema de Gestão de Aluguéis V2
"""
import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configurações de ambiente
ENV = os.getenv("ENV", "development").lower()

# Configuração do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL")

# SQLAlchemy setup
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency para obter sessão do banco
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Configuração da aplicação FastAPI
APP_CONFIG = {
    "title": "Sistema de Gestão de Aluguéis V2",
    "description": "API para gestão de aluguéis, proprietários e imóveis - Versão 2",
    "version": "2.0.0",
    "docs_url": "/docs",
    "redoc_url": "/redoc"
}

import logging
# Configuração CORS mais segura - SEM WILDCARD por padrão
raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://zeus.kronos.cloudns.ph:3000")

# Em produção, forçar origens específicas e não aceitar wildcard
if ENV == "production":
    if "*" in raw_origins or not raw_origins.strip():
        logging.warning("[CORS] AVISO: Usando CORS permissivo em produção! Configure CORS_ALLOW_ORIGINS com origens específicas.")
        ALLOW_ORIGINS = ["http://localhost:3000"]  # Fallback seguro
    else:
        ALLOW_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
else:
    # Desenvolvimento - permitir localhost
    ALLOW_ORIGINS = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

logging.basicConfig(level=logging.INFO)
logging.info(f"[CORS] Ambiente: {ENV}")
logging.info(f"[CORS] ALLOW_ORIGINS: {ALLOW_ORIGINS}")

# Controlar credenciais por variável (padrão: true se usar cookies, false se wildcard)
if os.getenv("CORS_ALLOW_CREDENTIALS") is not None:
    allow_credentials_effective = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
else:
    # Permitir credentials por padrão, já que o sistema usa autenticação baseada em cookies
    allow_credentials_effective = True

# Se wildcard for usado, não permitir credenciais (requisito do navegador)
if "*" in ALLOW_ORIGINS:
    allow_credentials_effective = False
    logging.warning("[CORS] AVISO: Wildcard detectado - credentials desabilitadas")

CORS_CONFIG = {
    "allow_origins": ALLOW_ORIGINS,
    "allow_credentials": allow_credentials_effective,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-CSRF-Token"]
}

# Configurações de segredo e debug
SECRET_KEY = os.getenv("SECRET_KEY")

# Forçar SECRET_KEY a ser definido em todos os ambientes
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY deve ser definido no ambiente")

# DEBUG é falso por padrão. Para habilitar, defina a variável de ambiente DEBUG="true"
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Configurações de upload
UPLOAD_DIR = "/tmp/uploads"
STORAGE_DIR = "/tmp/storage"

# Criar diretórios se não existirem
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)
