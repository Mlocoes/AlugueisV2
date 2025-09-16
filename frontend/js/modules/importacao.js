

class ImportacaoModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
    }

    init() {
        if (this.initialized) return;
        // Proprietários
        const formProprietarios = document.getElementById('importar-form-proprietarios');
        if (formProprietarios) {
            formProprietarios.addEventListener('submit', (e) => this.handleImport(e, 'proprietarios'));
        }
        // Imóveis
        const formImoveis = document.getElementById('importar-form-imoveis');
        if (formImoveis) {
            formImoveis.addEventListener('submit', (e) => this.handleImport(e, 'imoveis'));
        }
        // Participações
        const formParticipacoes = document.getElementById('importar-form-participacoes');
        if (formParticipacoes) {
            formParticipacoes.addEventListener('submit', (e) => this.handleImport(e, 'participacoes'));
        }
        // Aluguéis
        const formAlugueis = document.getElementById('importar-form-alugueis');
        if (formAlugueis) {
            formAlugueis.addEventListener('submit', (e) => this.handleImport(e, 'alugueis'));
        }

        // Removido: o carregamento dos dados deve ser feito por cada módulo ao abrir sua aba

        this.initialized = true;
    }

    /**
     * Método para carregar dados quando a vista é ativada (chamado pelo view-manager)
     */
    async load() {
        console.log('🔄 Carregando ImportacaoModule...');
        try {
            // Inicializar se ainda não foi inicializado
            if (!this.initialized) {
                this.init();
            }
            
            console.log('✅ ImportacaoModule carregado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar ImportacaoModule:', error);
        }
    }

    async handleImport(event, tipo) {
        event.preventDefault();
        const form = event.target;
        const fileInput = form.querySelector('input[type="file"]');
        if (!fileInput || !fileInput.files.length) {
            this.uiManager?.showError('Selecione um arquivo Excel para importar.');
            return;
        }
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);
        // ...resto da função handleImport...

        let endpoint = '';
        let loadingMsg = '';
        let successMsg = '';
        let errorMsg = '';
        switch (tipo) {
            case 'proprietarios':
                endpoint = '/api/proprietarios/importar/';
                loadingMsg = 'Importando proprietários...';
                successMsg = 'Proprietários importados com sucesso.';
                errorMsg = 'Erro ao importar proprietários';
                break;
            case 'imoveis':
                endpoint = '/api/imoveis/importar/';
                loadingMsg = 'Importando imóveis...';
                successMsg = 'Imóveis importados com sucesso.';
                errorMsg = 'Erro ao importar imóveis';
                break;
            case 'participacoes':
                endpoint = '/api/participacoes/importar/';
                loadingMsg = 'Importando participações...';
                successMsg = 'Participações importadas com sucesso.';
                errorMsg = 'Erro ao importar participações';
                break;
            case 'alugueis':
                endpoint = '/api/alugueis/importar/';
                loadingMsg = 'Importando aluguéis...';
                successMsg = 'Aluguéis importados com sucesso.';
                errorMsg = 'Erro ao importar aluguéis';
                break;
        }

        this.uiManager?.showLoading(loadingMsg);
        try {
            const response = await this.apiService.upload(endpoint, formData);
            this.uiManager?.hideLoading();
            if (response.success) {
                this.uiManager?.showSuccess(response.data?.mensagem || successMsg);
                // Atualiza listas se os módulos estiverem disponíveis
                // Eliminado: recarga de proprietários na tela de importar
                if (window.imoveisModule && tipo === 'imoveis' && typeof window.imoveisModule.loadImoveis === 'function') {
                    window.imoveisModule.loadImoveis();
                }
                if (window.participacoesModule && tipo === 'participacoes' && typeof window.participacoesModule.loadParticipacoes === 'function') {
                    window.participacoesModule.loadParticipacoes();
                }
                if (window.alugueisModule && tipo === 'alugueis' && typeof window.alugueisModule.loadAlugueis === 'function') {
                    window.alugueisModule.loadAlugueis();
                }
                // Limpa o input
                fileInput.value = '';
            } else {
                this.uiManager?.showError(errorMsg + (response.error ? (': ' + response.error) : ''));
            }
        } catch (error) {
            this.uiManager?.hideLoading();
            this.uiManager?.showError(errorMsg + (error?.message ? (': ' + error.message) : ''));
        }
    }
}

// Registrar módulo globalmente

