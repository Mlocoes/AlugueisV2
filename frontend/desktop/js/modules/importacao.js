

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
        // ...resto de la función handleImport...

        let endpoint = '';
        let loadingMsg = '';
        let successMsg = '';
        let errorMsg = '';
        switch (tipo) {
            case 'proprietarios':
                endpoint = '/proprietarios/importar/';
                loadingMsg = 'Importando proprietários...';
                successMsg = 'Proprietários importados com sucesso.';
                errorMsg = 'Erro ao importar proprietários';
                break;
            case 'imoveis':
                endpoint = '/imoveis/importar/';
                loadingMsg = 'Importando imóveis...';
                successMsg = 'Imóveis importados com sucesso.';
                errorMsg = 'Erro ao importar imóveis';
                break;
            case 'participacoes':
                endpoint = '/participacoes/importar/';
                loadingMsg = 'Importando participações...';
                successMsg = 'Participações importadas com sucesso.';
                errorMsg = 'Erro ao importar participações';
                break;
            case 'alugueis':
                endpoint = '/alugueis/importar/';
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
                // Atualiza listas se módulos estiverem disponíveis
                // Eliminado: recarga de proprietarios en la pantalla de importar
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
