/**
 * Device Detection and Responsive Manager
 * Detecta el tipo de dispositivo y adapta la interfaz
 */

class DeviceManager {
    constructor() {
        this.deviceType = this.detectDevice();
        this.orientation = this.getOrientation();
        this.isTouch = this.isTouchDevice();
        this.userAgent = navigator.userAgent;
    }

    /**
     * Detectar tipo de dispositivo
     */
    detectDevice() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);

        // Detección por tamaño de pantalla y user agent
        if (width <= 768 || isMobile) {
            return 'mobile';
        } else if (width <= 1024 || isTablet) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }

    /**
     * Detectar dispositivos táctiles
     */
    isTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }

    /**
     * Obtener orientación del dispositivo
     */
    getOrientation() {
        if (window.innerHeight > window.innerWidth) {
            return 'portrait';
        } else {
            return 'landscape';
        }
    }

    /**
     * Verificar si es PWA
     */
    isPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone ||
               document.referrer.includes('android-app://');
    }

    /**
     * Aplicar configuraciones según dispositivo
     */
    applyDeviceConfiguration() {
        const body = document.body;
        
        // Limpiar clases anteriores
        body.classList.remove('device-mobile', 'device-tablet', 'device-desktop', 'touch-enabled', 'pwa-mode');
        
        // Aplicar clases según dispositivo
        body.classList.add(`device-${this.deviceType}`);
        
        if (this.isTouch) {
            body.classList.add('touch-enabled');
        }
        
        if (this.isPWA()) {
            body.classList.add('pwa-mode');
        }

        // Configurar viewport meta tag dinámicamente
        this.setViewport();
        
        // Aplicar configuraciones específicas
        this.applyDeviceSpecificSettings();
    }

    /**
     * Configurar viewport
     */
    setViewport() {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }

        switch (this.deviceType) {
            case 'mobile':
                viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                break;
            case 'tablet':
                viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes';
                break;
            default:
                viewport.content = 'width=device-width, initial-scale=1.0';
        }
    }

    /**
     * Aplicar configuraciones específicas por dispositivo
     */
    applyDeviceSpecificSettings() {
        const root = document.documentElement;

        switch (this.deviceType) {
            case 'mobile':
                root.style.setProperty('--nav-height', '60px');
                root.style.setProperty('--sidebar-width', '100%');
                root.style.setProperty('--modal-max-width', '95vw');
                root.style.setProperty('--table-font-size', '0.8rem');
                root.style.setProperty('--button-padding', '0.5rem 1rem');
                break;
                
            case 'tablet':
                root.style.setProperty('--nav-height', '70px');
                root.style.setProperty('--sidebar-width', '300px');
                root.style.setProperty('--modal-max-width', '80vw');
                root.style.setProperty('--table-font-size', '0.9rem');
                root.style.setProperty('--button-padding', '0.6rem 1.2rem');
                break;
                
            default: // desktop
                root.style.setProperty('--nav-height', '80px');
                root.style.setProperty('--sidebar-width', '250px');
                root.style.setProperty('--modal-max-width', '600px');
                root.style.setProperty('--table-font-size', '1rem');
                root.style.setProperty('--button-padding', '0.75rem 1.5rem');
        }
    }

    /**
     * Escuchar cambios de orientación y tamaño
     */
    setupResponsiveListeners() {
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                const newDeviceType = this.detectDevice();
                const newOrientation = this.getOrientation();
                
                if (newDeviceType !== this.deviceType || newOrientation !== this.orientation) {
                    this.deviceType = newDeviceType;
                    this.orientation = newOrientation;
                    this.applyDeviceConfiguration();
                    
                    // Disparar evento personalizado
                    window.dispatchEvent(new CustomEvent('deviceChange', {
                        detail: {
                            deviceType: this.deviceType,
                            orientation: this.orientation,
                            isTouch: this.isTouch
                        }
                    }));
                }
            }, 250);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.orientation = this.getOrientation();
                this.applyDeviceConfiguration();
            }, 100);
        });
    }

    /**
     * Obtener configuración de navegación según dispositivo
     */
    getNavigationConfig() {
        switch (this.deviceType) {
            case 'mobile':
                return {
                    type: 'bottom-nav',
                    collapsible: true,
                    showLabels: true,
                    maxItems: 8
                };
            case 'tablet':
                return {
                    type: 'side-nav',
                    collapsible: true,
                    showLabels: true,
                    maxItems: 8
                };
            default:
                return {
                    type: 'side-nav',
                    collapsible: false,
                    showLabels: true,
                    maxItems: 10
                };
        }
    }

    /**
     * Obtener configuración de tabla según dispositivo
     */
    getTableConfig() {
        switch (this.deviceType) {
            case 'mobile':
                return {
                    responsive: true,
                    stackHeaders: true,
                    hideColumns: ['created_at', 'updated_at'],
                    compactMode: true,
                    virtualScroll: true
                };
            case 'tablet':
                return {
                    responsive: true,
                    stackHeaders: false,
                    hideColumns: ['updated_at'],
                    compactMode: false,
                    virtualScroll: false
                };
            default:
                return {
                    responsive: false,
                    stackHeaders: false,
                    hideColumns: [],
                    compactMode: false,
                    virtualScroll: false
                };
        }
    }

    /**
     * Obtener información del dispositivo
     */
    getDeviceInfo() {
        return {
            type: this.deviceType,
            orientation: this.orientation,
            isTouch: this.isTouch,
            isPWA: this.isPWA(),
            userAgent: this.userAgent,
            screen: {
                width: window.innerWidth,
                height: window.innerHeight,
                pixelRatio: window.devicePixelRatio || 1
            }
        };
    }
}

// Crear instancia global
window.deviceManager = new DeviceManager();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.deviceManager.applyDeviceConfiguration();
        window.deviceManager.setupResponsiveListeners();
    });
} else {
    window.deviceManager.applyDeviceConfiguration();
    window.deviceManager.setupResponsiveListeners();
}
