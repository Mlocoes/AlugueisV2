class ImportacaoModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
    }

    // Função para validar arquivo antes do envio
    validateFile(file) {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'text/tab-separated-values'
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Tipo de arquivo não permitido. Use Excel (.xlsx, .xls), CSV ou TSV.');
        }
        if (file.size > maxSize) {
            throw new Error(`Arquivo muito grande. Máximo permitido: ${maxSize / (1024 * 1024)}MB`);
        }

        // Verificar conteúdo suspeito em CSV/TSV
        if (file.type === 'text/csv' || file.type === 'text/tab-separated-values') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    if (/<script/i.test(content) || /javascript:/i.test(content)) {
                        reject(new Error('Arquivo contém conteúdo suspeito e foi rejeitado.'));
                    } else {
                        resolve(true);
                    }
                };
                reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
                reader.readAsText(file);
            });
        }
        return Promise.resolve(true);
    }

    // Função para sanitizar dados
    sanitizeData(data) {
        if (typeof data === 'string') {
            return data.replace(/[<>&"']/g, c => ({
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#39;'
            })[c]);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item));
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const key in data) {
                sanitized[this.sanitizeData(key)] = this.sanitizeData(data[key]);
            }
            return sanitized;
        }
        return data;
    }

    // Função para tratar mensagens de erro do backend
    handleBackendError(error) {
        // Mensagens genéricas para o usuário
        const userFriendlyMessages = {
            'Arquivo no encontrado': 'Arquivo não encontrado. Tente fazer upload novamente.',
            'Archivo físico no encontrado': 'Arquivo corrompido. Faça upload de um novo arquivo.',
            'Error al procesar archivo': 'Erro ao processar o arquivo. Verifique se o formato está correto.',
            'Error al subir archivo': 'Erro no upload. Tente novamente.',
            'Tipo de contenido no permitido': 'Tipo de arquivo não permitido.',
            'Archivo demasiado grande': 'Arquivo muito grande.',
            'default': 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte.'
        };

        const errorMessage = error.message || error.error || error.detail || error;
        for (const [key, message] of Object.entries(userFriendlyMessages)) {
            if (errorMessage.includes(key)) {
                return message;
            }
        }
        return userFriendlyMessages.default;
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

        try {
            // Validação do arquivo antes do envio
            await this.validateFile(file);
        } catch (error) {
            this.uiManager.showError(`Erro na validação do arquivo: ${error.message}`);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.uiManager.showLoading('Enviando arquivo...');

        try {
            // 1. Upload do arquivo
            const uploadResponse = await this.apiService.upload('/api/upload/', formData);
            if (!uploadResponse.success || !uploadResponse.data.file_id) {
                throw new Error(this.handleBackendError(uploadResponse));
            }
            const fileId = uploadResponse.data.file_id;
            this.uiManager.showLoading('Arquivo enviado. Processando dados...');

            // 2. Processamento e validação do arquivo
            const processResponse = await this.apiService.post(`/api/upload/process/${fileId}`);
            if (!processResponse.success) {
                throw new Error(this.handleBackendError(processResponse));
            }

            const validationResult = this.sanitizeData(processResponse.data);
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
                throw new Error(this.handleBackendError(importResponse));
            }

            this.uiManager.showSuccess(importResponse.data.message || 'Dados importados com sucesso!');
            
            // Limpa o resultado da validação e o input do arquivo
            this._clearValidationResults();
            fileInput.value = '';

            // Atualiza os módulos relevantes
            this._refreshModules(validationResult.detected_types);

        } catch (error) {
            this.uiManager.showError(`Erro no processo de importação: ${this.handleBackendError(error)}`);
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

