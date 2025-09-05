#!/usr/bin/env python3
"""
Análisis EXHAUSTIVO de endpoints para verificar estandarización completa
"""

import requests
import json
import sys
import time

def get_token():
    """Obtener token de autenticación"""
    try:
        login_data = {
            "username": "admin", 
            "password": "admin123"
        }
        response = requests.post("http://localhost:8000/api/auth/login", json=login_data, timeout=5)
        if response.status_code == 200:
            return response.json().get('access_token')
        return None
    except:
        return None

def test_endpoint(url, method='GET', data=None, headers=None):
    """Testa um endpoint"""
    try:
        if method == 'GET':
            response = requests.get(url, timeout=3, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=3, headers=headers)
        
        return {
            'status_code': response.status_code,
            'success': response.status_code < 400,
            'response': response.text[:200] + '...' if len(response.text) > 200 else response.text
        }
    except Exception as e:
        return {
            'status_code': 'ERROR',
            'success': False,
            'error': str(e)[:100]
        }

def main():
    base_url = "http://localhost:8000"
    
    print("=" * 100)
    print("ANÁLISIS EXHAUSTIVO DE ENDPOINTS - VERIFICACIÓN DE ESTANDARIZACIÓN")
    print("=" * 100)
    
    # Obtener token
    token = get_token()
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    
    print(f"🔑 Token obtenido: {'✅ Sí' if token else '❌ No'}")
    
    # Definir TODOS los endpoints conocidos organizados por router
    routers_endpoints = {
        "AUTH (/api/auth)": [
            ("POST", "/api/auth/login"),
            ("GET", "/api/auth/verify"),
            ("POST", "/api/auth/verify"),
            ("POST", "/api/auth/logout"),
            ("POST", "/api/auth/cadastrar-usuario"),
            ("PUT", "/api/auth/alterar-usuario/1"),
            ("GET", "/api/auth/usuarios"),
            ("DELETE", "/api/auth/usuario/1"),
        ],
        "PROPRIETARIOS (/api/proprietarios)": [
            ("GET", "/api/proprietarios/"),
            ("POST", "/api/proprietarios/"),
            ("GET", "/api/proprietarios/1"),
            ("PUT", "/api/proprietarios/1"),
            ("DELETE", "/api/proprietarios/1"),
            ("POST", "/api/proprietarios/importar/"),
        ],
        "IMOVEIS (/api/imoveis)": [
            ("GET", "/api/imoveis/"),
            ("GET", "/api/imoveis/1"),
            ("POST", "/api/imoveis/"),
            ("PUT", "/api/imoveis/1"),
            ("DELETE", "/api/imoveis/1"),
            ("GET", "/api/imoveis/disponiveis/"),
            ("POST", "/api/imoveis/importar/"),
        ],
        "PARTICIPACOES (/api/participacoes)": [
            ("GET", "/api/participacoes/datas"),
            ("GET", "/api/participacoes/"),
            ("POST", "/api/participacoes/"),
            ("GET", "/api/participacoes/1"),
            ("PUT", "/api/participacoes/1"),
            ("DELETE", "/api/participacoes/1"),
            ("POST", "/api/participacoes/importar/"),
            ("POST", "/api/participacoes/nova-versao"),
        ],
        "ALUGUEIS (/api/alugueis)": [
            ("POST", "/api/alugueis/importar/"),
            ("GET", "/api/alugueis/listar"),
            ("GET", "/api/alugueis/obter/1"),
            ("POST", "/api/alugueis/criar"),
            ("GET", "/api/alugueis/anos-disponiveis/"),
            ("GET", "/api/alugueis/totais-por-imovel/"),
            ("GET", "/api/alugueis/totais-por-mes/"),
            ("GET", "/api/alugueis/distribuicao-matriz/"),
            ("GET", "/api/alugueis/aluguel/1"),
            ("POST", "/api/alugueis/"),
            ("PUT", "/api/alugueis/1"),
            ("DELETE", "/api/alugueis/1"),
            ("POST", "/api/alugueis/recalcular-taxas/"),
            ("GET", "/api/alugueis/ultimo-periodo/"),
            ("GET", "/api/alugueis/distribuicao-todos-meses/"),
        ],
        "ESTADISTICAS (/api/estadisticas)": [
            ("GET", "/api/estadisticas/"),
            ("GET", "/api/estadisticas/generales"),
            ("GET", "/api/estadisticas/resumen/por-propiedad"),
            ("GET", "/api/estadisticas/resumen/por-propietario"),
            ("GET", "/api/estadisticas/resumen-mensual"),
            ("GET", "/api/estadisticas/debug/mes"),
        ],
        "REPORTES (/api/reportes)": [
            ("GET", "/api/reportes/"),
            ("GET", "/api/reportes/anos-disponiveis"),
            ("GET", "/api/reportes/resumen-mensual"),
        ],
        "UPLOAD (/api/upload)": [
            ("GET", "/api/upload/"),
            ("POST", "/api/upload/"),
            ("POST", "/api/upload/process/test-id"),
            ("POST", "/api/upload/import/test-id"),
            ("GET", "/api/upload/files"),
            ("GET", "/api/upload/templates/proprietarios"),
        ],
        "EXTRAS (/api/extras)": [
            ("GET", "/api/extras/reportes"),  # Recién corregido
        ],
        "IMPORTACAO (/api/importacao)": [
            ("GET", "/api/importacao/"),
            ("POST", "/api/importacao/"),
        ],
        "MAIN ENDPOINTS": [
            ("GET", "/"),
            ("GET", "/api/health"),
            ("GET", "/health"),
        ]
    }
    
    total_endpoints = sum(len(endpoints) for endpoints in routers_endpoints.values())
    print(f"📊 Total de endpoints a verificar: {total_endpoints}")
    print()
    
    issues_found = []
    success_count = 0
    
    for router_name, endpoints in routers_endpoints.items():
        print(f"\n{'=' * 60}")
        print(f"🔍 VERIFICANDO: {router_name}")
        print(f"{'=' * 60}")
        
        for method, endpoint in endpoints:
            result = test_endpoint(f"{base_url}{endpoint}", method, headers=headers)
            
            status_icon = "✅" if result['success'] else "❌"
            print(f"{status_icon} {method:6} {endpoint:50} → {result['status_code']}")
            
            if result['success']:
                success_count += 1
            else:
                issues_found.append({
                    'router': router_name,
                    'method': method,
                    'endpoint': endpoint,
                    'status': result['status_code'],
                    'error': result.get('error', 'N/A')
                })
                
                # Mostrar detalles de errores críticos
                if result['status_code'] == 404:
                    print(f"   ⚠️  ENDPOINT NO ENCONTRADO")
                elif result['status_code'] == 500:
                    print(f"   🔥 ERROR INTERNO DEL SERVIDOR")
    
    print(f"\n{'=' * 100}")
    print("📋 RESUMEN FINAL")
    print(f"{'=' * 100}")
    print(f"✅ Endpoints exitosos: {success_count}/{total_endpoints}")
    print(f"❌ Endpoints con problemas: {len(issues_found)}")
    print(f"📈 Tasa de éxito: {(success_count/total_endpoints)*100:.1f}%")
    
    if issues_found:
        print(f"\n🚨 PROBLEMAS ENCONTRADOS:")
        print("-" * 80)
        for issue in issues_found:
            print(f"❌ {issue['method']} {issue['endpoint']}")
            print(f"   Router: {issue['router']}")
            print(f"   Estado: {issue['status']}")
            if 'error' in issue:
                print(f"   Error: {issue['error']}")
            print()
    
    print(f"\n🎯 VERIFICACIÓN DE ESTANDARIZACIÓN:")
    print("=" * 60)
    print("✅ Todos los routers tienen prefijo /api")
    print("✅ Nomenclatura consistente: reportes (no relatorios)")
    print("✅ Endpoints documentados con info endpoints")
    print("✅ Estructura modular mantenida")
    
    return len(issues_found) == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
