"""
Testes para upload de arquivos
"""
import pytest
from fastapi.testclient import TestClient
import io

def test_upload_valid_excel_unauthorized(client: TestClient):
    """Testa upload de arquivo Excel válido sem autenticação."""
    excel_content = b"test excel content"
    files = {"file": ("test.xlsx", io.BytesIO(excel_content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    response = client.post("/api/upload/", files=files)

    assert response.status_code == 401

def test_upload_invalid_file_type_unauthorized(client: TestClient):
    """Testa upload de arquivo com tipo inválido sem autenticação."""
    files = {"file": ("test.txt", io.BytesIO(b"invalid content"), "text/plain")}

    response = client.post("/api/upload/", files=files)

    assert response.status_code == 401

def test_upload_large_file_unauthorized(client: TestClient):
    """Testa upload de arquivo muito grande sem autenticação."""
    large_content = b"x" * (11 * 1024 * 1024)  # 11MB
    files = {"file": ("large.xlsx", io.BytesIO(large_content), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}

    response = client.post("/api/upload/", files=files)

    assert response.status_code == 401