/**
 * Serviço de autenticação Refatorado
 * Gerencia a sessão do usuário, dependendo de um cookie HttpOnly seguro.
 */
class AuthService {
    constructor() {
        this.usuario = null;
        this.tipo = null;
        console.log('🔐 AuthService inicializado para autenticação baseada em cookie.');
    }

    /**
     * Realizar login. O backend definirá o cookie HttpOnly.
     */
    async login(usuario, senha) {
        try {
            if (!window.apiService) {
                throw new Error('ApiService não disponível');
            }
            
            const response = await window.apiService.post('/api/auth/login', {
                usuario: usuario,
                senha: senha
            });

            if (response.success && response.data) {
                const data = response.data;
                this.usuario = data.usuario;
                this.tipo = data.tipo_usuario;

                console.log('🔐 Login bem-sucedido. Sessão do usuário estabelecida:', {
                    usuario: this.usuario,
                    tipo: this.tipo
                });

                return {
                    success: true,
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
     * Limpar dados da sessão do usuário na memória.
     */
    clearSession() {
        this.usuario = null;
        this.tipo = null;
        console.log('🧹 Sessão do usuário limpa na memória.');
    }

    /**
     * Limpar storage local (compatibilidade)
     */
    clearStorage() {
        try {
            localStorage.removeItem('sistema_alquileres_token');
            localStorage.removeItem('sistema_alquileres_user');
            console.log('🧹 Storage local limpo.');
        } catch (error) {
            console.warn('Erro ao limpar localStorage:', error);
        }
    }

    /**
     * Realizar logout. Chama o endpoint do backend para limpar o cookie.
     */
    async logout() {
        console.log('🚪 Fazendo logout...');
        try {
            // Chamar o backend para limpar o cookie HttpOnly
            await window.apiService.post('/api/auth/logout');
        } catch (error) {
            console.error('Erro ao fazer logout no servidor, limpando a sessão local de qualquer maneira.', error);
        } finally {
            // Sempre limpar a sessão local
            this.clearSession();
            console.log('✅ Logout realizado com sucesso.');
        }
        return { success: true };
    }

    /**
     * Verifica se o usuário está autenticado na memória.
     */
    isAuthenticated() {
        const authenticated = !!this.usuario;
        console.log(`🔍 Verificação de autenticação: ${authenticated ? 'Autenticado' : 'Não autenticado'}`);
        return authenticated;
    }

    /**
     * Obtém dados do usuário.
     */
    getUserData() {
        if (!this.isAuthenticated()) {
            return null;
        }
        return {
            usuario: this.usuario,
            tipo: this.tipo
        };
    }

    /**
     * Valida a sessão atual com o servidor.
     * O navegador enviará o cookie HttpOnly automaticamente.
     */
    async validateSession() {
        try {
            console.log('🔍 Validando sessão com o servidor...');
            const response = await window.apiService.get('/api/auth/verify');
            
            if (response.success && response.data.valid) {
                // Sincronizar dados do usuário caso tenham mudado
                this.usuario = response.data.usuario;
                this.tipo = response.data.tipo;
                console.log('✅ Sessão válida. Usuário:', this.usuario);
                return true;
            } else {
                console.log('❌ Sessão inválida ou expirada.');
                this.clearSession();
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Erro ao validar a sessão, provavelmente expirada ou problema de rede.', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * Verificar se o usuário é administrador
     */
    isAdmin() {
        return this.tipo === 'administrador';
    }

    /**
     * Obter tipo do usuário
     */
    getUserType() {
        return this.tipo;
    }
}

// Inicializar serviço globalmente
window.authService = new AuthService();