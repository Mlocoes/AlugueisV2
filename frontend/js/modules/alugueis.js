class AlugueisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.matriz = [];
        this.proprietarios = [];
        this.imoveis = [];
        this.initialized = false;
        this.anosDisponiveis = [];
        this.anoSelecionado = null;
        this.mesSelecionado = null;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    async load() {
        if (!this.initialized) {
            this.init();
        }
        await this.loadAnosDisponiveis();
    }

    init() {
        if (this.initialized) return;

        this.container = this.isMobile
            ? document.getElementById('alugueis-list-mobile')
            : document.getElementById('alugueis-matrix-body');

        if (!this.container) {
            console.warn("Container for AlugueisModule not found.");
            return;
        }

        const suffix = this.isMobile ? '-mobile' : '';
        this.anoSelect = document.getElementById(`alugueis-ano-select${suffix}`);
        this.mesSelect = document.getElementById(`alugueis-mes-select${suffix}`);

        this.setupPeriodDropdowns();
        this.initialized = true;
    }

    async loadAnosDisponiveis() {
        try {
            const resp = await this.apiService.getAnosDisponiveisAlugueis();
            if (resp && resp.anos && resp.anos.length > 0) {
                this.anosDisponiveis = resp.anos.sort((a, b) => b - a);
                this.anoSelecionado = this.anosDisponiveis[0];
            } else {
                this.anosDisponiveis = [new Date().getFullYear()];
                this.anoSelecionado = this.anosDisponiveis[0];
            }
            this.populateAnoDropdown();
            await this.loadMesReciente();
        } catch (error) {
            console.error('Erro ao carregar anos:', error);
        }
    }

    async loadMesReciente() {
        try {
            const ultimoPeriodo = await this.apiService.get('/api/alugueis/ultimo-periodo/');
            if (ultimoPeriodo?.success && ultimoPeriodo?.data?.mes) {
                this.mesSelecionado = ultimoPeriodo.data.mes;
            } else {
                this.mesSelecionado = 'todos';
            }
            this.populateMesDropdown();
            this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
        } catch (error) {
            this.mesSelecionado = 'todos';
            this.populateMesDropdown();
            this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
        }
    }

    populateAnoDropdown() {
        if (!this.anoSelect) return;
        this.anoSelect.innerHTML = '';
        this.anosDisponiveis.forEach(ano => {
            const option = new Option(ano, ano);
            this.anoSelect.add(option);
        });
        this.anoSelect.value = this.anoSelecionado;
    }

    populateMesDropdown() {
        if (!this.mesSelect) return;
        this.mesSelect.innerHTML = '';
        this.mesSelect.add(new Option('Todos os meses', 'todos'));
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        meses.forEach((nome, index) => {
            this.mesSelect.add(new Option(nome, index + 1));
        });
        this.mesSelect.value = this.mesSelecionado;
        this.mesSelect.disabled = false;
    }

    setupPeriodDropdowns() {
        if (this.anoSelect) {
            this.anoSelect.addEventListener('change', (e) => {
                this.anoSelecionado = parseInt(e.target.value);
                this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
            });
        }
        if (this.mesSelect) {
            this.mesSelect.addEventListener('change', (e) => {
                this.mesSelecionado = e.target.value === 'todos' ? 'todos' : parseInt(e.target.value);
                this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
            });
        }
    }

    async loadMatrizAlugueis(ano, mes) {
        if (!ano) return;
        try {
            this.uiManager.showLoading('Carregando aluguéis...');
            const endpoint = (mes === 'todos' || !mes)
                ? `/api/alugueis/distribuicao-todos-meses/?ano=${ano}`
                : `/api/alugueis/distribuicao-matriz/?ano=${ano}&mes=${mes}`;
            
            const resp = await this.apiService.get(endpoint);
            
            if (resp.success && resp.data) {
                this.matriz = resp.data.matriz || [];
                this.proprietarios = resp.data.proprietarios || [];
                this.imoveis = resp.data.imoveis || [];
            } else {
                this.matriz = [];
                this.proprietarios = [];
                this.imoveis = [];
            }
            this.render();
        } catch (error) {
            this.uiManager.showError('Erro ao carregar aluguéis: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    render() {
        if (!this.container) return;

        if (this.isMobile) {
            this.renderMobileCards();
        } else {
            this.renderDesktopTable();
        }
    }

    renderMobileCards() {
        if (this.imoveis.length === 0) {
            this.container.innerHTML = `<div class="text-center p-4">Nenhum aluguel encontrado para o período.</div>`;
            return;
        }

        const cardsHtml = this.imoveis.map(imovel => {
            const alugueisDoImovel = this.matriz
                .map(linha => ({
                    proprietario: this.proprietarios.find(p => p.proprietario_id === linha.proprietario_id),
                    valor: linha.valores[imovel.nome] || 0
                }))
                .filter(item => item.valor > 0);

            if (alugueisDoImovel.length === 0) return '';

            const alugueisHtml = alugueisDoImovel.map(item => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    ${item.proprietario ? SecurityUtils.escapeHtml(item.proprietario.nome) : 'Desconhecido'}
                    <span class="badge bg-success rounded-pill">R$ ${item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </li>
            `).join('');

            const totalImovel = alugueisDoImovel.reduce((sum, item) => sum + item.valor, 0);

            return `
                <div class="card mobile-card mb-3 shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                        <strong class="text-primary">R$ ${totalImovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <ul class="list-group list-group-flush">
                        ${alugueisHtml}
                    </ul>
                </div>
            `;
        }).join('');

        this.container.innerHTML = cardsHtml || `<div class="text-center p-4">Nenhum aluguel encontrado para o período.</div>`;
    }

    renderDesktopTable() {
        const tableHead = document.getElementById('alugueis-matrix-head');
        const tableBody = this.container;
        
        if (!tableHead || !tableBody) return;

        if (this.imoveis.length === 0 || this.proprietarios.length === 0) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="1" class="text-center">Nenhum aluguel encontrado.</td></tr>';
            return;
        }

        const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const tituloPeriodo = this.mesSelecionado && this.mesSelecionado !== 'todos'
            ? `${meses[this.mesSelecionado]} ${this.anoSelecionado}`
            : `Ano ${this.anoSelecionado}`;

        let headHtml = `<tr><th style="width: 150px;">Imóvel (${tituloPeriodo})</th>`;
        this.proprietarios.forEach(prop => headHtml += `<th>${SecurityUtils.escapeHtml(prop.nome)}</th>`);
        headHtml += '<th>Total</th></tr>';
        tableHead.innerHTML = headHtml;

        tableBody.innerHTML = '';

        this.imoveis.forEach(imovel => {
            let rowHtml = `<tr><td><strong>${SecurityUtils.escapeHtml(imovel.nome)}</strong></td>`;
            let totalImovel = 0;
            this.proprietarios.forEach(prop => {
                const linha = this.matriz.find(l => l.proprietario_id === prop.proprietario_id);
                const valor = (linha && linha.valores[imovel.nome]) || 0;
                totalImovel += valor;
                rowHtml += `<td class="text-end">${valor > 0 ? `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>`;
            });
            rowHtml += `<td class="text-end"><strong>R$ ${totalImovel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td></tr>`;
            tableBody.innerHTML += rowHtml;
        });

        let totalRowHtml = '<tr class="table-secondary"><td class="fw-bold">Total por Proprietário</td>';
        let granTotal = 0;
        this.proprietarios.forEach(prop => {
            const totalProp = this.matriz
                .filter(l => l.proprietario_id === prop.proprietario_id)
                .reduce((sum, l) => sum + Object.values(l.valores).reduce((s, v) => s + (v || 0), 0), 0);
            granTotal += totalProp;
            totalRowHtml += `<td class="text-end fw-bold">R$ ${totalProp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>`;
        });
        totalRowHtml += `<td class="text-end fw-bold text-primary">R$ ${granTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`;
        tableBody.innerHTML += totalRowHtml;
    }
}

window.alugueisModule = new AlugueisModule();