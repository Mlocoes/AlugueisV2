// ...existing code...
/**
 * Serviço API centralizado
 * Gerencia todas as comunicações com o backend
 */

class ApiService {
    // Participações - Datas disponíveis
    async getDatasParticipacoes() {
        const config = this.getConfig();
        const resp = await this.get(config.endpoints.participacoes + 'datas');
        // Normaliza para sempre retornar { success, datas }
        if (resp && Array.isArray(resp.datas)) {
            return { success: resp.success, datas: resp.datas };
        }
        if (resp && Array.isArray(resp.data)) {
            return { success: resp.success, datas: resp.data };
        }
        // Se vier como { success: true, ... } e o array está em outra propriedade
        if (resp && resp.success && Array.isArray(resp)) {
            return { success: true, datas: resp };
        }
        // Se vier como { success: true, ... } e o array está em resp.data.datas
        if (resp && resp.success && resp.data && Array.isArray(resp.data.datas)) {
            return { success: true, datas: resp.data.datas };
        }
        // Se vier como { success: true, ... } e o array está em resp.data
        if (resp && resp.success && Array.isArray(resp.data)) {
            return { success: true, datas: resp.data };
        }
        return { success: false, datas: [], error: 'Formato inesperado da resposta do servidor.' };
    }
    // Aluguéis - Distribuição Matriz
    async getDistribuicaoMatrizAlugueis(ano = null, mes = null) {
        const config = this.getConfig();
        let endpoint = config.endpoints.alugueis + 'distribuicao-matriz/';
        const params = [];
        if (ano) params.push(`ano=${ano}`);
        if (mes) params.push(`mes=${mes}`);
        if (params.length) endpoint += '?' + params.join('&');
        return this.get(endpoint);
    }

    // Aluguéis - Anos disponíveis
    async getAnosDisponiveisAlugueis() {
        const config = this.getConfig();
        return this.get(config.endpoints.alugueis + 'anos-disponiveis/');
    }
    constructor() {
        // Não inicializar aqui, obter dinamicamente
    }

    /**
     * Obter configuração atual
     */
    getConfig() {
        return {
            baseUrl: window.AppConfig?.api?.baseUrl || '',
            endpoints: window.AppConfig?.api?.endpoints || {
                proprietarios: '/api/proprietarios/',
                imoveis: '/api/imoveis/',
                alugueis: '/api/alugueis/',
                participacoes: '/api/participacoes/',
                relatorios: '/api/reportes/',
                distribuicoes: '/api/distribuicoes/',
                extras: '/api/extras/',
                transferencias: '/api/transferencias/',
                health: '/api/health',
                auth: '/api/auth/'
            }
        };
    }

