/**
 * Aplicación principal del Sistema de Alquileres V2 Optimizado
 * Punto de entrada y coordinador de todos los módulos
 */

class SistemaAlquileresApp {
    constructor() {
        this.initialized = false;
        this.modules = {};
        this.version = '2.1.0';
    }

    /**
     * Inicializar la aplicación
     */
    async init() {
        try {
            console.log(`🚀 Inicializando Sistema de Alquileres V${this.version}...`);

            // Inicializar configuración de red
            await this.initializeNetwork();

            // Verificar dependencias
            if (!this.checkDependencies()) {
                throw new Error('Faltan dependencias requeridas');
            }

            // Verificar conexión con el backend
            await this.checkBackendConnection();

            // Inicializar módulos
            await this.initializeModules();

            // Configurar eventos globales
            this.setupGlobalEvents();

            // Cargar pestaña inicial
            this.loadInitialTab();

            this.initialized = true;
            console.log('✅ Sistema de Alquileres inicializado correctamente');

            // Mostrar mensaje de bienvenida
            // ...existing code...

        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showError('Error crítico al inicializar el sistema', error);
        }
    }

    /**
     * Verificar dependencias requeridas
     */
    checkDependencies() {
        const dependencies = [
            { name: 'Bootstrap', check: () => typeof bootstrap !== 'undefined' },
            { name: 'Chart.js', check: () => typeof Chart !== 'undefined' && Chart.version },
            { name: 'AppConfig', check: () => typeof window.AppConfig !== 'undefined' },
            { name: 'UIManager', check: () => typeof window.uiManager !== 'undefined' },
            { name: 'ApiService', check: () => typeof window.apiService !== 'undefined' }
        ];

        const missing = dependencies.filter(dep => !dep.check());

        if (missing.length > 0) {
            console.error('❌ Dependencias faltantes:', missing.map(d => d.name));
            return false;
        }

        console.log('✅ Todas las dependencias verificadas');
        console.log('📊 Chart.js versión:', Chart.version);
        return true;
    }

    /**
     * Inicializar configuración de red y detectar IP del servidor
     */
    async initializeNetwork() {
        try {
            console.log('🌐 Inicializando configuración de red...');

            // Esperar a que AppConfig esté disponible (máximo 2 segundos)
            let attempts = 0;
            const maxAttempts = 20;
            while (!window.AppConfig && attempts < maxAttempts) {
                console.log(`⏳ Esperando AppConfig... intento ${attempts + 1}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.AppConfig) {
                console.error('❌ window.AppConfig no se pudo cargar después de esperar');
                return;
            }

            // Usar solo la lógica de hostname y AppConfig
            if (!window.AppConfig || typeof window.AppConfig.updateBaseURL !== 'function') {
                console.error('❌ window.AppConfig no está disponible');
                return;
            }
            const currentHost = window.location.hostname;
            if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
                window.AppConfig.updateBaseURL(`http://${currentHost}:8000`);
                console.log(`📡 Detectado desde URL, usando: ${window.AppConfig.getBaseURL()}`);
            } else {
                window.AppConfig.updateBaseURL('http://localhost:8000');
            }
        } catch (error) {
            console.warn('⚠️ Error en configuración de red, usando configuración por defecto:', error);
            // Fallback inteligente basado en la URL actual
            const currentHost = window.location.hostname;
            if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
                // Verificar que AppConfig existe
                if (window.AppConfig && typeof window.AppConfig.updateBaseURL === 'function') {
                    window.AppConfig.updateBaseURL(`http://${currentHost}:8000`);
                    console.log(`📡 Fallback URL detectada: ${window.AppConfig.getBaseURL()}`);
                } else {
                    console.error('❌ window.AppConfig no está disponible');
                }
            } else {
                // Verificar que AppConfig existe
                if (window.AppConfig && typeof window.AppConfig.updateBaseURL === 'function') {
                    window.AppConfig.updateBaseURL('http://localhost:8000');
                } else {
                    console.error('❌ window.AppConfig no está disponible');
                }
            }
        }
    }    /**
     * Verificar conexión con el backend
     */
    async checkBackendConnection() {
        try {
            const health = await window.apiService.getHealth();
            console.log('✅ Backend conectado:', health);

            // Actualizar indicador de conexión
            const indicator = document.querySelector('.navbar-text');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-circle text-success me-1"></i>Conectado';
            }

            return true;
        } catch (error) {
            console.error('❌ Backend no disponible:', error);

            // Actualizar indicador de conexión
            const indicator = document.querySelector('.navbar-text');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-circle text-danger me-1"></i>Desconectado';
            }

