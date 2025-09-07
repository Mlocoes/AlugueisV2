#!/usr/bin/env python3
"""Script para examinar estructura de datos de aluguéis"""

import requests
import json

def examinar_datos_alugueis():
    base_url = "http://localhost:8000"
    
    # Login
    login_resp = requests.post(f"{base_url}/api/auth/login", json={
        "usuario": "admin",
        "senha": "admin00"
    })
    
    if not login_resp.ok:
        print(f"❌ Erro no login: {login_resp.status_code}")
        return
    
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Examinar datos de aluguéis
    print("📊 Examinando dados de aluguéis...")
    resp = requests.get(f"{base_url}/api/alugueis/distribuicao-todos-meses/?ano=2025", headers=headers)
    
    if resp.ok:
        data = resp.json()
        print("✅ Estrutura da resposta:")
        print(f"- success: {data.get('success')}")
        print(f"- data keys: {list(data.get('data', {}).keys())}")
        
        matriz = data.get('data', {}).get('matriz', [])
        proprietarios = data.get('data', {}).get('proprietarios', [])
        imoveis = data.get('data', {}).get('imoveis', [])
        
        print(f"\n📈 Matriz ({len(matriz)} linhas):")
        if matriz:
            print("Primeiro item da matriz:")
            primeiro_item = matriz[0]
            print(f"- Keys: {list(primeiro_item.keys())}")
            for key, value in primeiro_item.items():
                if key == 'valores' and isinstance(value, dict):
                    print(f"  - {key}: {list(value.keys())[:3]}... ({len(value)} items)")
                else:
                    print(f"  - {key}: {value}")
        
        print(f"\n👥 Proprietários ({len(proprietarios)}):")
        if proprietarios:
            primeiro_prop = proprietarios[0]
            print(f"- Keys: {list(primeiro_prop.keys())}")
            print(f"- Primeiro: {primeiro_prop}")
        
        print(f"\n🏠 Imóveis ({len(imoveis)}):")
        if imoveis:
            primeiro_imovel = imoveis[0]
            print(f"- Keys: {list(primeiro_imovel.keys())}")
            print(f"- Primeiro: {primeiro_imovel}")
        
        # Verificar se há informação de mês nos dados
        print("\n🗓️ Verificando informação de mês/período:")
        for i, item in enumerate(matriz[:3]):  # Primeiro 3 items
            print(f"Item {i}: {item}")
    else:
        print(f"❌ Erro: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    examinar_datos_alugueis()
