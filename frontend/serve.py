#!/usr/bin/env python3
"""
Servidor de desarrollo para la aplicación unificada
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Configuración
PORT = 3000
DIRECTORY = Path(__file__).parent

class UnifiedHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        # Añadir headers CORS para desarrollo
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        print(f"📱 {format % args}")

def main():
    try:
        os.chdir(DIRECTORY)
        
        with socketserver.TCPServer(("", PORT), UnifiedHandler) as httpd:
            print(f"🚀 Servidor unificado iniciado en: http://localhost:{PORT}")
            print(f"📁 Sirviendo desde: {DIRECTORY}")
            print("📱 Aplicación responsiva - prueba en móvil, tablet y desktop")
            print("🔄 Presiona Ctrl+C para detener")
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n📱 Servidor detenido")
                
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Puerto {PORT} ya está en uso. Prueba con otro puerto.")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()
