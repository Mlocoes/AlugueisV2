// API Service - Sistema de Aluguéis V2 - Unificado
window.apiService = {
    // CSRF token storage
    csrfToken: null,

    // Función auxiliar para obtener la URL base
    getBaseUrl() {
        // La configuración de AppConfig es la única fuente de verdad.
        // initNetwork() en config.js se encarga de la detección y el fallback.
        if (window.AppConfig && typeof window.AppConfig.getBaseURL === 'function') {
            return window.AppConfig.getBaseURL();
        }
        // Fallback muy simple si AppConfig no está listo, para evitar errores.
        return ''; 
        
        
    },

    // Función auxiliar para obtener headers con autenticación
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Agregar CSRF token si existe
        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }

        // Log de estado del authService
        if (window.authService) {
            console.log('🔍 AuthService status:', {
                isAuthenticated: window.authService.isAuthenticated(),
                hasToken: window.authService.hasToken(),
                usuario: window.authService.getUsuario(),
                authHeader: window.authService.getAuthHeader()
            });

            if (window.authService.isAuthenticated()) {
                const authHeader = window.authService.getAuthHeader();
                if (authHeader) {
                    headers.Authorization = authHeader;
                    // Remover logging de token completo por seguridad
                    // console.log('🔑 Authorization header added:', authHeader.substring(0, 20) + '...');
                }
            }
        } else {
            console.warn('⚠️ AuthService not available or not authenticated');
        }

        return headers;
    },

    // Función para obtener CSRF token
    async getCsrfToken() {
        try {
            const response = await this.get('/api/csrf-token');
            if (response && response.data && response.data.csrf_token) {
                this.csrfToken = response.data.csrf_token;
                console.log('🔒 CSRF token obtained');
                return this.csrfToken;
            }
        } catch (error) {
            console.warn('⚠️ Failed to get CSRF token:', error);
        }
        return null;
    },

    // Método para subir archivos (usado en importação de proprietários, alugueis, etc)
    async upload(endpoint, file, options = {}) {
        // Versión backup: acepta formData directamente
        const url = `${this.getBaseUrl()}${endpoint}`;
        // Si el primer parámetro es un FormData, úsalo directamente
        let formData = file;
        // Si no es FormData, crea uno (compatibilidad)
        if (!(formData instanceof FormData)) {
            formData = new FormData();
            formData.append('file', file);
        }
        const headers = this.getHeaders();
        if (headers['Content-Type']) {
            delete headers['Content-Type'];
        }
        const requestOptions = {
            method: 'POST',
            headers,
            body: formData,
            ...options
        };
        try {
            const response = await fetch(url, requestOptions);
            let responseData;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            if (!response.ok) {
                let errorMsg = '';
                if (typeof responseData === 'object') {
                    errorMsg = JSON.stringify(responseData);
                } else {
                    errorMsg = responseData;
                }
                throw new Error(errorMsg || 'Error al subir archivo');
            }
            return {
                success: true,
                data: responseData.data || responseData,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            console.error('❌ Error en upload:', error);
            return {
                success: false,
                error: error.message || error
            };
        }
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

    // Método principal para hacer peticiones
    async makeRequest(url, options) {
        try {
            console.log('🌐 API Request:', options.method, url);

            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.text();
                let errorMessage;
                try {
                    const parsedError = JSON.parse(errorData);
                    errorMessage = parsedError.detail || parsedError.message || `HTTP error! status: ${response.status}`;
                } catch {
                    errorMessage = `HTTP error! status: ${response.status}`;
                }
                
                console.error('❌ Error en la requisición:', `Error: HTTP error! status: ${response.status}, message: ${errorData}`);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
            }

            const responseData = await response.json();
            console.log('✅ API Response:', response.status, responseData);

            // Manejo de respuestas exitosas
            if (response.status >= 200 && response.status < 300) {
                return {
                    success: true,
                    data: responseData.data || responseData,
                    status: response.status,
                    statusText: response.statusText
                };
            }

            return {
                success: false,
                data: responseData,
                status: response.status,
                statusText: response.statusText
            };

        } catch (error) {
            console.error('❌ Error en la requisición:', error);
            throw error;
        }
    },

    // === MÉTODOS ESPECÍFICOS PARA PARTICIPAÇÕES ===
    async getParticipacoes(data = null) {
        let endpoint = '/api/participacoes/';
        if (data && data !== "ativo") {
            // Si data es un string (fecha), usarlo como parámetro data_registro
            if (typeof data === 'string') {
                endpoint += `?data_registro=${encodeURIComponent(data)}`;
            } else if (typeof data === 'object') {
                // Si data es un objeto, procesarlo como antes
                const params = Object.entries(data)
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                    .join('&');
                if (params) {
                    endpoint += `?${params}`;
                }
            }
        }
        const response = await this.get(endpoint);
        return response.success ? response.data : null;
    },

    async getDatasParticipacoes() {
        const response = await this.get('/api/participacoes/datas');
        return response.success ? response.data?.datas : null;
    },

    async createNovaVersaoParticipacoes(payload) {
        const response = await this.post('/api/participacoes/nova-versao', payload);
        return response;
    },

    // === MÉTODOS ESPECÍFICOS PARA PROPRIETÁRIOS ===
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

    // === MÉTODOS ESPECÍFICOS PARA IMÓVEIS ===
    async getImoveis() {
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

    // === MÉTODOS ESPECÍFICOS PARA ALUGUÉIS ===
    async getAlugueis(ano = null, mes = null) {
        let endpoint = '/api/alugueis/listar';
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
        try {
            const response = await this.get('/api/alugueis/anos-disponiveis/');
            console.log('🔍 Resposta COMPLETA do backend para anos:', response);
            
            // Verificar se a resposta tem a estrutura esperada
            if (response && response.success && response.data) {
                console.log('✅ Estrutura de resposta válida:', response.data);
                return response.data;
            } else if (response && response.anos) {
                // Fallback para resposta direta sem wrapper
                console.log('✅ Resposta direta sem wrapper:', response);
                return response;
            } else {
                console.warn('⚠️ Estrutura de resposta inesperada:', response);
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao obter anos disponíveis:', error);
            throw error;
        }
    },

    async getMesesDisponiveisAlugueis(ano) {
        try {
            const response = await this.get(`/api/alugueis/meses/${ano}`);
            console.log('🔍 Resposta COMPLETA do backend para meses:', response);
            
            // Manejar diferentes formatos de respuesta
            if (response && response.success && response.data) {
                return response.data;
            } else if (response && response.meses) {
                return response;
            } else {
                console.warn('⚠️ Estrutura de resposta inesperada para meses:', response);
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao obter meses disponíveis:', error);
            throw error;
        }
    },

    async getDistribuicaoMatrizAlugueis(ano = null, mes = null) {
        let endpoint = '/api/alugueis/distribuicao-matriz';
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
    },

    // === MÉTODOS ESPECÍFICOS PARA USUÁRIOS ===
    async getUsuarios() {
        const response = await this.get('/api/auth/usuarios');
        return response.success ? response.data : null;
    },

    async createUsuario(data) {
        const response = await this.post('/api/auth/cadastrar-usuario', data);
        return response;
    },

    async updateUsuario(id, data) {
        const response = await this.put(`/api/auth/alterar-usuario/${id}`, data);
        return response;
    },

    async deleteUsuario(id) {
        const response = await this.delete(`/api/auth/usuario/${id}`);
        return response;
    },

    // === MÉTODOS DE SISTEMA ===
    async getDashboardSummary() {
        const response = await this.get('/api/dashboard/summary');
        return response.success ? response.data : null;
    },
    async getHealth() {
        try {
            const response = await this.get('/api/health');
            return response.success ? response.data : null;
        } catch (error) {
            console.warn('Health check failed:', error);
            return null;
        }
    },

    async getConfig() {
        try {
            const response = await this.get('/api/config');
            return response.success ? response.data : null;
        } catch (error) {
            console.warn('Config retrieval failed:', error);
            return null;
        }
    }
};

// Log de inicialización
console.log('🔗 ApiService inicializado con métodos:', Object.keys(window.apiService));
console.log('🌐 Base URL configurada:', window.apiService.getBaseUrl());
