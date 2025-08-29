/**
 * Serviço de API - Versão Móvil
 * Sistema de Alquileres V2
 */

class MobileApiService {
    constructor() {
        this.config = window.MobileConfig;
        this.auth = window.mobileAuth;
    }

    /**
     * Realizar requisição GET
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${this.config.api.baseUrl}${endpoint}`, {
                method: 'GET',
                headers: this.auth.getAuthHeader()
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição GET:', error);
            throw error;
        }
    }

    /**
     * Realizar requisição POST
     */
    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.config.api.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.auth.getAuthHeader(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição POST:', error);
            throw error;
        }
    }

    /**
     * Realizar requisição PUT
     */
    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.config.api.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.auth.getAuthHeader(),
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição PUT:', error);
            throw error;
        }
    }

    /**
     * Realizar requisição DELETE
     */
    async delete(endpoint) {
        try {
            const response = await fetch(`${this.config.api.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.auth.getAuthHeader()
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro na requisição DELETE:', error);
            throw error;
        }
    }

    // Métodos específicos para cada entidade

    /**
     * Proprietários
     */
    async getProprietarios() {
        return await this.get('/proprietarios/');
    }

    async createProprietario(data) {
        return await this.post('/proprietarios/', data);
    }

    async updateProprietario(id, data) {
        return await this.put(`/proprietarios/${id}`, data);
    }

    async deleteProprietario(id) {
        return await this.delete(`/proprietarios/${id}`);
    }

    /**
     * Imóveis
     */
    async getImoveis() {
        return await this.get('/imoveis/');
    }

    async createImovel(data) {
        return await this.post('/imoveis/', data);
    }

    async updateImovel(id, data) {
        return await this.put(`/imoveis/${id}`, data);
    }

    async deleteImovel(id) {
        return await this.delete(`/imoveis/${id}`);
    }

    /**
     * Aluguéis
     */
    async getAlugueis() {
        return await this.get('/alugueis/listar');
    }

    async createAluguel(data) {
        return await this.post('/alugueis/', data);
    }

    async updateAluguel(id, data) {
        return await this.put(`/alugueis/${id}`, data);
    }

    async deleteAluguel(id) {
        return await this.delete(`/alugueis/${id}`);
    }

    /**
     * Participações
     */
    async getParticipacoes() {
        return await this.get('/participacoes/');
    }

    async getParticipacao(id) {
        return await this.get(`/participacoes/${id}`);
    }

    async createParticipacao(data) {
        return await this.post('/participacoes/', data);
    }

    async updateParticipacao(id, data) {
        return await this.put(`/participacoes/${id}`, data);
    }

    async deleteParticipacao(id) {
        return await this.delete(`/participacoes/${id}`);
    }

    /**
     * Verificar saúde do servidor
     */
    async checkHealth() {
        try {
            const response = await fetch(`${this.config.api.baseUrl}/health`);
            return await response.json();
        } catch (error) {
            console.error('Erro ao verificar saúde do servidor:', error);
            throw error;
        }
    }
}

// Instância global
window.mobileApi = new MobileApiService();
