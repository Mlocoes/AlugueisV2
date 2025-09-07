#!/usr/bin/env python3
"""Test script para verificar endpoints de aluguéis"""

import requests
import json

def test_alugueis_endpoints():
    base_url = "http://localhost:8000"
    
    # 1. Login
    print("🔐 Realizando login...")
    login_resp = requests.post(f"{base_url}/api/auth/login", json={
        "usuario": "admin",
        "senha": "admin00"
    })
    
    if not login_resp.ok:
        print(f"❌ Erro no login: {login_resp.status_code}")
        return
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login realizado com sucesso!")
    
    # 2. Test endpoint que está funcionando
    print("\n📊 Testando /api/alugueis/distribuicao-todos-meses/...")
    resp1 = requests.get(f"{base_url}/api/alugueis/distribuicao-todos-meses/?ano=2024", headers=headers)
    print(f"Status: {resp1.status_code}")
    if resp1.ok:
        data = resp1.json()
        print(f"✅ Resposta recebida: {json.dumps(data, indent=2)[:200]}...")
    else:
        print(f"❌ Erro: {resp1.text}")
    
    # 3. Test endpoint problemático
    print("\n📊 Testando /api/alugueis/distribuicao-matriz...")
    resp2 = requests.get(f"{base_url}/api/alugueis/distribuicao-matriz?ano=2024", headers=headers)
    print(f"Status: {resp2.status_code}")
    if resp2.ok:
        data = resp2.json()
        print(f"✅ Resposta recebida: {json.dumps(data, indent=2)[:200]}...")
    else:
        print(f"❌ Erro: {resp2.text}")
    
    # 4. Test outros métodos HTTP
    print("\n📊 Testando POST /api/alugueis/distribuicao-matriz...")
    resp3 = requests.post(f"{base_url}/api/alugueis/distribuicao-matriz", 
                         json={"ano": 2024}, headers=headers)
    print(f"Status: {resp3.status_code}")
    if resp3.ok:
        data = resp3.json()
        print(f"✅ Resposta recebida: {json.dumps(data, indent=2)[:200]}...")
    else:
        print(f"❌ Erro: {resp3.text}")
    
    # 5. Listar anos disponíveis
    print("\n📅 Testando /api/alugueis/anos-disponiveis/...")
    resp4 = requests.get(f"{base_url}/api/alugueis/anos-disponiveis/", headers=headers)
    print(f"Status: {resp4.status_code}")
    if resp4.ok:
        data = resp4.json()
        print(f"✅ Anos disponíveis: {json.dumps(data, indent=2)}")
    else:
        print(f"❌ Erro: {resp4.text}")

if __name__ == "__main__":
    test_alugueis_endpoints()
