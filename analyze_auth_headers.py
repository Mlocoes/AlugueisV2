#!/usr/bin/env python3
"""
Script para verificar que TODAS las llamadas del frontend usan correctamente getAuthHeader()
"""

import os
import re
import sys

def analyze_auth_header_usage():
    """Analiza todos los archivos JS para problemas con authHeader"""
    
    frontend_dir = "/home/mloco/Escritorio/AlugueisV1/frontend/src/js"
    issues = []
    correct_usages = []
    
    # Patrones problemáticos
    problematic_patterns = [
        r"'Authorization':\s*authHeader[^.]",  # authHeader sin .Authorization
        r"headers\['Authorization'\]\s*=\s*authHeader[^.]",  # Asignación directa
        r"Authorization.*getAuthHeader\(\)(?!\.Authorization)",  # getAuthHeader() directo
    ]
    
    # Patrones correctos
    correct_patterns = [
        r"authHeader\.Authorization",
        r"getAuthHeader\(\)\.Authorization",
    ]
    
    print("🔍 ANÁLISIS EXHAUSTIVO DE LLAMADAS FRONTEND - getAuthHeader()")
    print("=" * 80)
    
    for root, dirs, files in os.walk(frontend_dir):
        for file in files:
            if file.endswith('.js'):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, frontend_dir)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        lines = content.split('\n')
                    
                    # Buscar problemas
                    for i, line in enumerate(lines, 1):
                        for pattern in problematic_patterns:
                            if re.search(pattern, line):
                                issues.append({
                                    'file': relative_path,
                                    'line': i,
                                    'content': line.strip(),
                                    'pattern': pattern,
                                    'type': 'PROBLEM'
                                })
                        
                        # Buscar usos correctos
                        for pattern in correct_patterns:
                            if re.search(pattern, line):
                                correct_usages.append({
                                    'file': relative_path,
                                    'line': i,
                                    'content': line.strip(),
                                    'type': 'CORRECT'
                                })
                                
                except Exception as e:
                    print(f"❌ Error reading {relative_path}: {e}")
    
    # Mostrar resultados
    print(f"\n📊 RESULTADOS DEL ANÁLISIS:")
    print("-" * 60)
    print(f"✅ Usos correctos encontrados: {len(correct_usages)}")
    print(f"❌ Problemas encontrados: {len(issues)}")
    
    if issues:
        print(f"\n🚨 PROBLEMAS CRÍTICOS ENCONTRADOS:")
        print("-" * 60)
        for issue in issues:
            print(f"❌ {issue['file']}:{issue['line']}")
            print(f"   Código: {issue['content']}")
            print(f"   Patrón: {issue['pattern']}")
            print()
    else:
        print(f"\n🎉 ¡NO SE ENCONTRARON PROBLEMAS!")
        print("✅ Todas las llamadas usan authHeader.Authorization correctamente")
    
    if correct_usages:
        print(f"\n✅ USOS CORRECTOS ENCONTRADOS:")
        print("-" * 60)
        for usage in correct_usages[:10]:  # Mostrar máximo 10
            print(f"✅ {usage['file']}:{usage['line']}")
            print(f"   Código: {usage['content']}")
        
        if len(correct_usages) > 10:
            print(f"   ... y {len(correct_usages) - 10} más")
    
    print(f"\n📋 RESUMEN FINAL:")
    print("=" * 60)
    print("🔍 Archivos analizados: Todos los .js en frontend/src/js/")
    print("🎯 Patrones verificados:")
    print("   ❌ 'Authorization': authHeader (sin .Authorization)")
    print("   ❌ headers['Authorization'] = authHeader (sin .Authorization)")
    print("   ❌ getAuthHeader() directo en Authorization")
    print("   ✅ authHeader.Authorization")
    print("   ✅ getAuthHeader().Authorization")
    
    if len(issues) == 0:
        print("\n🎉 VERIFICACIÓN COMPLETA: ¡TODO CORRECTO!")
        return True
    else:
        print(f"\n⚠️  ACCIÓN REQUERIDA: {len(issues)} problema(s) necesitan corrección")
        return False

if __name__ == "__main__":
    success = analyze_auth_header_usage()
    sys.exit(0 if success else 1)
