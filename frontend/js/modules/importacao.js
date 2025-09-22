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
        const file = fileInput?.files[0];

        if (!file) {
            this.uiManager.showError('Por favor, selecione um arquivo para importar.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.uiManager.showLoading('Enviando arquivo...');

        try {
            // 1. Upload do arquivo
            const uploadResponse = await this.apiService.upload('/api/upload/', formData);
            if (!uploadResponse.success || !uploadResponse.data.file_id) {
                throw new Error(uploadResponse.error || 'Falha no upload do arquivo.');
            }
            const fileId = uploadResponse.data.file_id;
            this.uiManager.showLoading('Arquivo enviado. Processando dados...');

            // 2. Processamento e validação do arquivo
            const processResponse = await this.apiService.post(`/api/upload/process/${fileId}`);
            if (!processResponse.success) {
                throw new Error(processResponse.error || 'Falha ao processar o arquivo.');
            }

            const validationResult = processResponse.data;
            this._displayValidationResults(validationResult);

            if (validationResult.status === 'error') {
                this.uiManager.showError('A importação foi bloqueada devido a erros de validação. Verifique os detalhes abaixo.');
                return; // Interrompe o processo
            }

            let proceedWithImport = true;
            if (validationResult.status === 'warning') {
                proceedWithImport = await this.uiManager.showConfirmation('O arquivo contém avisos. Deseja continuar com a importação?');
            }

            if (!proceedWithImport) {
                this.uiManager.showInfo('Importação cancelada pelo usuário.');
                fileInput.value = ''; // Limpa o input
                return;
            }
            
            this.uiManager.showLoading('Validação concluída. Importando dados para o sistema...');

            // 3. Importação final dos dados
            const importResponse = await this.apiService.post(`/api/upload/import/${fileId}`);
            if (!importResponse.success) {
                throw new Error(importResponse.error || 'Erro na importação final.');
            }

            this.uiManager.showSuccess(importResponse.data.message || 'Dados importados com sucesso!');
            
            // Limpa o resultado da validação e o input do arquivo
            this._clearValidationResults();
            fileInput.value = '';

            // Atualiza os módulos relevantes
            this._refreshModules(validationResult.detected_types);

        } catch (error) {
            this.uiManager.showError(`Erro no processo de importação: ${error.message}`);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    _displayValidationResults(validationResult) {
        const container = document.getElementById('validation-results-container');
        if (!container) return;

        let html = '<h4>Resultados da Validação</h4>';

        if (validationResult.errors && validationResult.errors.length > 0) {
            html += '<div class="alert alert-danger"><h5>Erros Encontrados:</h5><ul>';
            validationResult.errors.forEach(err => {
                html += `<li><strong>${err.sheet}:</strong> ${err.error} (Linha: ${err.row_index})</li>`;
            });
            html += '</ul></div>';
        }

        if (validationResult.warnings && validationResult.warnings.length > 0) {
            html += '<div class="alert alert-warning"><h5>Avisos:</h5><ul>';
            validationResult.warnings.forEach(warn => {
                html += `<li><strong>${warn.sheet}:</strong> ${warn.warning} (Linha: ${warn.row_index})</li>`;
            });
            html += '</ul></div>';
        }

        if (validationResult.detected_types && validationResult.detected_types.length > 0) {
            html += `<p><strong>Tipos de dados detectados:</strong> ${validationResult.detected_types.join(', ')}</p>`;
        }

        container.innerHTML = html;
        container.style.display = 'block';
    }

    _clearValidationResults() {
        const container = document.getElementById('validation-results-container');
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    _refreshModules(detectedTypes) {
        if (!detectedTypes) return;

        if (detectedTypes.includes('proprietarios') && window.proprietariosModule?.loadProprietarios) {
            window.proprietariosModule.loadProprietarios();
        }
        if (detectedTypes.includes('imoveis') && window.imoveisModule?.loadImoveis) {
            window.imoveisModule.loadImoveis();
        }
        if (detectedTypes.includes('participacoes') && window.participacoesModule?.loadParticipacoes) {
            window.participacoesModule.loadParticipacoes();
        }
        if (detectedTypes.includes('alugueis') && window.alugueisModule?.loadAlugueis) {
            window.alugueisModule.loadAlugueis();
        }
    }
}

// Registrar módulo globalmente
window.importacaoModule = new ImportacaoModule();

