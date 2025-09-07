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
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const isHttps = protocol === 'https:';
        
        console.log('🌐 Detectando entorno de ejecução...');
        console.log(`   Hostname: ${hostname}`);
        console.log(`   Protocol: ${protocol}`);
        
        // Forzar la configuración para zeus.kronos.cloudns.ph
        if (hostname === 'zeus.kronos.cloudns.ph') {
            this.api.baseUrl = 'http://zeus.kronos.cloudns.ph:8000';
            console.log('🏛️ Modo producción Zeus detectado - FORZADO');
        } else if (isHttps) {
            // Estamos usando Traefik con SSL - usar el mismo dominio
            this.api.baseUrl = `${protocol}//${hostname}`;
            console.log('🔒 Modo Traefik detectado (HTTPS) - mismo dominio');
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Estamos en desarrollo local
            this.api.baseUrl = 'http://localhost:8000';
            console.log('🏠 Modo desarrollo local detectado');
        } else {
            // Estamos en red local sin Traefik
            this.api.baseUrl = `http://${hostname}:8000`;
            console.log('🌐 Modo red local detectado');
        }
        
        console.log(`✅ URL base configurada: ${this.api.baseUrl}`);
        
        // Probar conectividad con el backend
        try {
            const response = await fetch(`${this.api.baseUrl}/api/health`);
            if (response.ok) {
                console.log('✅ Conectividad con backend confirmada');
            } else {
                console.warn('⚠️ Backend responde pero con error:', response.status);
            }
        } catch (error) {
            console.error('❌ Error conectando con backend:', error.message);
            // Fallback a modo proxy nginx relativo
            this.api.baseUrl = '';
            console.log('🔄 Fallback a modo proxy relativo');
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
