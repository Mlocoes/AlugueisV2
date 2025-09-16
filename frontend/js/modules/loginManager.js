/**
 * Gerenciador de Login
 * Controla a tela de login e a autenticação da aplicação
 */

class LoginManager {
    constructor() {
        this.loginScreen = null;
        this.loginForm = null;
        this.initialized = false;
    }

    /**
     * Inicializar o gerenciador de login
     */
    init() {
        if (this.initialized) return;

        // Obter elementos do DOM
        this.loginScreen = document.getElementById('login-screen');
        this.loginForm = document.getElementById('login-form');
        const appContainer = document.getElementById('app-container');

        // Configurar eventos
        this.setupEvents();

        // Verificar autenticación y gestionar visibilidad
        if (window.authService && window.authService.isAuthenticated()) {
            if (appContainer) appContainer.style.display = 'block';
            if (this.loginScreen) this.loginScreen.style.display = 'none';
            console.log('🔓 Usuario autenticado, mostrando app');
        } else {
            if (appContainer) appContainer.style.display = 'none';
            if (this.loginScreen) this.loginScreen.style.display = 'block';
            this.clearAllData();
            this.clearLoginForm();
            console.log('🔒 No autenticado, mostrando pantalla de login');
        }

        this.initialized = true;
    }

    /**
     * Configurar eventos do formulário
     */
    setupEvents() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Evento para Enter no formulário
        const senhaField = document.getElementById('login-senha');
        if (senhaField) {
            senhaField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
    }

    /**
     * Verificar se o usuário está autenticado
     */
    async checkAuthentication() {
        console.log('🔐 Iniciando verificação de autenticação...');

        // Sempre limpar formulário e dados ao recarregar a página
        this.clearAllData();

        // SEMPRE solicitar login, independente de tokens salvos
        console.log('🔐 Forçando novo login (política de segurança)');
        this.showLoginScreen();
    }

    /**
     * Mostrar tela de login
     */
    showLoginScreen() {
        // Sempre limpar os campos antes de mostrar a tela de login
        this.clearLoginForm();

        if (this.loginScreen) {
            this.loginScreen.style.display = '';

            // Focar no campo usuário após um delay para garantir que a tela esteja visível
            setTimeout(() => {
                const usuarioInput = document.getElementById('login-usuario');
                if (usuarioInput) usuarioInput.focus();
            }, 300);
        }

        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.style.display = 'none';
    }

    /**
     * Esconder tela de login
     */
    hideLoginScreen() {
        if (this.loginScreen) {
            this.loginScreen.style.display = 'none';
        }
        const appContainer = document.getElementById('app-container');
        if (appContainer) appContainer.style.display = '';
    }

    /**
     * Limpar todos os dados de autenticação
     */
    clearAllData() {
        console.log('🧹 Limpando todos os dados de autenticação');
        if (window.authService) {
            window.authService.clearStorage();
        }
        this.clearLoginForm();
    }

    /**
     * Limpar formulário de login
     */
    clearLoginForm() {
        const usuarioField = document.getElementById('login-usuario');
        const senhaField = document.getElementById('login-senha');
        const errorDiv = document.getElementById('login-alert');

        if (usuarioField) {
            usuarioField.value = '';
        }
        if (senhaField) {
            senhaField.value = '';
        }
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }

