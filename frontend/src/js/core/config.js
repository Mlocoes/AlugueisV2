/**
 * Configuração principal do Sistema de Aluguéis V2
 * Frontend otimizado e modular
 */

const AppConfig = {
    // API Configuration - Usar proxy de nginx en lugar de IP directa
    api: {
        baseUrl: '', // Usar ruta relativa para aprovechar el proxy nginx
        port: '8000',
        endpoints: {
            auth: '/api/auth/',
            proprietarios: '/api/proprietarios/',
            imoveis: '/api/imoveis/',
            alugueis: '/api/alugueis/',
            participacoes: '/api/participacoes/',
            relatorios: '/api/reportes/',
            distribuicoes: '/api/distribuicoes/',
            health: '/api/health'
        }
    },

    // Método para inicializar configuração de rede
    async initNetwork() {
        // Desabilitado para usar proxy nginx
        console.log('🌐 Usando proxy nginx, configuración de red deshabilitada');
        
        // No modificar baseUrl para mantener el proxy relativo
        // this.api.baseUrl permanece como cadena vacía
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

// Auto-inicialización de la configuración de red
// Usar proxy nginx en lugar de IP directa
// AppConfig.updateBaseURL('http://192.168.0.7:8000');
console.log(`🌐 URL base configurada: ${AppConfig.getBaseURL() || 'relativa (proxy nginx)'}`);
