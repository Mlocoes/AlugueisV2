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
            auth: '/auth/',
            proprietarios: '/proprietarios/',
            imoveis: '/imoveis/',
            alugueis: '/alugueis/',
            participacoes: '/participacoes/',
            relatorios: '/relatorios/',
            distribuicoes: '/distribuicoes/',
            health: '/health'
        }
    },

    // Método para inicializar configuração de rede
    async initNetwork() {
        if (window.networkConfig) {
            await window.networkConfig.detectServerIP();
            this.api.baseUrl = window.networkConfig.getBaseURL();
            console.log(`🌐 API configurada para: ${this.api.baseUrl}`);

            // Mostrar informações de rede
            const networkInfo = window.networkConfig.getNetworkInfo();
            if (networkInfo.canAccessFromNetwork) {
                console.log(`📡 Sistema acessível pela rede em: ${networkInfo.baseURL}`);
                console.log(`💡 Outras máquinas podem acessar via: http://${networkInfo.serverIP}:3000 (após servir o frontend)`);
            }
        } else {
            this.api.baseUrl = 'http://localhost:8000';
            console.warn('⚠️ NetworkConfig não disponível, usando localhost');
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
        return this.api.baseUrl || 'http://localhost:8000';
    }
};

// Export para uso global
window.AppConfig = AppConfig;

// Auto-inicialización de la configuración de red
// Usar proxy nginx en lugar de IP directa
// AppConfig.updateBaseURL('http://192.168.0.7:8000');
console.log(`🌐 URL base configurada: ${AppConfig.getBaseURL() || 'relativa (proxy nginx)'}`);
