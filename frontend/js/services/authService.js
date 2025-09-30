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
        
        // Tentar restaurar sessão do cookie quando a página carrega
        this.restoreSession();
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

                // Iniciar validação periódica da sessão (se não já estiver rodando)
                if (!this.sessionCheckInterval) {
                    this.startSessionValidation();
                }

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
            return false;
        }
        
        // Verificar se o token está expirado
        if (this.isTokenExpired()) {
            this.clearSession();
            // Forçar recarga imediata quando detectar token expirado
            setTimeout(() => {
                window.location.reload();
            }, 100);
            return false;
        }
        
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
     * Tentar restaurar sessão do cookie quando a página carrega
     */
    async restoreSession() {
        try {
            console.log('🔄 Tentando restaurar sessão do cookie...');
            
            // Verificar se há uma sessão válida no backend (usando cookie)
            const isValid = await this.validateSession();
            if (isValid) {
                console.log('✅ Sessão restaurada com sucesso do cookie');
                // Iniciar validação periódica
                this.startSessionValidation();
            } else {
                console.log('❌ Nenhuma sessão válida encontrada no cookie');
            }
        } catch (error) {
            console.warn('Erro ao restaurar sessão:', error);
        }
    }

    /**
     * Iniciar validação periódica da sessão
     */
    startSessionValidation() {
        // Verificar a cada 2 minutos se a sessão ainda é válida (mais frequente)
        this.sessionCheckInterval = setInterval(async () => {
            console.log('🔄 Verificação periódica da sessão...');
            if (this.usuario && this.token) {
                // Primeiro verificar se o token local está expirado
                if (this.isTokenExpired()) {
                    console.warn('⚠️ Token expirado detectado na validação periódica. Forçando recarga.');
                    this.clearSession();
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                    return;
                }
                
                // Se token local parece válido, validar com servidor
                try {
                    const isValid = await this.validateSession();
                    if (!isValid) {
                        console.warn('⚠️ Sessão inválida detectada na validação periódica. Forçando recarga.');
                        setTimeout(() => {
                            window.location.reload();
                        }, 100);
                    } else {
                        console.log('✅ Sessão válida confirmada pelo servidor');
                    }
                } catch (error) {
                    console.warn('⚠️ Erro na validação periódica da sessão:', error);
                    // Em caso de erro, assumir que a sessão pode estar expirada
                    this.clearSession();
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                }
            }
        }, 2 * 60 * 1000); // 2 minutos (mais frequente)
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
        if (!this.token) {
            return true;
        }
        
        try {
            // Decodificar o payload do JWT (formato: header.payload.signature)
            const payload = this.token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            
            // Verificar se o token tem expiração
            if (!decodedPayload.exp) {
                return false; // Token sem expiração
            }
            
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