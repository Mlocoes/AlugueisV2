/**
 * Serviço centralizado para gerenciamento de dados da API
 */
class DataService {
    constructor(apiService) {
        this.api = apiService;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    async getProprietarios(force = false) {
        return this._getCached('proprietarios', () => this.api.get('/api/proprietarios'), force);
    }

    async getImoveis(force = false) {
        return this._getCached('imoveis', () => this.api.get('/api/imoveis'), force);
    }

    async getAlugueis(force = false) {
        return this._getCached('alugueis', () => this.api.get('/api/alugueis'), force);
    }

    async _getCached(key, fetchFunction, force = false) {
        const now = Date.now();
        const cached = this.cache.get(key);

        if (!force && cached && (now - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const data = await fetchFunction();
            this.cache.set(key, {
                data: data,
                timestamp: now
            });
            return data;
        } catch (error) {
            console.error(`Erro ao buscar ${key}:`, error);
            throw error;
        }
    }

    invalidateCache(key) {
        this.cache.delete(key);
    }

    clearCache() {
        this.cache.clear();
    }

    // Métodos específicos para operações CRUD
    async createProprietario(proprietarioData) {
        const result = await this.api.post('/api/proprietarios', proprietarioData);
        this.invalidateCache('proprietarios');
        return result;
    }

    async updateProprietario(id, proprietarioData) {
        const result = await this.api.put(`/api/proprietarios/${id}`, proprietarioData);
        this.invalidateCache('proprietarios');
        return result;
    }

    async deleteProprietario(id) {
        const result = await this.api.delete(`/api/proprietarios/${id}`);
        this.invalidateCache('proprietarios');
        return result;
    }

    async createImovel(imovelData) {
        const result = await this.api.post('/api/imoveis', imovelData);
        this.invalidateCache('imoveis');
        return result;
    }

    async updateImovel(id, imovelData) {
        const result = await this.api.put(`/api/imoveis/${id}`, imovelData);
        this.invalidateCache('imoveis');
        return result;
    }

    async deleteImovel(id) {
        const result = await this.api.delete(`/api/imoveis/${id}`);
        this.invalidateCache('imoveis');
        return result;
    }

    async createAluguel(aluguelData) {
        const result = await this.api.post('/api/alugueis/criar', aluguelData);
        this.invalidateCache('alugueis');
        return result;
    }

    async updateAluguel(id, aluguelData) {
        const result = await this.api.put(`/api/alugueis/${id}`, aluguelData);
        this.invalidateCache('alugueis');
        return result;
    }

    async deleteAluguel(id) {
        const result = await this.api.delete(`/api/alugueis/${id}`);
        this.invalidateCache('alugueis');
        return result;
    }
}

// Exportar para uso global
window.DataService = DataService;