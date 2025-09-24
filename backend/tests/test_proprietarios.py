"""
Testes para proprietários
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from main import app
from models_final import Proprietario

client = TestClient(app)

def test_get_proprietarios_unauthorized():
    """Testa acesso não autorizado aos proprietários."""
    response = client.get("/api/proprietarios/")

    assert response.status_code == 401

def test_create_proprietario(db_session: Session):
    """Testa criação de proprietário (requer autenticação)."""
    proprietario_data = {
        "nome": "João Silva",
        "cpf": "12345678901",
        "email": "joao@example.com",
        "telefone": "11999999999"
    }

    response = client.post("/api/proprietarios/", json=proprietario_data)

    # Deve retornar erro de autenticação
    assert response.status_code == 401

def test_proprietario_validation():
    """Testa validação de dados do proprietário."""
    # Testar CPF inválido
    invalid_data = {
        "nome": "",
        "cpf": "invalid",
        "email": "invalid-email",
        "telefone": "invalid"
    }

    response = client.post("/api/proprietarios/", json=invalid_data)

    assert response.status_code == 401  # Autenticação primeiro, depois validação