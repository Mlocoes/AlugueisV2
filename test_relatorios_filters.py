#!/usr/bin/env python3
"""
Script para testar os filtros de relatórios
"""
import requests
import json

BASE_URL = "http://zeus.kronos.cloudns.ph:8000"

def test_relatorios_endpoint():
    print("🧪 Testando endpoint de relatórios...")
    
    # Teste sem filtros
    try:
        response = requests.get(f"{BASE_URL}/api/reportes/resumen-mensual")
        print(f"📊 Sem filtros: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   - {len(data)} registros encontrados")
            if data:
                print(f"   - Primeiro registro: {data[0]}")
        print()
    except Exception as e:
        print(f"❌ Erro sem filtros: {e}")
    
    # Teste com filtro de ano
    try:
        response = requests.get(f"{BASE_URL}/api/reportes/resumen-mensual?ano=2024")
        print(f"📅 Com filtro ano=2024: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   - {len(data)} registros encontrados")
        print()
    except Exception as e:
        print(f"❌ Erro com filtro de ano: {e}")
    
    # Teste com filtro de mês
    try:
        response = requests.get(f"{BASE_URL}/api/reportes/resumen-mensual?mes=8")
        print(f"📆 Com filtro mes=8: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   - {len(data)} registros encontrados")
        print()
    except Exception as e:
        print(f"❌ Erro com filtro de mês: {e}")
    
    # Teste com múltiplos filtros
    try:
        response = requests.get(f"{BASE_URL}/api/reportes/resumen-mensual?ano=2024&mes=8")
        print(f"🎯 Com filtros ano=2024&mes=8: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   - {len(data)} registros encontrados")
            if data:
                for item in data:
                    print(f"   - {item.get('nome_proprietario', 'N/A')} - {item.get('mes', 'N/A')}/{item.get('ano', 'N/A')}")
        print()
    except Exception as e:
        print(f"❌ Erro com múltiplos filtros: {e}")

if __name__ == "__main__":
    test_relatorios_endpoint()
