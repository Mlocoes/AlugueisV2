/**
 * Serviço de autenticação Refatorado
 * Gerencia a sessão do usuário, dependendo de um cookie HttpOnly seguro.
 */
class AuthService {
    constructor() {
        this.usuario = null;
        this.tipo = null;
        this.token = null;  // Add token property
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
                this.token = data.access_token;  // Armazenar o token

                console.log('🔐 Login bem-sucedido. Sessão do usuário estabelecida:', {
                    usuario: this.usuario,
                    tipo: this.tipo
                });

                // Iniciar validação periódica da sessão
                this.startSessionValidation();

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
        this.token = null;  // Clear token
        
        // Parar validação periódica da sessão
        this.stopSessionValidation();
        
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
        // Primeiro verificar se há dados na memória
        if (!this.usuario || !this.token) {
            console.log(`🔍 Verificação de autenticação: Não autenticado (sem dados)`);
            return false;
        }
        
        // Verificar se o token está expirado
        if (this.isTokenExpired()) {
            console.log(`🔍 Verificação de autenticação: Token expirado`);
            this.clearSession();
            return false;
        }
        
        console.log(`🔍 Verificação de autenticação: Autenticado`);
        return true;
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
                this.tipo = response.data.tipo_usuario;
                console.log('✅ Sessão válida. Usuário:', this.usuario);
                return true;
            } else {
                console.log('❌ Sessão inválida ou expirada.');
                this.clearSession();
                return false;
            }
        } catch (error) {
            // Verificar se é erro 401 (não autorizado) - caso normal quando não há sessão
            if (error.message.includes('status: 401')) {
                console.log('🔒 Nenhuma sessão ativa encontrada (401 Unauthorized) - usuário precisa fazer login.');
                this.clearSession();
                return false;
            }
            
            console.warn('⚠️ Erro ao validar a sessão, provavelmente problema de rede.', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * Iniciar validação periódica da sessão
     */
    startSessionValidation() {
        // Verificar a cada 5 minutos se a sessão ainda é válida
        this.sessionCheckInterval = setInterval(async () => {
            if (this.isAuthenticated()) {
                console.log('🔄 Verificação periódica da sessão...');
                const isValid = await this.validateSession();
                if (!isValid) {
                    console.warn('⚠️ Sessão expirada durante verificação periódica. Forçando recarga.');
                    window.location.reload();
                }
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Parar validação periódica da sessão
     */
    stopSessionValidation() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
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

    /**
     * Obter cabeçalho de autorização para requisições
     */
    getAuthHeader() {
        if (this.token) {
            return `Bearer ${this.token}`;
        }
        return null;
    }

    /**
     * Obter objeto de cabeçalho de autorização para requisições
     */
    getAuthHeaderObject() {
        if (this.token) {
            return { 'Authorization': `Bearer ${this.token}` };
        }
        return {};
    }

    /**
     * Verificar se o token JWT está expirado
     */
    isTokenExpired() {
        if (!this.token) return true;
        
        try {
            // Decodificar o payload do JWT (formato: header.payload.signature)
            const payload = this.token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            
            // Verificar se o token tem expiração
            if (!decodedPayload.exp) return false; // Token sem expiração
            
            // Comparar com o tempo atual (em segundos)
            const currentTime = Math.floor(Date.now() / 1000);
            return decodedPayload.exp < currentTime;
        } catch (error) {
            console.warn('Erro ao verificar expiração do token:', error);
            return true; // Considerar expirado se não conseguir verificar
        }
    }
}

// Inicializar serviço globalmente
window.authService = new AuthService();