/**
 * Gerenciador de Login
 * Controla o modal de login e a autenticação da aplicação
 */

class LoginManager {
    constructor() {
        this.loginModal = null;
        this.loginForm = null;
        this.initialized = false;
    }

    /**
     * Inicializar o gerenciador de login
     */
    init() {
        if (this.initialized) return;

        // Obter elementos do DOM
        this.loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        this.loginForm = document.getElementById('loginForm');

        // Configurar eventos
        this.setupEvents();

        // Verificar se o usuário já está autenticado
        this.checkAuthentication();

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
        const senhaField = document.getElementById('senha');
        if (senhaField) {
            senhaField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        // Evento de abertura do modal para garantir limpeza
        const modalElement = document.getElementById('loginModal');
        if (modalElement) {
            modalElement.addEventListener('shown.bs.modal', () => {
                console.log('🔧 Modal aberto, forçando limpeza dos campos');
                this.clearLoginForm();
                document.getElementById('usuario').focus();
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
        this.showLoginModal();
    }    /**
     * Limpar todos os dados de autenticação
     */
    clearAllData() {
        console.log('🧹 Limpando todos os dados de autenticação');
        if (window.authService) {
            window.authService.clearStorage();
        }
        this.clearLoginForm();
    }    /**
     * Mostrar modal de login
     */
    showLoginModal() {
        // Sempre limpar os campos antes de mostrar o modal
        this.clearLoginForm();

        if (this.loginModal) {
            this.loginModal.show();

            // Focar no campo usuário após um delay para garantir que o modal esteja visível
            setTimeout(() => {
                document.getElementById('usuario').focus();
            }, 500);
        }
    }

    /**
     * Limpar formulário de login
     */
    clearLoginForm() {
        const usuarioField = document.getElementById('usuario');
        const senhaField = document.getElementById('senha');
        const errorDiv = document.getElementById('loginError');

        if (usuarioField) {
            usuarioField.value = '';
        }
        if (senhaField) {
            senhaField.value = '';
        }
        if (errorDiv) {
            errorDiv.classList.add('d-none');
        }

        console.log('🧹 Campos de login limpos');
    }

    /**
     * Esconder modal de login
     */
    hideLoginModal() {
        if (this.loginModal) {
            this.loginModal.hide();
        }
    }

    /**
     * Processar tentativa de login
     */
    async handleLogin() {
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value;
        const errorDiv = document.getElementById('loginError');
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');

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
                // Login bem-sucedido
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
        // Esconder modal
        this.hideLoginModal();

        // Atualizar interface com dados do usuário
        this.updateUserInterface();

        // Permitir inicialização da aplicação
        this.enableApplication();

        // Atualizar visibilidade da navegação baseada nos permissos
        if (window.uiManager) {
            window.uiManager.updateImportTabVisibility();
            window.uiManager.updateActionButtonsVisibility();
        }

        // Mostrar mensagem de bienvenida
        const userData = window.authService.getUserData();
        // ...existing code...
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
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('d-none');
        }
    }

    /**
     * Esconder erro do formulário
     */
    hideError() {
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.classList.add('d-none');
        }
    }

    /**
     * Configurar estado de loading
     */
    setLoading(loading) {
        const submitBtn = this.loginForm.querySelector('button[type="submit"]');
        const inputs = this.loginForm.querySelectorAll('input');

        if (loading) {
            submitBtn.disabled = true;
            SecurityUtils.setSafeHTML(submitBtn, '<i class="fas fa-spinner fa-spin me-2"></i>Entrando...');
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            SecurityUtils.setSafeHTML(submitBtn, '<i class="fas fa-sign-in-alt me-2"></i>Entrar');
            inputs.forEach(input => input.disabled = false);
        }
    }
}

// Criar instância global
window.loginManager = new LoginManager();