        console.log('🧹 Campos de login limpos');
    }

    /**
     * Processar tentativa de login
     */
    async handleLogin() {
        const usuario = document.getElementById('login-usuario').value.trim();
        const senha = document.getElementById('login-senha').value;
        const errorDiv = document.getElementById('login-alert');
        const submitBtn = document.getElementById('login-submit');

        // Validar campos
        if (!usuario || !senha) {
            this.showError('Por favor, preencha todos os campos');
            return;
        }

        // Mostrar loading
        this.setLoading(true);
        this.hideError();

        try {
            // Realizar login
            const result = await window.authService.login(usuario, senha);

            if (result.success) {
                // Login bem-sucedido solo en memoria
                this.onLoginSuccess();
            } else {
                // Erro no login
                this.showError(result.error || 'Erro desconhecido');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro de conexão com o servidor');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Ações após login bem-sucedido
     */
    onLoginSuccess() {
        // Esconder tela de login
        this.hideLoginScreen();

        // Atualizar interface com dados do usuário
        this.updateUserInterface();

        // Inicializar ExtrasManager SOLO después de login exitoso
        // Inicializar navegador unificado (menú lateral) tras login exitoso
        if (window.unifiedNavigator && typeof window.unifiedNavigator.init === 'function') {
            window.unifiedNavigator.init();
            console.log('✅ Navegador unificado inicializado após login');
        } else {
            console.warn('⚠️ Navegador unificado não disponível para inicializar após login');
        }

        // Inicializar Dashboard SOLO depois de login exitoso
        // Inicializar Dashboard ANTES del login, disponible globalmente
        if (!window.dashboardModule) {
            window.dashboardModule = new DashboardModule();
            console.log('✅ DashboardModule instanciado antes del login');
        }
        // Después del login, solo cargar datos y navegar
        (async () => {
            let retries = 0;
            while ((!window.dashboardModule || typeof window.dashboardModule.load !== 'function') && retries < 10) {
                await new Promise(res => setTimeout(res, 100));
                retries++;
            }
            if (window.dashboardModule && typeof window.dashboardModule.load === 'function') {
                await window.dashboardModule.load();
                if (window.viewManager && typeof window.viewManager.showView === 'function') {
                    await window.viewManager.showView('dashboard');
                }
            } else {
                console.error('❌ No se pudo inicializar dashboardModule tras login');
            }
        })();

        // Inicializar app principal SOLO depois de login exitoso
        if (!window.app) {
            if (typeof window.initApp === 'function') {
                window.initApp();
                console.log('✅ SistemaAlugueisApp inicializado após login');
            } else {
                window.app = new SistemaAlugueisApp();
                window.app.init();
                console.log('✅ SistemaAlugueisApp instanciado após login');
            }
        }

        // ...existing code...
        
            // Limpiar instancia de dashboard al cerrar sesión
            window.addEventListener('logout', () => {
                if (window.dashboardModule) {
                    window.dashboardModule = null;
                    console.log('🧹 DashboardModule eliminado tras logout');
                }
            });

        // Permitir inicialização da aplicação
        this.enableApplication();

        // Atualizar visibilidade da navegação baseada nos permissos
        if (window.uiManager) {
            window.uiManager.updateImportTabVisibility();
            window.uiManager.updateActionButtonsVisibility();
        }
    }

    /**
     * Atualizar interface com dados do usuário
     */
    updateUserInterface() {
        const userData = window.authService.getUserData();

        // Atualizar header com info do usuário (se existir)
        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            SecurityUtils.setSafeHTML(userInfo, `
                <i class="fas fa-user me-2"></i>
                ${SecurityUtils.escapeHtml(userData.usuario)} (${SecurityUtils.escapeHtml(userData.tipo)})
                <button class="btn btn-sm btn-outline-light ms-2" onclick="loginManager.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `);
        }
    }

    /**
     * Habilitar funcionalidade da aplicação
     */
    enableApplication() {
        console.log('🚀 Habilitando aplicação após login válido...');

        // Remover classe de desabilitado se existir
        document.body.classList.remove('app-disabled');

        // Inicializar aplicação principal se ainda não foi
        if (window.app) {
            if (!window.app.initialized) {
                console.log('✅ Iniciando aplicação principal...');
                window.app.init().then(() => {
                    console.log('✅ APLICAÇÃO INICIADA EXITOSAMENTE');
                }).catch(error => {
                    console.error('❌ ERRO AO INICIAR APLICAÇÃO:', error);
                });
            } else {
                console.log('ℹ️ Aplicação já foi inicializada');
            }
        } else {
            console.error('❌ window.app não está disponível');
        }
    }

    /**
     * Realizar logout
     */
    logout() {
        if (confirm('Tem certeza que deseja sair?')) {
            console.log('🚪 Realizando logout...');

            // Limpar dados de autenticação
            if (window.authService) {
                window.authService.clearStorage();
            }

            // Limpar formulário
            this.clearLoginForm();

            // Recarregar página para forçar novo login
            window.location.reload();
        }
    }

    /**
     * Mostrar erro no formulário
     */
    showError(message) {
        const errorDiv = document.getElementById('login-alert');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = '';
        }
    }

    /**
     * Esconder erro do formulário
     */
    hideError() {
        const errorDiv = document.getElementById('login-alert');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Configurar estado de loading
     */
    setLoading(loading) {
        const submitBtn = document.getElementById('login-submit');
        const usuarioField = document.getElementById('login-usuario');
        const senhaField = document.getElementById('login-senha');

        if (loading) {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Entrando...';
            }
            if (usuarioField) usuarioField.disabled = true;
            if (senhaField) senhaField.disabled = true;
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Entrar';
            }
            if (usuarioField) usuarioField.disabled = false;
            if (senhaField) senhaField.disabled = false;
        }
    }
}

// Criar instância global
window.loginManager = new LoginManager();
