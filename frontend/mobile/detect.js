/**
 * Device Detection and Automatic Routing
 * Detecta el tipo de dispositivo y redirige a la interfaz apropiada
 */

function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Detectar dispositivos móviles
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

    // Detectar también por tamaño de pantalla
    const isSmallScreen = window.innerWidth <= 768;

    return mobileRegex.test(userAgent) || isSmallScreen;
}

function detectAndRedirect() {
    // Solo ejecutar en la página principal
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {

        // Verificar si hay un parámetro para forzar una interfaz
        const urlParams = new URLSearchParams(window.location.search);
        const forceInterface = urlParams.get('interface');

        if (forceInterface === 'desktop') {
            // Forzar desktop
            loadDesktopInterface();
            return;
        }

        if (forceInterface === 'mobile') {
            // Forzar móvil
            loadMobileInterface();
            return;
        }

        // Detección automática
        if (isMobileDevice()) {
            loadMobileInterface();
        } else {
            loadDesktopInterface();
        }
    }
}

function loadMobileInterface() {
    console.log('📱 Cargando interfaz móvil...');

    // Cargar los estilos móviles
    const mobileCSS = document.createElement('link');
    mobileCSS.rel = 'stylesheet';
    mobileCSS.href = '/mobile/styles.css';
    document.head.appendChild(mobileCSS);

    // Cargar la estructura HTML móvil
    fetch('/mobile/app.html')
        .then(response => response.text())
        .then(html => {
            document.body.innerHTML = html;

            // Cargar scripts móviles
            loadMobileScripts();
        })
        .catch(error => {
            console.error('Error cargando interfaz móvil:', error);
            // Fallback a desktop
            loadDesktopInterface();
        });
}

function loadDesktopInterface() {
    console.log('💻 Cargando interfaz desktop...');

    // Cargar la interfaz desktop en /desktop/
    window.location.href = '/desktop/';
}

function loadMobileScripts() {
    const scripts = [
        '/mobile/js/config.js',
        '/mobile/js/auth.js',
        '/mobile/js/api.js',
        '/mobile/js/app.js',
        '/mobile/js/views.js'
    ];

    scripts.forEach((src, index) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Mantener orden

        if (index === scripts.length - 1) {
            // Último script - inicializar app
            script.onload = () => {
                if (typeof initApp === 'function') {
                    initApp();
                }
            };
        }

        document.head.appendChild(script);
    });
}

// Agregar opción de cambiar interfaz
function addInterfaceSwitcher() {
    const switcherHTML = `
        <div id="interfaceSwitcher" style="position: fixed; bottom: 10px; right: 10px; z-index: 9999;">
            <button onclick="switchInterface()" class="btn btn-sm btn-outline-secondary">
                ${isMobileDevice() ? '💻 Desktop' : '📱 Móvil'}
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', switcherHTML);
}

function switchInterface() {
    const currentInterface = isMobileDevice() ? 'desktop' : 'mobile';
    window.location.href = `/?interface=${currentInterface}`;
}

// Ejecutar detección al cargar la página
document.addEventListener('DOMContentLoaded', detectAndRedirect);
