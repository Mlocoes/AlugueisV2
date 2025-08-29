/**
 * Serviço de Autenticação - Versão Móvil
 * Sistema de Alquileres V2
 */

class MobileAuthService {
    constructor() {
        this.token = null;
        this.usuario = null;
        this.tipo = null;
        this.config = window.MobileConfig;
    }

    /**
     * Realizar login
     */
    async login(usuario, senha) {
        try {
            showLoading(true);

            const response = await fetch(`${this.config.api.baseUrl}/auth/login`, {
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

            // Salvar dados na sessão
            this.token = data.access_token;
            this.usuario = data.usuario;
            this.tipo = data.tipo_usuario;

            // Salvar também no localStorage para persistência
            localStorage.setItem(this.config.storage.tokenKey, this.token);
            localStorage.setItem(this.config.storage.userKey, JSON.stringify({
                usuario: this.usuario,
                tipo: this.tipo
            }));

            console.log('📱 Login realizado com sucesso:', this.usuario);

            return {
                success: true,
                usuario: this.usuario,
                tipo: this.tipo
            };

        } catch (error) {
            console.error('Erro no login:', error);
            return {
                success: false,
                error: error.message
            };
        } finally {
            showLoading(false);
        }
    }

    /**
     * Verificar se está autenticado
     */
    isAuthenticated() {
        return this.token !== null && this.usuario !== null;
    }

    /**
     * Carregar dados do localStorage
     */
    loadFromStorage() {
        try {
            const token = localStorage.getItem(this.config.storage.tokenKey);
            const userData = localStorage.getItem(this.config.storage.userKey);

            if (token && userData) {
                this.token = token;
                const user = JSON.parse(userData);
                this.usuario = user.usuario;
                this.tipo = user.tipo;
                return true;
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.clearStorage();
        }
        return false;
    }

    /**
     * Validar token
     */
    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(`${this.config.api.baseUrl}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
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
     * Obter cabeçalho de autorização
     */
    getAuthHeader() {
        if (this.token) {
            return {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            };
        }
        return {
            'Content-Type': 'application/json'
        };
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
     * Fazer logout
     */
    logout() {
        this.clearStorage();
        location.reload();
    }

    /**
     * Limpar dados
     */
    clearStorage() {
        this.token = null;
        this.usuario = null;
        this.tipo = null;
        localStorage.removeItem(this.config.storage.tokenKey);
        localStorage.removeItem(this.config.storage.userKey);
    }
}

// Instância global
window.mobileAuth = new MobileAuthService();