            throw new Error('Backend no disponible');
        }
    }

    /**
     * Inicializar módulos de la aplicación
     */
    async initializeModules() {
        console.log('📦 Inicializando módulos...');

        // Crear instancias de los módulos
        if (typeof DashboardModule !== 'undefined') {
            this.modules.dashboard = new DashboardModule();
            window.dashboardModule = this.modules.dashboard;
            console.log('✅ Dashboard module creado');
        }

        if (typeof ProprietariosModule !== 'undefined') {
            this.modules.proprietarios = new ProprietariosModule();
            window.proprietariosModule = this.modules.proprietarios;
            console.log('✅ Proprietarios module criado');
        }

        if (typeof ImoveisModule !== 'undefined') {
            this.modules.imoveis = new ImoveisModule();
            window.imoveisModule = this.modules.imoveis;
            console.log('✅ Imoveis module criado');
        }

        if (typeof ParticipacoesModule !== 'undefined') {
            this.modules.participacoes = new ParticipacoesModule();
            window.participacoesModule = this.modules.participacoes;
            console.log('✅ Participacoes module criado');
        }

        if (typeof ImportacaoModule !== 'undefined') {
            this.modules.importacao = new ImportacaoModule();
            window.importacaoModule = this.modules.importacao;
            console.log('✅ Importacao module criado');
        }

        if (typeof AlugueisModule !== 'undefined') {
            this.modules.alugueis = new AlugueisModule();
            window.alugueisModule = this.modules.alugueis;
            console.log('✅ Alugueis module criado');
        }

        if (typeof window.usuarioManager !== 'undefined') {
            window.usuarioManager.init();
            console.log('✅ Usuario manager inicializado');
        }

        console.log('✅ Módulos inicializados:', Object.keys(this.modules));
    }

    /**
     * Configurar eventos globales
     */
    setupGlobalEvents() {
        // Event listener para el documento
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM completamente cargado');
        });

        // Event listener para errores globales
        window.addEventListener('error', (event) => {
            let errorMsg = 'Error desconhecido';
            if (event.error && event.error.message) {
                errorMsg = event.error.message;
            } else if (typeof event.error === 'string') {
                errorMsg = event.error;
            } else if (event.message) {
                errorMsg = event.message;
            }
            console.error('❌ Error global capturado:', errorMsg);
            this.showError('Error inesperado', errorMsg);
        });

        // Event listener para promesas rechazadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ Promesa rechazada:', event.reason);
            this.showError('Error de promesa no manejada', event.reason);
        });

        // Event listener para visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.initialized) {
                console.log('👁️ Página visible - refrescando datos');
                this.refreshCurrentTab();
            }
        });

        console.log('✅ Eventos globales configurados');
    }

    /**
     * Cargar pestaña inicial
     */
    loadInitialTab() {
        const initialTab = window.AppConfig?.ui?.defaultTab || 'dashboard';
        console.log(`🎯 Cargando pestaña inicial: ${initialTab}`);
        window.uiManager?.showTab(initialTab);

        // Inicializar módulo de proprietarios también en Importar
        const importarTab = document.getElementById('importar');
        if (importarTab && typeof window.proprietariosModule !== 'undefined') {
            window.proprietariosModule.init();
        }
    }

    /**
     * Refrescar datos de la pestaña actual
     */
    async refreshCurrentTab() {
        const currentTab = window.uiManager?.currentTab;
        if (currentTab && this.modules[currentTab]?.refresh) {
            try {
                await this.modules[currentTab].refresh();
            } catch (error) {
                console.error(`❌ Error refrescando ${currentTab}:`, error);
            }
        }
    }

    /**
     * Mostrar error crítico
     */
    showError(message, error) {
        // Crear modal de error si no existe
        let errorModal = document.getElementById('errorModal');
        if (!errorModal) {
            errorModal = this.createErrorModal();
        }

        // Actualizar contenido del error
        const errorMessage = errorModal.querySelector('#error-message');
        const errorDetails = errorModal.querySelector('#error-details');

        // Si el error es null, undefined o vacío, mostrar mensaje genérico
        if (errorMessage) errorMessage.textContent = message || 'Ocurrió un error inesperado.';
        if (errorDetails) {
            if (error === null || error === undefined || error === '' || error === 'null') {
                errorDetails.textContent = 'No hay detalles técnicos disponibles.';
            } else {
                errorDetails.textContent = error?.message || error?.toString() || String(error);
            }
        }

        // Mostrar modal solo si existe correctamente
        if (errorModal) {
            const bsModal = new bootstrap.Modal(errorModal);
            bsModal.show();
        }
    }

    /**
     * Crear modal de error dinámicamente
     */
    createErrorModal() {
        const modal = document.createElement('div');
        modal.id = 'errorModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            Error del Sistema
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Mensaje:</strong></p>
                        <p id="error-message" class="text-danger"></p>
                        <p><strong>Detalles técnicos:</strong></p>
                        <pre id="error-details" class="bg-light p-2 rounded"></pre>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Recargar Página</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Obtener información del sistema
     */
    getSystemInfo() {
        return {
            version: this.version,
            initialized: this.initialized,
            modules: Object.keys(this.modules),
            config: window.AppConfig,
            timestamp: new Date().toISOString()
        };
    }
}

// Función de inicialización global
async function initApp() {
    try {
        // Crear instancia de la aplicación
        window.app = new SistemaAlquileresApp();

        // Inicializar
        await window.app.init();

    } catch (error) {
        console.error('❌ Error fatal inicializando la aplicación:', error);

        // Mostrar error básico si no hay UI Manager
        if (typeof window.uiManager === 'undefined') {
            alert('Error crítico: No se pudo inicializar el sistema. Por favor, recarga la página.');
        }
    }
}

// Exponer funciones globales para compatibilidad
window.initApp = initApp;

// Función de utilidad global para debug
window.debugApp = () => {
    if (window.app) {
        console.table(window.app.getSystemInfo());
    } else {
        console.warn('❌ Aplicación no inicializada');
    }
};
