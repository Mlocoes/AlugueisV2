"""
Testes para autenticação
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models_final import Usuario
from routers.auth import get_password_hash

def test_login_success(client: TestClient, db_session: Session):
    """Testa login bem-sucedido."""
    # Criar usuário de teste
    hashed_password = get_password_hash("test123")
    test_user = Usuario(
        usuario="testuser",
        senha=hashed_password,
        tipo_de_usuario="usuario"
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

def test_login_invalid_credentials(client: TestClient):
    """Testa login com credenciais inválidas."""
    response = client.post("/api/auth/login", json={
        "usuario": "invalid",
        "senha": "invalid"
    })

    assert response.status_code == 401
    assert "inválidos" in response.json()["detail"]

def test_login_rate_limiting(client: TestClient):
    """Testa rate limiting no login."""
    # Fazer múltiplas tentativas de login falhidas
    for i in range(6):
        response = client.post("/api/auth/login", json={
            "usuario": "invalid",
            "senha": "invalid"
        })

    # A 6ª tentativa deve ser bloqueada
    assert response.status_code == 429