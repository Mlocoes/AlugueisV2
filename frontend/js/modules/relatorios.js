class RelatoriosModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.currentData = [];
        this.transferenciasCache = new Map();
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    async load() {
        if (!this.initialized) {
            this.init();
        }
        await this.loadInitialData();
    }

    init() {
        if (this.initialized) return;

        this.container = this.isMobile
            ? document.getElementById('relatorios-list-mobile')
            : document.getElementById('relatorios-table-body');

        if (!this.container) {
            console.warn('RelatoriosModule: Container not found. View might not be active.');
            return;
        }

        const suffix = this.isMobile ? '-mobile' : '';
        this.anoSelect = document.getElementById(`relatorios-ano-select${suffix}`);
        this.mesSelect = document.getElementById(`relatorios-mes-select${suffix}`);
        this.proprietarioSelect = document.getElementById(`relatorios-proprietario-select${suffix}`);
        this.transferenciasCheck = document.getElementById(`relatorios-transferencias-check${suffix}`);

        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        [this.anoSelect, this.mesSelect, this.proprietarioSelect, this.transferenciasCheck].forEach(el => {
            if (el) el.addEventListener('change', () => this.loadRelatoriosData());
        });
    }

    async loadInitialData() {
        try {
            this.loadMeses();
            await this.loadYears();
            await this.loadProprietariosAndAliases();
            await this.loadRelatoriosData();
        } catch (error) {
            console.error('Erro ao carregar dados iniciais de relatórios:', error);
        }
    }

    async loadYears() {
        if (!this.anoSelect) return;
        try {
            const response = await this.apiService.get('/api/reportes/anos-disponiveis');
            const anos = response.success ? response.data : response;
            this.anoSelect.innerHTML = '<option value="">Todos</option>';
            anos.forEach(ano => this.anoSelect.add(new Option(ano, ano)));
        } catch (error) {
            console.error('Erro ao carregar anos para relatórios:', error);
        }
    }

    async loadProprietariosAndAliases() {
        if (!this.proprietarioSelect) return;
        try {
            const [propResponse, aliasResponse] = await Promise.all([
                this.apiService.get('/api/proprietarios/'),
                this.apiService.get('/api/extras/reportes')
            ]);

            const proprietarios = propResponse.success ? propResponse.data : [];
            const aliases = aliasResponse.success ? aliasResponse.data : [];

            this.proprietarioSelect.innerHTML = '<option value="">Todos</option>';
            proprietarios.forEach(prop => {
                this.proprietarioSelect.add(new Option(`${prop.nome} ${prop.sobrenome || ''}`.trim(), prop.id));
            });

            if (aliases.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = 'Aliases';
                aliases.forEach(alias => {
                    optgroup.appendChild(new Option(alias.alias, `alias:${alias.id}`));
                });
                this.proprietarioSelect.appendChild(optgroup);
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários e aliases:', error);
        }
    }

    loadMeses() {
        if (!this.mesSelect) return;

        // Se já tem opções (desktop), não sobrescrever
        if (this.mesSelect.options.length > 1) return;

        const meses = [
            { value: '', text: 'Todos os meses' },
            { value: '1', text: 'Janeiro' },
            { value: '2', text: 'Fevereiro' },
            { value: '3', text: 'Março' },
            { value: '4', text: 'Abril' },
            { value: '5', text: 'Maio' },
            { value: '6', text: 'Junho' },
            { value: '7', text: 'Julho' },
            { value: '8', text: 'Agosto' },
            { value: '9', text: 'Setembro' },
            { value: '10', text: 'Outubro' },
            { value: '11', text: 'Novembro' },
            { value: '12', text: 'Dezembro' }
        ];

        this.mesSelect.innerHTML = '';
        meses.forEach(mes => {
            this.mesSelect.add(new Option(mes.text, mes.value));
        });
    }

    async loadRelatoriosData() {
        if (!this.anoSelect || !this.mesSelect || !this.proprietarioSelect) return;

        const params = new URLSearchParams();
        if (this.anoSelect.value) params.append('ano', this.anoSelect.value);
        if (this.mesSelect.value) params.append('mes', this.mesSelect.value);

        const proprietarioSelection = this.proprietarioSelect.value;
        if (proprietarioSelection && !proprietarioSelection.startsWith('alias:')) {
            params.append('proprietario_id', proprietarioSelection);
        }

        try {
            this.uiManager.showLoading('Carregando relatórios...');
            const response = await this.apiService.get(`/api/reportes/resumen-mensual?${params.toString()}`);
            let data = (response.success ? response.data : response) || [];

            if (proprietarioSelection && proprietarioSelection.startsWith('alias:')) {
                const aliasId = proprietarioSelection.replace('alias:', '');
                const propIdsResponse = await this.apiService.get(`/api/extras/${aliasId}/proprietarios/relatorios`);
                const propIds = (propIdsResponse.success ? propIdsResponse.data : []).map(p => p.id);
                data = data.filter(item => propIds.includes(item.proprietario_id));
            }

            this.currentData = data;
            await this.render();
        } catch (error) {
            this.uiManager.showError('Erro ao carregar dados de relatórios.');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async getTransferenciasValue(proprietarioId, ano, mes) {
        const cacheKey = `transferencias_${ano}_${mes}`;
        if (this.transferenciasCache.has(cacheKey)) {
            return this.transferenciasCache.get(cacheKey)[proprietarioId] || 0;
        }

        // This part would ideally fetch data for the given period.
        // For this revision, we assume a simplified logic where we fetch all and filter.
        // In a real-world scenario, the API should support period-based queries.
        try {
            const response = await this.apiService.get('/api/transferencias/relatorios');
            const transferencias = response.success ? response.data : [];
            
            const periodTransfers = {};
            transferencias.forEach(t => {
                const tDate = new Date(t.data_criacao);
                if (tDate.getFullYear() == ano && (tDate.getMonth() + 1) == mes) {
                    try {
                        const participantes = JSON.parse(t.id_proprietarios);
                        participantes.forEach(p => {
                            periodTransfers[p.id] = (periodTransfers[p.id] || 0) + parseFloat(p.valor);
                        });
                    } catch (e) {}
                }
            });

            this.transferenciasCache.set(cacheKey, periodTransfers);
            return periodTransfers[proprietarioId] || 0;
        } catch (error) {
            console.error("Error fetching transferencias", error);
            return 0;
        }
    }

    async render() {
        if (!this.container) return;

        if (this.isMobile) {
            await this.renderMobileCards();
        } else {
            await this.renderDesktopTable();
        }
        this.applyPermissions();
    }

    async renderMobileCards() {
        if (this.currentData.length === 0) {
            this.container.innerHTML = `<div class="text-center p-4">Nenhum relatório encontrado.</div>`;
            return;
        }

        const incluirTransferencias = this.transferenciasCheck && this.transferenciasCheck.checked;
        let cardsHtml = '';
        for (const item of this.currentData) {
            let somaAlugueis = parseFloat(item.soma_alugueis || 0);
            if (incluirTransferencias) {
                somaAlugueis += await this.getTransferenciasValue(item.proprietario_id, item.ano, item.mes);
            }
            const somaTaxas = parseFloat(item.soma_taxas || 0);
            const valorLiquido = somaAlugueis - somaTaxas;

            cardsHtml += `
                <div class="card mobile-card mb-3 shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(item.nome_proprietario)}</h5>
                        <small class="text-muted">${item.mes}/${item.ano}</small>
                    </div>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Valor Líquido
                            <span class="badge bg-success rounded-pill">R$ ${valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </li>
                    </ul>
                </div>
            `;
        }
        this.container.innerHTML = cardsHtml;
    }

    async renderDesktopTable() {
        if (this.currentData.length === 0) {
            this.container.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum relatório encontrado.</td></tr>';
            return;
        }

        const incluirTransferencias = this.transferenciasCheck && this.transferenciasCheck.checked;
        let tableHtml = '';
        for (const [index, item] of this.currentData.entries()) {
            let somaAlugueis = parseFloat(item.soma_alugueis || 0);
            if (incluirTransferencias) {
                somaAlugueis += await this.getTransferenciasValue(item.proprietario_id, item.ano, item.mes);
            }
            const somaTaxas = parseFloat(item.soma_taxas || 0);

            tableHtml += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${SecurityUtils.escapeHtml(item.nome_proprietario)}</td>
                    <td class="text-center">${item.mes}/${item.ano}</td>
                    <td class="text-end">R$ ${somaAlugueis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td class="text-end">R$ ${somaTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td class="text-center">${item.quantidade_imoveis}</td>
                </tr>
            `;
        }
        this.container.innerHTML = tableHtml;
    }

    applyPermissions() {
        const isAdmin = window.authService && window.authService.isAdmin();
        if (this.transferenciasCheck) {
            this.transferenciasCheck.disabled = !isAdmin;
            const formCheckElement = this.transferenciasCheck.closest('.form-check');
            if (formCheckElement) {
                formCheckElement.title = isAdmin ? '' : 'Apenas administradores podem alterar esta opção.';
            }
        }
    }
}

window.relatoriosModule = new RelatoriosModule();