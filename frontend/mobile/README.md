# Frontend Móvil - Sistema de Alquileres V2

Frontend optimizado para dispositivos móviles del Sistema de Alquileres V2.

## Características

- **Diseño Responsivo**: Optimizado específicamente para pantallas pequeñas
- **PWA (Progressive Web App)**: Puede ser instalada como aplicación nativa
- **Interfaz Touch-Friendly**: Botones grandes y navegación táctil
- **Offline Support**: Funciona sin conexión para funciones básicas
- **Autenticación Móvil**: Login persistente y seguro
- **Navegación Inferior**: Navegación tipo app móvil

## Estructura

```
frontend-movil/
├── index.html          # Página principal móvil
├── manifest.json       # Manifest PWA
├── sw.js              # Service Worker
└── js/
    ├── config.js      # Configuración móvil
    ├── auth.js        # Autenticación
    ├── api.js         # Servicios API
    ├── app.js         # App principal
    └── views.js       # Gerenciamento de vistas
```

## Funcionalidades

### ✅ Implementado
- Login/Logout móvil
- Dashboard principal
- Listagem de proprietários, imóveis e aluguéis
- Exclusão de registros
- Navegação bottom tab
- Alertas e loading
- PWA support

### 🔄 En desarrollo
- Formulários de creación/edición
- Relatórios móviles
- Push notifications
- Sincronização offline

## Uso

1. Servir o frontend móvil:
```bash
cd frontend-movil
python -m http.server 3001
```

2. Acessar via móvil:
```
http://192.168.0.7:3001
```

## PWA

La aplicación puede ser instalada como PWA:
- Chrome/Edge: Menu → "Instalar aplicación"
- Safari iOS: Botón compartir → "Añadir a pantalla de inicio"

## API

Conecta-se à mesma API do frontend desktop em:
`http://192.168.0.7:8000`

## Tecnologias

- **HTML5**: Estrutura semântica
- **CSS3**: Animações e responsive design
- **JavaScript ES6+**: Funcionalidades modernas
- **Bootstrap 5**: Framework CSS móvil
- **Bootstrap Icons**: Iconografia
- **Service Workers**: Cache e offline
- **Web App Manifest**: PWA
