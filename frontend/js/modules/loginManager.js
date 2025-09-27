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
    async init() {
        // Aguardar Bootstrap
        await this.waitForBootstrap();

        // Aguardar DOM estar pronto
        if (document.readyState !== 'complete') {
            await new Promise(resolve => {
                window.addEventListener('load', resolve);
            });
        }

        // Obter elementos
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');

        if (!this.loginModal) {
            console.error('Modal de login não encontrado');
            return;
        }

        if (!this.loginForm) {
            console.error('Formulário de login não encontrado');
            return;
        }

        // Configurar event listeners
        this.setupEvents();

        // Não verificar autenticação aqui - deixar para o UnifiedApp
        console.log('LoginManager inicializado - aguardando chamadas externas');
    }

    /**
     * Aguardar Bootstrap estar disponível
     */
    async waitForBootstrap() {
        return new Promise((resolve) => {
            const checkBootstrap = () => {
                if (typeof bootstrap !== 'undefined' && typeof bootstrap.Modal !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkBootstrap, 50);
                }
            };
            checkBootstrap();
        });
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

        // Evento para Enter no campo de senha
        const senhaField = document.getElementById('senha');
        if (senhaField) {
            senhaField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }

        // Evento de abertura do modal
        if (this.loginModal) {
            // Usar o elemento HTML diretamente em vez de _element
            const modalElement = document.getElementById('loginModal');
            if (modalElement) {
                modalElement.addEventListener('shown.bs.modal', () => {
                    this.clearLoginForm();
                    const usuarioField = document.getElementById('usuario');
                    if (usuarioField) {
                        usuarioField.focus();
                    }
                });
            }
        }
    }

    /**
     * Verificar se o usuário está autenticado
     */
    async checkAuthentication() {
        try {
            // Verificar se authService está disponível
            if (!window.authService) {
                console.warn('AuthService não disponível, mostrando modal de login');
                this.showLoginModal();
                return;
            }

            // Verificar se há uma sessão válida
            const isValid = await window.authService.validateSession();
            if (isValid) {
                console.log('Sessão válida encontrada');
                return; // Não mostrar modal se já estiver autenticado
            }
        } catch (error) {
            console.warn('Erro ao verificar sessão:', error);
        }

        // Se chegou aqui, não há sessão válida - mostrar modal de login
        console.log('Nenhuma sessão válida - mostrando modal de login');
        this.showLoginModal();
    }    /**
     * Limpar todos os dados de autenticação
     */
    clearAllData() {
        if (window.authService) {
            window.authService.clearStorage();
        }
        this.clearLoginForm();
    }    /**
     * Mostrar modal de login
     */
    showLoginModal() {
        // Limpar os campos antes de mostrar o modal
        this.clearLoginForm();

        if (this.loginModal) {
            this.loginModal.show();
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
    }

    /**
     * Esconder modal de login
     */
    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    /**
     * Manipular login
     */
    async handleLogin() {
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value.trim();

        if (!usuario || !senha) {
            this.showError('Por favor, preencha todos os campos.');
            return;
        }

        this.setLoading(true);

        try {
            // Usar authService em vez de fetch direto
            const result = await window.authService.login(usuario, senha);

            if (result.success) {
                this.hideLoginModal();
                this.clearLoginForm();
                // Recarregar página para atualizar estado de autenticação
                window.location.reload();
            } else {
                this.showError('Erro no login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showError('Erro de conexão. Tente novamente.');
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
     * Definir estado de carregamento
     * @param {boolean} loading - Se está carregando
     */
    setLoading(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const loadingSpinner = document.getElementById('loadingSpinner');

        if (loginBtn) {
            loginBtn.disabled = loading;
        }
        if (loadingSpinner) {
            if (loading) {
                loadingSpinner.classList.remove('d-none');
            } else {
                loadingSpinner.classList.add('d-none');
            }
        }
    }
}

// Criar instância global
window.loginManager = new LoginManager();
