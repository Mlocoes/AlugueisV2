/**
 * Aplicação principal do Sistema de Aluguéis V2 Otimizado
 * Ponto de entrada e coordenador de todos os módulos
 */

class SistemaAlugueisApp {
    constructor() {
        this.initialized = false;
        this.modules = {};
        this.version = '2.1.0';
    }

    /**
     * Inicializar a aplicação
     */
    async init() {
        try {
            console.log(`🚀 Inicializando Sistema de Aluguéis V${this.version}...`);

            // Inicializar configuração de rede
            await this.initializeNetwork();

                        // Configurar interceptor global para accesibilidad
            this.setupGlobalAccessibilityInterceptor();

            // Verificar dependências requeridas
            if (!this.checkDependencies()) {
                throw new Error('Faltam dependências requeridas');
            }

            // Verificar conexão com o backend
                // Inicializar view manager antes de cualquier navegación
                if (window.viewManager && typeof window.viewManager.init === 'function') {
                    window.viewManager.init();
                    console.log('✅ ViewManager inicializado antes de login/navegación');
                } else {
                    console.warn('⚠️ ViewManager no disponible para inicializar');
                }
            await this.checkBackendConnection();

            // Inicializar módulos
            await this.initializeModules();

            // Configurar eventos globais
            this.setupGlobalEvents();

            // Delegar gestión de autenticación y visibilidad a loginManager
            if (window.loginManager && typeof window.loginManager.init === 'function') {
                window.loginManager.init();
                console.log('🔒 Gestión de login y visibilidad delegada a loginManager');
            } else {
                // Fallback: mostrar login si no existe loginManager
                document.getElementById('app-container').style.display = 'none';
                document.getElementById('login-screen').style.display = 'block';
                console.warn('⚠️ loginManager no disponible, mostrando login por fallback');
            }

            this.initialized = true;
            console.log('✅ Sistema de Aluguéis inicializado corretamente');

        } catch (error) {
            console.error('❌ Erro inicializando a aplicação:', error);
            this.showError('Erro crítico ao inicializar o sistema', error);
        }
    }

    /**
     * Configurar interceptor global para prevenir problemas de accesibilidad
     */
    setupGlobalAccessibilityInterceptor() {
        // Solución simple: solo loggear para debug
        console.log('🔒 Sistema de accesibilidad simplificado iniciado');
    }

