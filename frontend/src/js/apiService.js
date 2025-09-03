// API Service - Atualizado em 2025-08-21 15:30
window.apiService = {
    // Função auxiliar para obter cabeçalhos com autenticação
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Adicionar token de autenticação se disponível
        if (window.authService && window.authService.isAuthenticated()) {
            const authHeader = window.authService.getAuthHeader();
            if (authHeader) {
                headers['Authorization'] = authHeader;
            }
        }

        return headers;
    },

    // Função auxiliar para fazer requisições autenticadas
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);

            // Verificar se a resposta indica não autorizado
            if (response.status === 401) {
                // Token expirado ou inválido, redirecionar para login
                if (window.authService) {
                    window.authService.logout();
                }
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    },

    async getParticipacoes(data_registro = null) {
        let url = '/participacoes/';
        if (data_registro) {
            url += `?data_registro=${encodeURIComponent(data_registro)}`;
        }
        return await this.makeRequest(url);
    },

    async getDatasParticipacoes() {
        return await this.makeRequest('/participacoes/datas');
    },

    async getProprietarios() {
        return await this.makeRequest('/proprietarios/');
    },

    async getImoveis() {
        return await this.makeRequest('/imoveis/');
    },

    async getAnosDisponiveisAlugueis() {
        return await this.makeRequest('/alugueis/anos-disponiveis/');
    },

    async getMesesDisponiveisAlugueis(ano) {
        return await this.makeRequest(`/alugueis/meses/${ano}`);
    },

    async getDistribuicaoMatrizAlugueis(ano = null, mes = null) {
        let url = '/alugueis/distribuicao';
        const params = [];
        if (ano) params.push(`ano=${encodeURIComponent(ano)}`);
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        return await this.makeRequest(url);
    },

    async getUltimoPeriodoAlugueis() {
        return await this.makeRequest('/alugueis/ultimo-periodo/');
    },

    async getDistribuicaoTodosMesesAlugueis(ano) {
        return await this.makeRequest(`/alugueis/distribuicao-todos-meses/?ano=${ano}`);
    }
};
