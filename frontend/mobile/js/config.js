/**
 * Configuración para Frontend Móvil
 * Sistema de Alquileres V2
 */

const MobileConfig = {
    api: {
        baseUrl: 'http://192.168.0.7:8000',
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