    /**
     * Verificar dependências requeridas
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
            console.error('❌ Dependências faltantes:', missing.map(d => d.name));
            return false;
        }

        console.log('✅ Todas as dependências verificadas');
        console.log('📊 Chart.js versão:', Chart.version);
        return true;
    }

    /**
     * Inicializar configuração de rede e detectar IP do servidor
     */
    async initializeNetwork() {
        try {
            console.log('🌐 Inicializando configuração de rede...');

            // Esperar que AppConfig esteja disponível (máximo 2 segundos)
            let attempts = 0;
            const maxAttempts = 20;
            while (!window.AppConfig && attempts < maxAttempts) {
                console.log(`⏳ Esperando AppConfig... tentativa ${attempts + 1}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.AppConfig) {
                console.error('❌ window.AppConfig não pôde ser carregado após esperar');
                return;
            }

            // DESABILITADO: Usar detecção automática - sempre usar proxy nginx
            console.log('🌐 Usando proxy nginx - configuração automática de URL desabilitada');
            console.log(`� BaseURL atual: ${window.AppConfig.getBaseURL()}`);
            
            // Não modificar baseUrl - manter a configuração de proxy nginx
        } catch (error) {
            console.warn('⚠️ Erro na configuração de rede, mantendo configuração de proxy:', error);
            // Não fazer fallback para IPs diretos - manter proxy nginx
        }
    }    /**
     * Verificar conexão com o backend
     */
    async checkBackendConnection() {
        try {
            const health = await window.apiService.getHealth();
            console.log('✅ Backend conectado:', health);

            // Atualizar indicador de conexão
            const indicator = document.querySelector('.navbar-text');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-circle text-success me-1"></i>Conectado';
            }

            return true;
        } catch (error) {
            console.error('❌ Backend não disponível:', error);

            // Atualizar indicador de conexão
            const indicator = document.querySelector('.navbar-text');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-circle text-danger me-1"></i>Desconectado';
            }

            throw new Error('Backend não disponível');
        }
    }

    /**
     * Inicializar módulos da aplicação
     */
    async initializeModules() {
        console.log('📦 Inicializando módulos...');

        // Instanciar DashboardModule ANTES del login
        if (typeof window.DashboardModule !== 'undefined') {
            this.modules.dashboard = new window.DashboardModule();
            window.dashboardModule = this.modules.dashboard;
            console.log('✅ Módulo Dashboard criado');
        }

        if (typeof ProprietariosModule !== 'undefined') {
            this.modules.proprietarios = new ProprietariosModule();
            window.proprietariosModule = this.modules.proprietarios;
            window.proprietariosModule.load(); // Call load() method
            console.log('✅ Módulo Proprietarios criado e carregado');
        }

        if (typeof ImoveisModule !== 'undefined') {
            this.modules.imoveis = new ImoveisModule();
            window.imoveisModule = this.modules.imoveis;
            console.log('✅ Módulo Imoveis criado');
        }

        if (typeof ParticipacoesModule !== 'undefined') {
            this.modules.participacoes = new ParticipacoesModule();
            window.participacoesModule = this.modules.participacoes;
            console.log('✅ Módulo Participacoes criado');
        }

        if (typeof ImportacaoModule !== 'undefined') {
            // Inicializar ImportacaoModule apenas ao acessar a tela importar
            // Instanciação movida para UI Manager
        }

        if (typeof AlugueisModule !== 'undefined') {
            this.modules.alugueis = new AlugueisModule();
            window.alugueisModule = this.modules.alugueis;
            console.log('✅ Módulo Alugueis criado');
        }

        if (typeof window.usuarioManager !== 'undefined') {
            window.usuarioManager.init();
            console.log('✅ Módulo UsuarioManager inicializado');
        }

        

        if (typeof ExtrasManager !== 'undefined') {
            // Inicializar ExtrasManager apenas ao acessar a tela extras
            // Instanciação movida para UI Manager
        }

        console.log('✅ Módulos inicializados:', Object.keys(this.modules));
    }

    /**
     * Configurar eventos globais
     */
    setupGlobalEvents() {
        // Event listener para o documento
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM completamente carregado');
        });

        // Event listener para erros globais
        window.addEventListener('error', (event) => {
            if (typeof logToLocalStorage === 'function') {
                logToLocalStorage('[GLOBAL ERROR]', {
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error ? event.error.stack : null
                });
            }
            let errorMsg = 'Erro desconhecido';
            if (event.error && event.error.message) {
                errorMsg = event.error.message;
            } else if (typeof event.error === 'string') {
                errorMsg = event.error;
            } else if (event.message) {
                errorMsg = event.message;
            }
            console.error('❌ Erro global capturado:', errorMsg);
            this.showError('Erro inesperado', errorMsg);
        });

        // Event listener para promessas rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            if (typeof logToLocalStorage === 'function') {
                logToLocalStorage('[GLOBAL UNHANDLEDREJECTION]', {
                    reason: event.reason,
                    promise: event.promise
                });
            }
            console.error('❌ Promessa rejeitada:', event.reason);
            this.showError('Erro de promessa não tratada', event.reason);
        });

        // Event listener para visibilidade da página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.initialized) {
                console.log('👁️ Página visível - atualizando dados');
                this.refreshCurrentTab();
            }
        });

        // Configurar gestão de aria-hidden para modales (acessibilidade)
        this.setupModalAccessibility();
    }

    /**
     * Configurar acessibilidade para modales
     */
    setupModalAccessibility() {
        // Solución simple: dejar que Bootstrap maneje todo normalmente
        console.log('✅ Sistema de modales simplificado iniciado');
    }

    /**
     * Carregar aba inicial
     */
    loadInitialTab() {
    // No cargar ninguna pestaña automáticamente, esperar login exitoso
    console.log('⏸️ Carga de aba inicial bloqueada hasta login exitoso');
    }

    /**
     * Atualizar dados da aba atual
     */
    async refreshCurrentTab() {
        const currentTab = window.uiManager?.currentTab;
        if (currentTab && this.modules[currentTab]?.refresh) {
            try {
                await this.modules[currentTab].refresh();
            } catch (error) {
                console.error(`❌ Erro atualizando ${currentTab}:`, error);
            }
        }
    }

    /**
     * Mostrar erro crítico
     */
    showError(message, error) {
        // Criar modal de erro se não existir
        let errorModal = document.getElementById('errorModal');
        if (!errorModal) {
            errorModal = this.createErrorModal();
        }

        // Atualizar conteúdo do erro
        const errorMessage = errorModal.querySelector('#error-message');
        const errorDetails = errorModal.querySelector('#error-details');

        // Se o erro for nulo, indefinido ou vazio, mostrar mensagem genérica
        if (errorMessage) errorMessage.textContent = message || 'Ocorreu um erro inesperado.';
        if (errorDetails) {
            if (error === null || error === undefined || error === '' || error === 'null') {
                errorDetails.textContent = 'Não há detalhes técnicos disponíveis.';
            } else {
                errorDetails.textContent = error?.message || error?.toString() || String(error);
            }
        }

        // Mostrar modal apenas se existir corretamente
        if (errorModal) {
            const bsModal = new bootstrap.Modal(errorModal);
            bsModal.show();
        }
    }

    /**
     * Criar modal de erro dinamicamente
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
                            Erro do Sistema
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Mensagem:</strong></p>
                        <p id="error-message" class="text-danger"></p>
                        <p><strong>Detalhes técnicos:</strong></p>
                        <pre id="error-details" class="bg-light p-2 rounded"></pre>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Recarregar Página</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    /**
     * Obter informações do sistema
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

// Função de inicialização global
async function initApp() {
    try {
        // Criar instância da aplicação
        window.app = new SistemaAlugueisApp();

        // Inicializar
        await window.app.init();

    } catch (error) {
        console.error('❌ Erro fatal inicializando a aplicação:', error);

        // Mostrar erro básico se não houver UI Manager
        if (typeof window.uiManager === 'undefined') {
            alert('Erro crítico: Não foi possível inicializar o sistema. Por favor, recarregue a página.');
        }
    }
}

// Expor funções globais para compatibilidade
window.initApp = initApp;

// Função de utilidade global para debug
window.debugApp = () => {
    if (window.app) {
        console.table(window.app.getSystemInfo());
    } else {
        console.warn('❌ Aplicação não inicializada');
    }
};
