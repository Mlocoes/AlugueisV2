/**
 * Configuração principal do Sistema de Aluguéis V2
 * Frontend otimizado e modular
 */

const AppConfig = {
    // API Configuration - Detección automática de entorno
    api: {
        baseUrl: '', // Se configurará automáticamente
        port: '8000',
        endpoints: {
            auth: '/api/auth/',
            proprietarios: '/api/proprietarios/',
            imoveis: '/api/imoveis/',
            alugueis: '/api/alugueis/',
            participacoes: '/api/participacoes/',
            relatorios: '/api/reportes/',
            distribuicoes: '/api/distribuicoes/',
            extras: '/api/extras/',
            transferencias: '/api/transferencias/',
            health: '/api/health'
        }
    },

        // Método para detectar entorno y configurar URL base
    async initNetwork() {
        // Para el entorno Docker con proxy NGINX, siempre usamos una URL base relativa.
        // NGINX se encarga de redirigir las llamadas /api/ al backend.
        this.api.baseUrl = '';
        console.log('✅ Configuración de red unificada para modo proxy.');

        // Probar conectividad con el backend a través del proxy.
        try {
            // Usamos la URL relativa que el proxy NGINX interceptará.
            const response = await fetch('/api/health');
            if (response.ok) {
                console.log('✅ Conectividad con backend confirmada vía proxy.');
            } else {
                console.warn('⚠️ Backend responde pero con error:', response.status);
            }
        } catch (error) {
            console.error('❌ Error conectando con backend vía proxy:', error.message);
        }
    },

    // UI Configuration
    ui: {
        defaultTab: 'dashboard',
        animations: {
            fadeIn: 300,
            fadeOut: 200
        },
        pagination: {
            itemsPerPage: 10
        },
        alerts: {
            autoHideDelay: 5000
        }
    },

    // Módulos disponíveis
    modules: {
        dashboard: true,
        proprietarios: true,
        imoveis: true,
        participacoes: true,
        alugueis: true,
        distribuicoes: true,
        relatorios: true
    },

    // Chart Configuration
    charts: {
        colors: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#C9CBCF', '#4BC0C0', '#FF6384', '#FFCE56'
        ],
        defaultType: 'line',
        responsive: true
    },

    // Debug mode
    debug: true,

    // Version
    version: '2.1.0',

    // Método para actualizar dinámicamente la URL base
    updateBaseURL(newBaseURL) {
        this.api.baseUrl = newBaseURL;
        console.log(`🔄 URL base actualizada: ${this.api.baseUrl}`);
    },

    // Método para obtener la URL base actual
    getBaseURL() {
        return this.api.baseUrl; // Retorna cadena vacía para uso con proxy nginx
    }
};

// Export para uso global
window.AppConfig = AppConfig;

// Auto-inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await AppConfig.initNetwork();
});

console.log('🚀 AppConfig cargado - Inicialización automática habilitada');
