"""
Testes para proprietários
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from models_final import Proprietario

def test_get_proprietarios_unauthorized(client: TestClient):
    """Testa acesso não autorizado aos proprietários."""
    response = client.get("/api/proprietarios/")
    assert response.status_code == 401

def test_create_proprietario_unauthorized(client: TestClient):
    """Testa criação de proprietário sem autenticação."""
    proprietario_data = {
        "nome": "João Silva",
        "documento": "12345678901",
        "email": "joao@example.com",
        "telefone": "11999999999"
    }
    response = client.post("/api/proprietarios/", json=proprietario_data)
    assert response.status_code == 401

def test_proprietario_validation_unauthorized(client: TestClient):
    """Testa que a validação de dados ocorre após a autenticação."""
    invalid_data = {
        "nome": "",
        "documento": "invalid",
        "email": "invalid-email",
        "telefone": "invalid"
    }
    response = client.post("/api/proprietarios/", json=invalid_data)
    assert response.status_code == 401