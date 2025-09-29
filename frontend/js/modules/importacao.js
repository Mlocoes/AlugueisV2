class ImportacaoModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    init() {
        if (this.initialized) return;

        const suffix = this.isMobile ? '-mobile' : '';
        const formTypes = ['proprietarios', 'imoveis', 'participacoes', 'alugueis'];

        formTypes.forEach(type => {
            const form = document.getElementById(`importar-form-${type}${suffix}`);
            if (form) {
                form.addEventListener('submit', (e) => this.handleImport(e, type));
            }
        });

        this.initialized = true;
    }

    async load() {
        if (!window.authService || !window.authService.isAdmin()) {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                SecurityUtils.setSafeHTML(mainContent, `
                    <div class="alert alert-danger text-center m-3">
                        <h4>Acesso Negado</h4>
                        <p>Você não tem permissão para acessar esta página.</p>
                    </div>
                `);
            }
            return;
        }

        if (!this.initialized) {
            this.init();
        }
        this.applyPermissions(window.authService.isAdmin());
    }

    validateFile(file) {
        const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            throw new Error('Tipo de arquivo inválido. Use .xlsx ou .xls.');
        }
        if (file.size > maxSize) {
            throw new Error(`Arquivo muito grande. Máximo: ${maxSize / (1024 * 1024)}MB.`);
        }
        return Promise.resolve(true);
    }

    async handleImport(event, tipo) {
        event.preventDefault();
        this._clearValidationResults();
        const form = event.target;
        const fileInput = form.querySelector('input[type="file"]');
        const file = fileInput?.files[0];

        if (!file) {
            this.uiManager.showError('Por favor, selecione um arquivo.');
            return;
        }

        try {
            await this.validateFile(file);
        } catch (error) {
            this.uiManager.showError(`Erro na validação: ${error.message}`);
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.uiManager.showLoading('Enviando arquivo...');

        try {
            const uploadResponse = await this.apiService.upload('/api/upload/', formData);
            if (!uploadResponse.success || !uploadResponse.data.file_id) {
                throw new Error('Falha no upload do arquivo.');
            }

            const fileId = uploadResponse.data.file_id;
            this.uiManager.showLoading('Arquivo enviado. Validando dados...');

            const processResponse = await this.apiService.post(`/api/upload/process/${fileId}?tipo=${tipo}`);
            if (!processResponse.success) {
                throw new Error(processResponse.error || 'Erro ao processar arquivo no servidor.');
            }

            const validationResult = processResponse.data;
            this._displayValidationResults(validationResult);

            if (validationResult.status === 'error') {
                this.uiManager.showError('A importação foi bloqueada devido a erros de validação.');
                return;
            }

            let proceedWithImport = true;
            if (validationResult.status === 'warning') {
                proceedWithImport = await this.uiManager.showConfirm('O arquivo contém avisos. Deseja continuar com a importação?');
            }

            if (!proceedWithImport) {
                this.uiManager.showInfo('Importação cancelada pelo usuário.');
                fileInput.value = '';
                return;
            }

            this.uiManager.showLoading('Validação concluída. Importando dados...');
            const importResponse = await this.apiService.post(`/api/upload/import/${fileId}?tipo=${tipo}`);

            if (!importResponse.success) {
                throw new Error(importResponse.error || 'Erro na importação final dos dados.');
            }

            this.uiManager.showSuccess(importResponse.message || 'Dados importados com sucesso!');
            fileInput.value = '';
            this._refreshModules([tipo]);

        } catch (error) {
            this.uiManager.showError(`Erro na importação: ${error.message}`);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    _displayValidationResults(validationResult) {
        const suffix = this.isMobile ? '-mobile' : '';
        const container = document.getElementById(`validation-results-container${suffix}`);
        if (!container) return;

        let html = '<h4>Resultados da Validação</h4>';
        if (validationResult.errors && validationResult.errors.length > 0) {
            html += '<div class="alert alert-danger"><h5>Erros Encontrados:</h5><ul>';
            validationResult.errors.forEach(err => html += `<li>${err.error} (Linha: ${err.row_index})</li>`);
            html += '</ul></div>';
        }
        if (validationResult.warnings && validationResult.warnings.length > 0) {
            html += '<div class="alert alert-warning"><h5>Avisos:</h5><ul>';
            validationResult.warnings.forEach(warn => html += `<li>${warn.warning} (Linha: ${warn.row_index})</li>`);
            html += '</ul></div>';
        }
        if ((!validationResult.errors || validationResult.errors.length === 0) && (!validationResult.warnings || validationResult.warnings.length === 0)) {
            html += '<div class="alert alert-success">Nenhum erro ou aviso encontrado.</div>';
        }

        container.innerHTML = html;
        container.style.display = 'block';
    }

    _clearValidationResults() {
        const suffix = this.isMobile ? '-mobile' : '';
        const container = document.getElementById(`validation-results-container${suffix}`);
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
    }

    _refreshModules(types) {
        if (!types || !Array.isArray(types)) return;

        if (types.includes('proprietarios') && window.proprietariosModule?.loadProprietarios) {
            window.proprietariosModule.loadProprietarios();
        }
        if (types.includes('imoveis') && window.imoveisModule?.loadImoveis) {
            window.imoveisModule.loadImoveis();
        }
        if (types.includes('participacoes') && window.participacoesModule?.load) {
            window.participacoesModule.load();
        }
        if (types.includes('alugueis') && window.alugueisModule?.load) {
            window.alugueisModule.load();
        }
    }

    applyPermissions(isAdmin) {
        const suffix = this.isMobile ? '-mobile' : '';
        const formTypes = ['proprietarios', 'imoveis', 'participacoes', 'alugueis'];

        formTypes.forEach(type => {
            const form = document.getElementById(`importar-form-${type}${suffix}`);
            if (form) {
                const inputs = form.querySelectorAll('input, button');
                inputs.forEach(input => {
                    input.disabled = !isAdmin;
                    if (!isAdmin) {
                        input.title = 'Apenas administradores podem importar dados.';
                    }
                });
            }
        });
    }
}

window.importacaoModule = new ImportacaoModule();