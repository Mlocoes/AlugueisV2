// API Service - Atualizado em 2025-08-21 15:30
window.apiService = {
    // Función auxiliar para obtener la URL base
    getBaseUrl() {
        if (window.AppConf    async getImoveis() {
        const response = await this.get('/api/imoveis/');
        return response.success ? response.data : null;
    },

    async getImovel(id) {
        const response = await this.get(`/api/imoveis/${id}`);
        return response.success ? response.data : null;
    },

    async createImovel(data) {
        const response = await this.post('/api/imoveis/', data);
        return response;
    },

    async updateImovel(id, data) {
        const response = await this.put(`/api/imoveis/${id}`, data);
        return response;
    },

    async deleteImovel(id) {
        const response = await this.delete(`/api/imoveis/${id}`);
        return response;
    },

    // Métodos principales para alugueiswindow.AppConfig.api && window.AppConfig.api.baseUrl) {
            return window.AppConfig.api.baseUrl;
        }
        // Fallback a localhost si no está configurado
        return 'http://localhost:8000';
    },

    // Función auxiliar para obtener headers con autenticación
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Adicionar token de autenticación si está disponible
        if (window.authService && window.authService.isAuthenticated()) {
            const authHeader = window.authService.getAuthHeader();
            console.log('🔍 AuthService status:', {
                isAuthenticated: window.authService.isAuthenticated(),
                hasToken: !!window.authService.token,
                usuario: window.authService.usuario,
                authHeader: authHeader
            });
            if (authHeader && authHeader.Authorization) {
                headers['Authorization'] = authHeader.Authorization;
                console.log('🔑 Authorization header added:', headers['Authorization'].substring(0, 20) + '...');
            }
        } else {
            console.warn('⚠️ AuthService not available or not authenticated');
        }

        return headers;
    },

    // Método genérico GET
    async get(endpoint, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'GET',
            headers: this.getHeaders(),
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método genérico POST
    async post(endpoint, data = null, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'POST',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : null,
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método genérico PUT
    async put(endpoint, data = null, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'PUT',
            headers: this.getHeaders(),
            body: data ? JSON.stringify(data) : null,
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Método genérico DELETE
    async delete(endpoint, options = {}) {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const requestOptions = {
            method: 'DELETE',
            headers: this.getHeaders(),
            ...options
        };
        return await this.makeRequest(url, requestOptions);
    },

    // Función auxiliar para hacer requisiciones autenticadas
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
            const response = await fetch(url, defaultOptions);

            // Verificar si la respuesta indica no autorizado
            if (response.status === 401) {
                console.warn('🔒 Token expirado o inválido, redirigiendo a login');
                // Token expirado o inválido, redirigir a login
                if (window.authService) {
                    window.authService.logout();
                }
                throw new Error('No autorizado - token inválido');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                console.log(`✅ API Response: ${response.status}`, data);
                return { success: true, data: data, status: response.status };
            } else {
                const text = await response.text();
                console.log(`✅ API Response: ${response.status}`, text);
                return { success: true, data: text, status: response.status };
            }
        } catch (error) {
            console.error('❌ Error en la requisición:', error);
            return { success: false, error: error.message, status: error.status || 0 };
        }
    },

    async getParticipacoes(data_registro = null) {
        let endpoint = '/api/participacoes/';
        if (data_registro) {
            endpoint += `?data_registro=${encodeURIComponent(data_registro)}`;
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async getDatasParticipacoes() {
        const response = await this.get('/api/participacoes/datas');
        return response.success ? response.data : null;
    },

    async getProprietarios() {
        const response = await this.get('/api/proprietarios/');
        return response.success ? response.data : null;
    },

    async getProprietario(id) {
        const response = await this.get(`/api/proprietarios/${id}`);
        return response.success ? response.data : null;
    },

    async createProprietario(data) {
        const response = await this.post('/api/proprietarios/', data);
        return response;
    },

    async updateProprietario(id, data) {
        const response = await this.put(`/api/proprietarios/${id}`, data);
        return response;
    },

    async deleteProprietario(id) {
        const response = await this.delete(`/api/proprietarios/${id}`);
        return response;
    },

    async getImoveis() {
        const response = await this.get('/api/imoveis/');
        return response.success ? response.data : null;
    },

    // Métodos principales para alugueis
    async getAlugueis(ano = null, mes = null) {
        let endpoint = '/api/alugueis/';
        const params = [];
        if (ano) params.push(`ano=${encodeURIComponent(ano)}`);
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (params.length > 0) {
            endpoint += `?${params.join('&')}`;
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async createAluguel(data) {
        const response = await this.post('/api/alugueis/', data);
        return response;
    },

    async updateAluguel(id, data) {
        const response = await this.put(`/api/alugueis/${id}`, data);
        return response;
    },

    async deleteAluguel(id) {
        const response = await this.delete(`/api/alugueis/${id}`);
        return response;
    },

    async getAnosDisponiveisAlugueis() {
        const response = await this.get('/api/alugueis/anos-disponiveis/');
        return response.success ? response.data : null;
    },

    async getMesesDisponiveisAlugueis(ano) {
        const response = await this.get(`/api/alugueis/meses/${ano}`);
        return response.success ? response.data : null;
    },

    async getDistribuicaoMatrizAlugueis(ano = null, mes = null) {
        let endpoint = '/api/alugueis/distribuicao';
        const params = [];
        if (ano) params.push(`ano=${encodeURIComponent(ano)}`);
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (params.length > 0) {
            endpoint += `?${params.join('&')}`;
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async getUltimoPeriodoAlugueis() {
        const response = await this.get('/api/alugueis/ultimo-periodo/');
        return response.success ? response.data : null;
    },

    async getDistribuicaoTodosMesesAlugueis(ano) {
        const response = await this.get(`/api/alugueis/distribuicao-todos-meses/?ano=${ano}`);
        return response.success ? response.data : null;
    }
};

// Log de inicialización
console.log('🔗 ApiService inicializado con métodos:', Object.keys(window.apiService));
console.log('🌐 Base URL configurada:', window.apiService.getBaseUrl());
