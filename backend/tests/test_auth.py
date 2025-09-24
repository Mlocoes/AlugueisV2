"""
Testes para autenticação
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from models_final import Usuario
from config import get_db
import bcrypt

client = TestClient(app)

def test_login_success(db_session: Session):
    """Testa login bem-sucedido."""
    # Criar usuário de teste
    hashed_password = bcrypt.hashpw("test123".encode('utf-8'), bcrypt.gensalt())
    test_user = Usuario(
        usuario="testuser",
        senha=hashed_password.decode('utf-8'),
        tipo_de_usuario="usuario",
        nome="Test User"
    )
    db_session.add(test_user)
    db_session.commit()

    # Testar login
    response = client.post("/api/auth/login", json={
        "usuario": "testuser",
        "senha": "test123"
    })

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials():
    """Testa login com credenciais inválidas."""
    response = client.post("/api/auth/login", json={
        "usuario": "invalid",
        "senha": "invalid"
    })

    assert response.status_code == 401
    assert "inválidos" in response.json()["detail"]

def test_login_rate_limiting():
    """Testa rate limiting no login."""
    # Fazer múltiplas tentativas de login falhidas
    for i in range(6):
        response = client.post("/api/auth/login", json={
            "usuario": "invalid",
            "senha": "invalid"
        })

    # A 6ª tentativa deve ser bloqueada
    assert response.status_code == 429