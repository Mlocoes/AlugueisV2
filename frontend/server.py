#!/usr/bin/env python3
"""
Servidor HTTP simple para el frontend optimizado
Configurado específicamente para servir archivos JavaScript y CSS
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
import mimetypes

class OptimizedHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def guess_type(self, path):
        # Asegurar que los archivos JavaScript se sirvan con el MIME type correcto
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.html'):
            return 'text/html'
        return super().guess_type(path)

def main():
    # Cambiar al directorio frontend-optimized
    frontend_dir = '/home/mloco/Escritorio/SistemaAlquileresV2/frontend-optimized'
    
    if not os.path.exists(frontend_dir):
        print(f"Error: Directory {frontend_dir} not found")
        sys.exit(1)
    
    os.chdir(frontend_dir)
    
    # Configurar servidor
    port = 3000
    handler = OptimizedHTTPRequestHandler
    
    with HTTPServer(('0.0.0.0', port), handler) as httpd:
        print(f"Serving optimized frontend at http://192.168.0.7:{port}")
        print(f"Working directory: {os.getcwd()}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == '__main__':
    main()