    /**
     * Realizar requisição HTTP genérica
     */
    async request(endpoint, options = {}) {
        const config = this.getConfig();
        const url = `${config.baseUrl}${endpoint}`;

        // Preparar headers com autenticação
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Adicionar token de autenticação se disponível
        if (window.authService && window.authService.isAuthenticated()) {
            const authHeader = window.authService.getAuthHeader();
            if (authHeader && authHeader.Authorization) {
                headers['Authorization'] = authHeader.Authorization;
            }
        }

        const requestConfig = {
            headers,
            ...options
        };

        try {
            console.log(`🌐 API Request: ${requestConfig.method || 'GET'} ${url}`, {
                headers: requestConfig.headers,
                hasAuth: !!requestConfig.headers.Authorization
            });

            const response = await fetch(url, requestConfig);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API Error ${response.status}:`, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ API Response: ${url}`, data);

            // Se o backend retorna { success: true, data: ... }, usar formato padrão
            if (data && typeof data === 'object' && 'success' in data) {
                return data;
            }

            return { success: true, data };
        } catch (error) {
            console.error(`❌ API Error: ${url}`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * Upload file request
     */
    async upload(endpoint, formData) {
        const config = this.getConfig();
        const url = `${config.baseUrl}${endpoint}`;
        const headers = {};

        // Agregar token de autenticación si está disponible
        if (window.authService && window.authService.isAuthenticated()) {
            const authHeader = window.authService.getAuthHeader();
            if (authHeader && authHeader.Authorization) {
                headers['Authorization'] = authHeader.Authorization;
            }
        }

        try {
            console.log(`📤 Upload Request: POST ${url}`);
            const response = await fetch(url, {
                method: 'POST',
                body: formData, // No agregar Content-Type para FormData
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Upload Response: ${url}`, data);
            return { success: true, data };
        } catch (error) {
            console.error(`❌ Upload Error: ${url}`, error);
            return { success: false, error: error.message };
        }
    }

    // === MÉTODOS ESPECÍFICOS DO DOMÍNIO ===

    // Proprietarios
    async getProprietarios() {
        const config = this.getConfig();
        return this.get(config.endpoints.proprietarios);
    }

    async getProprietario(id) {
        const config = this.getConfig();
        return this.get(`${config.endpoints.proprietarios}${id}`);
    }

    async createProprietario(data) {
        const config = this.getConfig();
        return this.post(config.endpoints.proprietarios, data);
    }

    async updateProprietario(id, data) {
        const config = this.getConfig();
        return this.put(`${config.endpoints.proprietarios}${id}`, data);
    }

    async deleteProprietario(id) {
        const config = this.getConfig();
        return this.delete(`${config.endpoints.proprietarios}${id}`);
    }

    // Imoveis
    async getImoveis() {
        const config = this.getConfig();
        return this.get(config.endpoints.imoveis);
    }

    async getImovel(id) {
        const config = this.getConfig();
        return this.get(`${config.endpoints.imoveis}${id}`);
    }

    async createImovel(data) {
        const config = this.getConfig();
        return this.post(config.endpoints.imoveis, data);
    }

    async updateImovel(id, data) {
        const config = this.getConfig();
        return this.put(`${config.endpoints.imoveis}${id}`, data);
    }

    async deleteImovel(id) {
        const config = this.getConfig();
        return this.delete(`${config.endpoints.imoveis}${id}`);
    }

    // Alugueis
    async getAlugueis() {
        const config = this.getConfig();
        // Corrigir endpoint para listar aluguéis
        return this.get(config.endpoints.alugueis + 'listar');
    }

    async getAluguel(id) {
        const config = this.getConfig();
        return this.get(`${config.endpoints.alugueis}${id}`);
    }

    async createAluguel(data) {
        const config = this.getConfig();
        return this.post(config.endpoints.alugueis, data);
    }

    async updateAluguel(id, data) {
        const config = this.getConfig();
        return this.put(`${config.endpoints.alugueis}${id}`, data);
    }

    async deleteAluguel(id) {
        const config = this.getConfig();
        return this.delete(`${config.endpoints.alugueis}${id}`);
    }

    // Participações
    async getParticipacoes() {
        const config = this.getConfig();
        return this.get(config.endpoints.participacoes);
    }

    async getParticipacao(id) {
        const config = this.getConfig();
        return this.get(`${config.endpoints.participacoes}${id}`);
    }

    async createParticipacao(data) {
        const config = this.getConfig();
        return this.post(config.endpoints.participacoes, data);
    }

    async updateParticipacao(id, data) {
        const config = this.getConfig();
        return this.put(`${config.endpoints.participacoes}${id}`, data);
    }

    async deleteParticipacao(id) {
        const config = this.getConfig();
        return this.delete(`${config.endpoints.participacoes}${id}`);
    }

    // Verificação de saúde
    async getHealth() {
        const config = this.getConfig();
        return this.get(config.endpoints.health);
    }

    // Usuarios
    async getUsuarios() {
        const config = this.getConfig();
        return this.get(config.endpoints.auth + 'usuarios');
    }

    async alterarUsuario(usuarioId, data) {
        const config = this.getConfig();
        return this.put(`${config.endpoints.auth}alterar-usuario/${usuarioId}`, data);
    }

    async excluirUsuario(usuarioId) {
        const config = this.getConfig();
        return this.delete(`${config.endpoints.auth}usuario/${usuarioId}`);
    }

    async cadastrarUsuario(data) {
        const config = this.getConfig();
        return this.post(`${config.endpoints.auth}cadastrar-usuario`, data);
    }

    // ===============================================
    // IMÓVEIS - Métodos para gestión de inmuebles
    // ===============================================
    
    async getImoveis() {
        const config = this.getConfig();
        return this.get(config.endpoints.imoveis);
    }

    async getImovel(id) {
        const config = this.getConfig();
        return this.get(`${config.endpoints.imoveis}${id}`);
    }

    async createImovel(data) {
        const config = this.getConfig();
        return this.post(config.endpoints.imoveis, data);
    }

    async updateImovel(id, data) {
        const config = this.getConfig();
        return this.put(`${config.endpoints.imoveis}${id}`, data);
    }

    async deleteImovel(id) {
        const config = this.getConfig();
        return this.delete(`${config.endpoints.imoveis}${id}`);
    }

    async getImoveisDisponiveis() {
        const config = this.getConfig();
        return this.get(`${config.endpoints.imoveis}disponiveis`);
    }

    async importarImoveis(formData) {
        const config = this.getConfig();
        return this.upload(`${config.endpoints.imoveis}importar/`, formData);
    }
}

// Criar instância global
const apiService = new ApiService();

// Exportar
window.apiService = apiService;
