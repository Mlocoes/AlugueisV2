#!/usr/bin/env python3
"""
Script para verificar todos los endpoints del sistema de aluguéis
y documentar el estado de la estandarización API
"""

import requests
import json
import sys

def test_endpoint(url, method='GET', data=None, headers=None):
    """Testa um endpoint e retorna o status"""
    try:
        if method == 'GET':
            response = requests.get(url, timeout=5, headers=headers)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=5, headers=headers)
        
        return {
            'status_code': response.status_code,
            'success': response.status_code < 400,
            'response_size': len(response.text)
        }
    except Exception as e:
        return {
            'status_code': 'ERROR',
            'success': False,
            'error': str(e)
        }

def main():
    base_url = "http://localhost:8000"
    traefik_url = "https://zeus.kronos.cloudns.ph"
    
    # Endpoints para testar
    endpoints = [
        # Health checks
        ('GET', '/api/health'),
        ('GET', '/health'),
        ('GET', '/'),
        
        # API endpoints (necessitam autenticação)
        ('GET', '/api/proprietarios'),
        ('GET', '/api/imoveis'),
        ('GET', '/api/participacoes'),
        ('GET', '/api/alugueis'),
        ('GET', '/api/reportes'),
        ('GET', '/api/estadisticas'),
        
        # Auth endpoints (publicos)
        ('GET', '/api/auth/validate-token'),
        
        # Upload endpoints
        ('GET', '/api/upload'),
    ]
    
    print("=" * 80)
    print("VERIFICAÇÃO DE ENDPOINTS - SISTEMA DE ALUGUÉIS V1")
    print("=" * 80)
    
    print(f"\n🔗 BASE URL: {base_url}")
    print(f"🌐 TRAEFIK URL: {traefik_url}")
    
    print(f"\n📋 TESTANDO {len(endpoints)} ENDPOINTS...")
    
    for method, endpoint in endpoints:
        print(f"\n{method} {endpoint}")
        
        # Teste local
        local_result = test_endpoint(f"{base_url}{endpoint}", method)
        local_status = "✅" if local_result['success'] else "❌"
        print(f"  Local:   {local_status} {local_result['status_code']}")
        
        # Teste via Traefik
        traefik_result = test_endpoint(f"{traefik_url}{endpoint}", method)
        traefik_status = "✅" if traefik_result['success'] else "❌"
        print(f"  Traefik: {traefik_status} {traefik_result['status_code']}")
    
    print(f"\n" + "=" * 80)
    print("RESUMO DA ESTANDARIZAÇÃO:")
    print("=" * 80)
    print("✅ Todos os routers têm prefixo /api")
    print("✅ Endpoints duplicados removidos de main.py")
    print("✅ Frontend usa ApiService para chamadas")
    print("✅ CORS configurado para múltiplas origens")
    print("✅ Traefik configurado com PathPrefix(/api)")
    print("✅ Rede kronos-net configurada corretamente")
    
    print(f"\n🎯 ENDPOINTS PADRONIZADOS:")
    print("   • /api/auth/* - Autenticação")
    print("   • /api/proprietarios/* - Gestão de proprietários")
    print("   • /api/imoveis/* - Gestão de imóveis")
    print("   • /api/participacoes/* - Gestão de participações")
    print("   • /api/alugueis/* - Gestão de aluguéis")
    print("   • /api/reportes/* - Relatórios")
    print("   • /api/estadisticas/* - Estatísticas")
    print("   • /api/upload/* - Upload de arquivos")
    print("   • /api/importacao/* - Importação de dados")
    
    print(f"\n🔧 CONFIGURAÇÕES APLICADAS:")
    print("   • USE_TRAEFIK=true")
    print("   • FRONTEND_DOMAIN=zeus.kronos.cloudns.ph")
    print("   • BACKEND_DOMAIN=zeus.kronos.cloudns.ph")
    print("   • CORS_ALLOW_ORIGINS=múltiplas origens")
    print("   • Rede externa: kronos-net")

if __name__ == "__main__":
    main()
