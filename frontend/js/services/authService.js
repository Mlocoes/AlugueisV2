/**
 * Serviço de autenticação
 * Gerencia login, logout e verificação de token
 */

class AuthService {
    constructor() {
        this.token = null;
        this.usuario = null;
        this.tipo = null;
        this.tokenKey = 'sistema_alquileres_token';
        this.userKey = 'sistema_alquileres_user';

        // NÃO carregar token automaticamente - será feito pelo loginManager
        console.log('🔐 AuthService inicializado - aguardando validação manual');
    }

    /**
     * Realizar login
     */
    async login(usuario, senha) {
        try {
            // Usar ApiService para mantener consistencia con proxy
            if (!window.apiService) {
                throw new Error('ApiService não disponível');
            }
            
            const response = await window.apiService.post('/api/auth/login', {
                usuario: usuario,
                senha: senha
            });

            if (response.success && response.data) {
                const data = response.data;
                // Salvar dados de autenticação APENAS na memória da sessão
                this.token = data.access_token;
                this.usuario = data.usuario;
                this.tipo = data.tipo_usuario;  // API usa 'tipo_usuario' não 'tipo'

                console.log('🔐 Dados de login configurados:', {
                    hasToken: !!this.token,
                    tokenLength: this.token ? this.token.length : 0,
                    usuario: this.usuario,
                    tipo: this.tipo
                });

                // NÃO salvar no localStorage para forçar login a cada recarregamento
                console.log('🔐 Dados salvos apenas na sessão (não no localStorage)');

                return {
                    success: true,
                    token: this.token,
                    usuario: this.usuario,
                    tipo: this.tipo
                };
            } else {
                throw new Error(response.error || 'Erro no login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.clearSession();
            throw error;
        }
    }

    /**
     * Limpar dados da sessão
     */
    clearSession() {
        this.token = null;
        this.usuario = null;
        this.tipo = null;
    }

    /**
     * Realizar logout
     */
    logout() {
        console.log('🚪 Fazendo logout...');
        
        // Limpar dados da sessão
        this.clearSession();
        
        // Limpar localStorage caso exista algo
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
        } catch (error) {
            console.warn('Erro ao limpar localStorage:', error);
        }

        console.log('✅ Logout realizado com sucesso');
        return { success: true };
    }

    /**
     * Restaurar datos de autenticación desde localStorage
     */
    restoreFromLocalStorage() {
        try {
            const token = localStorage.getItem('token');
            const userDataString = localStorage.getItem('userData');
            
            if (token && userDataString && userDataString !== 'undefined' && userDataString !== 'null') {
                const userData = JSON.parse(userDataString);
                
                this.token = token;
                this.usuario = userData.usuario;
                this.tipo = userData.tipo;
                
                console.log('🔄 Dados restaurados do localStorage:', {
                    hasToken: !!this.token,
                    usuario: this.usuario,
                    tipo: this.tipo
                });
                
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao restaurar dados do localStorage:', error);
        }
        
        return false;
    }

    /**
     * Verificar se o usuário está autenticado
     */
    isAuthenticated() {
        const hasToken = !!this.token;
        const hasUser = !!this.usuario;
        console.log(`🔍 Verificação de autenticação: ${hasToken && hasUser ? 'Autenticado' : 'Não autenticado'}`);
        return hasToken && hasUser;
    }

    /**
     * Verificar se há token
     */
    hasToken() {
        return !!this.token;
    }

    /**
     * Obter usuário atual
     */
    getUsuario() {
        return this.usuario;
    }

    /**
     * Verificar se há dados salvos
     */
    hasSavedData() {
        try {
            return localStorage.getItem(this.tokenKey) !== null;
        } catch (error) {
            console.warn('Erro ao verificar localStorage:', error);
            return false;
        }
    }

    /**
     * Obter header de autorização
     */
    getAuthHeader() {
        if (this.token) {
            return `Bearer ${this.token}`;
        }
        return null;
    }

    /**
     * Obter headers de autorização como objeto
     */
    getAuthHeaderObject() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`
            };
        }
        return {};
    }

    /**
     * Obter dados do usuário
     */
    getUserData() {
        return {
            usuario: this.usuario,
            tipo: this.tipo,
            token: this.token
        };
    }

    /**
     * Salvar token no localStorage (não usado nesta política)
     */
    saveTokenToStorage() {
        // Intencionalmente vazio - não salvar no localStorage
        console.log('🚫 Não salvando no localStorage - política de segurança');
    }

    /**
     * Carregar token do localStorage (não usado nesta política)
     */
    loadTokenFromStorage() {
        // Intencionalmente vazio - não carregar do localStorage
        console.log('🚫 Não carregando do localStorage - política de segurança');
        return false;
    }

    /**
     * Validar token com o servidor
     */
    async validateToken() {
        try {
            if (!this.token) {
                console.log('🔍 Sem token para validar');
                return false;
            }

            if (!window.apiService) {
                console.warn('ApiService não disponível para validação');
                return false;
            }

            const response = await window.apiService.get('/api/auth/verify');
            
            if (response.success) {
                console.log('✅ Token válido');
                return true;
            } else {
                console.log('❌ Token inválido');
                this.clearSession();
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao validar token:', error);
            
            // Se for erro 401 ou 403, token é inválido
            if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
                console.log('❌ Token expirado ou inválido');
                this.clearSession();
                return false;
            }
            
            // Para outros erros (conectividade, etc), manter sessão temporariamente
            console.log('🔄 Erro de conectividade, mantendo sessão local');
            return false; // Não válido, mas não limpa sessão
        }
    }

    /**
     * Limpar storage completamente
     */
    clearStorage() {
        try {
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            console.log('🧹 Storage limpo');
        } catch (error) {
            console.warn('Erro ao limpar storage:', error);
        }
    }
}

// Inicializar serviço globalmente
window.authService = new AuthService();
