/**
 * Serviço de Autenticação
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
    }    /**
     * Realizar login
     */
    async login(usuario, senha) {
        try {
            const baseUrl = window.AppConfig?.api?.baseUrl || 'http://localhost:8000';
            const response = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: usuario,
                    senha: senha
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Usuário ou senha inválidos');
                }
                throw new Error('Erro no servidor');
            }

            const data = await response.json();

            // Salvar dados de autenticação APENAS na memória da sessão
            this.token = data.access_token;
            this.usuario = data.usuario;
            this.tipo = data.tipo_usuario;  // API usa 'tipo_usuario' não 'tipo'

            // NÃO salvar no localStorage para forçar login a cada recarregamento
            console.log('🔐 Dados salvos apenas na sessão (não no localStorage)');

            return {
                success: true,
                usuario: data.usuario,
                tipo: data.tipo_usuario  // API usa 'tipo_usuario' não 'tipo'
            };

        } catch (error) {
            console.error('Erro no login:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Realizar logout
     */
    logout() {
        this.token = null;
        this.usuario = null;
        this.tipo = null;

        // Remover do localStorage
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);

        // Recarregar página
        window.location.reload();
    }

    /**
     * Verificar se o usuário está autenticado (apenas dados em memória)
     */
    isAuthenticated() {
        const hasData = this.token !== null && this.usuario !== null;
        console.log(`🔍 Verificação de autenticação: ${hasData ? 'Autenticado' : 'Não autenticado'}`);
        return hasData;
    }

    /**
     * Verificar se há dados salvos no localStorage (sem carregá-los)
     */
    hasSavedData() {
        const token = localStorage.getItem(this.tokenKey);
        const userData = localStorage.getItem(this.userKey);
        return !!(token && userData);
    }

    /**
     * Obter token de autorização para requests
     */
    getAuthHeader() {
        if (this.token) {
            return `Bearer ${this.token}`;
        }
        return null;
    }

    /**
     * Obter dados do usuário
     */
    getUserData() {
        return {
            usuario: this.usuario,
            tipo: this.tipo
        };
    }

    /**
     * Salvar token no localStorage
     */
    saveTokenToStorage() {
        if (this.token) {
            localStorage.setItem(this.tokenKey, this.token);
            localStorage.setItem(this.userKey, JSON.stringify({
                usuario: this.usuario,
                tipo: this.tipo
            }));
        }
    }

    /**
     * Carregar token do localStorage
     */
    loadTokenFromStorage() {
        try {
            const token = localStorage.getItem(this.tokenKey);
            const userData = localStorage.getItem(this.userKey);

            if (token && userData) {
                this.token = token;
                const user = JSON.parse(userData);
                this.usuario = user.usuario;
                this.tipo = user.tipo;

                // NÃO validar automaticamente aqui - será feito pelo loginManager
                console.log('📁 Token carregado do localStorage (aguardando validação)');
            }
        } catch (error) {
            console.error('Erro ao carregar token:', error);
            this.clearStorage();
        }
    }

    /**
     * Validar se o token ainda é válido
     */
    async validateToken() {
        if (!this.token) return false;

        try {
            const baseUrl = window.AppConfig?.api?.baseUrl || 'http://localhost:8000';
            const response = await fetch(`${baseUrl}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': this.getAuthHeader()
                }
            });

            if (!response.ok) {
                this.clearStorage();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            this.clearStorage();
            return false;
        }
    }

    /**
     * Limpar dados de autenticação
     */
    clearStorage() {
        this.token = null;
        this.usuario = null;
        this.tipo = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }
}

// Criar instância global
window.authService = new AuthService();
