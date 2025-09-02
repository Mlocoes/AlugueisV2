/**
 * Configuración para Frontend Móvil
 * Sistema de Alquileres V2
 */

const MobileConfig = {
    api: {
        baseUrl: 'http://192.168.0.7:3000',
        endpoints: {
            auth: '/api/auth/',
            proprietarios: '/api/proprietarios/',
            imoveis: '/api/imoveis/',
            alugueis: '/api/alugueis/',
            participacoes: '/api/participacoes/',
            relatorios: '/api/relatorios/',
            distribuicoes: '/api/distribuicoes/',
            health: '/api/health'
        }
    },

    ui: {
        animations: {
            fadeIn: 300,
            fadeOut: 200
        },
        alerts: {
            autoHideDelay: 5000
        }
    },

    storage: {
        tokenKey: 'sistema_alquileres_mobile_token',
        userKey: 'sistema_alquileres_mobile_user'
    },

    debug: true,
    version: '2.1.0-mobile'
};

// Export para uso global
window.MobileConfig = MobileConfig;

console.log('📱 Configuração móvil carregada:', MobileConfig.version);
