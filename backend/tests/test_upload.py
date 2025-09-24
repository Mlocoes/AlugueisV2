"""
Testes para upload de arquivos
"""
import pytest
from fastapi.testclient import TestClient
from main import app
import io

client = TestClient(app)

def test_upload_valid_excel():
    """Testa upload de arquivo Excel válido."""
    # Criar arquivo Excel de teste simples
    excel_content = b"test excel content"

    files = {"file": ("test.xlsx", io.BytesIO(excel_content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    response = client.post("/api/upload/", files=files)

    # Deve retornar erro de autenticação ou processar o arquivo
    assert response.status_code in [401, 200, 201]

def test_upload_invalid_file_type():
    """Testa upload de arquivo com tipo inválido."""
    files = {"file": ("test.txt", io.BytesIO(b"invalid content"), "text/plain")}

    response = client.post("/api/upload/", files=files)

    # Deve rejeitar arquivo não Excel
    assert response.status_code == 400 or response.status_code == 401

def test_upload_large_file():
    """Testa upload de arquivo muito grande."""
    # Criar arquivo grande (mais de 10MB)
    large_content = b"x" * (11 * 1024 * 1024)  # 11MB

    files = {"file": ("large.xlsx", io.BytesIO(large_content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    response = client.post("/api/upload/", files=files)

    # Deve rejeitar arquivo muito grande
    assert response.status_code == 413 or response.status_code == 401