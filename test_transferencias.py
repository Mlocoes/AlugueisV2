#!/usr/bin/env python3
"""
Script para probar        els        print("\n👥 Probando endpoint público de aliases...")
        response = requests.get(f"{BASE_URL}/api/extras/relatorios")
        print(f"📡 Status: {response.status_code}")            print(f"📄 Response: {response.text}")
        
    except Exception as e:funcionalidad de transferencias
"""
import requests
import json
from datetime import datetime

# URL base del sistema
BASE_URL = "http://192.168.0.7:8000"

def test_transferencias():
    print("🔍 Probando funcionalidad de transferencias...")
    
    # Primero necesitamos obtener un token de autenticación
    # Vamos a probar con el endpoint sin autenticación
    try:
        print("📊 Probando endpoint de reportes...")
        response = requests.get(f"{BASE_URL}/api/reportes/resumen-mensual")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Reportes funcionando. Total registros: {len(data)}")
            if data:
                print(f"📝 Primer registro: {data[0]}")
                # Verificar que proprietario_id está incluido
                if 'proprietario_id' in data[0]:
                    print(f"✅ proprietario_id incluido: {data[0]['proprietario_id']}")
                else:
                    print("❌ proprietario_id NO incluido")
        else:
            print(f"❌ Error en reportes: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

    # Probar endpoint de transferencias (usando el nuevo endpoint público)
    try:
        print("\n🔒 Probando endpoint público de transferencias...")
        response = requests.get(f"{BASE_URL}/api/transferencias/relatorios")
        print(f"📡 Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Transferencias funcionando: {len(data)} transferencias encontradas")
            if data:
                print(f"📝 Primera transferencia: {data[0]['alias']} - ID: {data[0]['id']}")
        else:
            print(f"� Response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

    # Probar endpoint de aliases
    try:
        print("\n👥 Probando endpoint público de aliases...")
        response = requests.get(f"{BASE_URL}/api/extras/relatorios")
        print(f"�📡 Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Aliases funcionando: {len(data)} aliases encontrados")
            if data:
                print(f"📝 Primer alias: {data[0]['alias']} - ID: {data[0]['id']}")
        else:
            print(f"📄 Response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_transferencias()
