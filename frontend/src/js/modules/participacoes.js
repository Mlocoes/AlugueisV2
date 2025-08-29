

/**
 * Módulo Participacoes - Gestão de participações de imóveis e proprietários
 * Inclui CRUD, seleção de conjuntos, renderização de matriz e validações
 */

class ParticipacoesModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.participacoes = [];
        this.datas = [];
        this.selectedData = null;
        this.proprietarios = [];
        this.imoveis = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
    }

    async load() {
        this.init();
        await this.loadDatas();
    }

    async loadDatas() {
        try {
            this.uiManager.showLoading('Carregando datas de conjuntos...');
            const respDatas = await this.apiService.getDatasParticipacoes();
            this.uiManager.hideLoading();
            if (!respDatas.success || !Array.isArray(respDatas.datas)) {
                this.uiManager.showAlert('Erro ao carregar datas.', 'error');
                return;
            }
            const seen = new Set();
            this.datas = respDatas.datas.filter(d => !seen.has(d) && seen.add(d));
            this.selectedData = this.datas.length ? this.datas[0] : null;
            this.renderDataSelector();
            await this.loadParticipacoes();
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar datas: ' + error.message, 'error');
            this.uiManager.hideLoading();
        }
    }

    renderDataSelector() {
        const container = document.getElementById('participacoes-data-selector');
        if (!container) return;
        if (!this.datas.length) {
            container.innerHTML = '<span class="text-muted">Nenhum conjunto disponível</span>';
            return;
        }
        let html = '<label for="data-participacoes">Conjunto de Participações:</label> ';
        html += `<select id="data-participacoes">`;
        for (const d of this.datas) {
            html += `<option value="${d}"${d === this.selectedData ? ' selected' : ''}>${new Date(d).toLocaleString()}</option>`;
        }
        html += '</select>';
        container.innerHTML = html;
        document.getElementById('data-participacoes').addEventListener('change', (e) => {
            this.selectedData = e.target.value;
            this.loadParticipacoes();
        });
    }

    async loadParticipacoes() {
        try {
            this.uiManager.showLoading('Carregando participações...');
            const [respPart, respProps, respImoveis] = await Promise.all([
                this.apiService.getParticipacoes(this.selectedData),
                this.apiService.getProprietarios(),
                this.apiService.getImoveis()
            ]);
            this.uiManager.hideLoading();
            if (!respPart.success || !respProps.success || !respImoveis.success) {
                this.uiManager.showAlert('Erro ao carregar dados.', 'error');
                return;
            }
            this.participacoes = respPart.data;
            this.proprietarios = respProps.data;
            this.imoveis = respImoveis.data;
            this.renderTable();
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar participações: ' + error.message, 'error');
            this.uiManager.hideLoading();
        }
    }

    renderTable() {
        const tableHead = document.getElementById('participacoes-matrix-head');
        const tableBody = document.getElementById('participacoes-matrix-body');
        const tableContainer = document.getElementById('participacoes-table-container');
        if (tableContainer) tableContainer.style.display = 'block';
        if (!tableHead || !tableBody) return;
        if (!this.participacoes.length || !this.proprietarios.length || !this.imoveis.length) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhuma participação encontrada.</td></tr>';
            return;
        }
        let headHtml = '<tr><th>Imóvel</th>';
        for (const prop of this.proprietarios) {
            headHtml += `<th>${prop.nome}</th>`;
        }
        headHtml += '<th>Total</th><th width="120">Ações</th></tr>';
        tableHead.innerHTML = headHtml;
        let bodyHtml = '';
        for (const imovel of this.imoveis) {
            bodyHtml += `<tr><td>${imovel.nome}</td>`;
            let total = 0;
            for (const prop of this.proprietarios) {
                const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                let val = part ? part.porcentagem : '';
                if (val !== '' && val < 1) val = (val * 100).toFixed(2);
                if (val !== '' && val >= 1) val = Number(val).toFixed(2);
                total += part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                bodyHtml += `<td>${val !== '' ? val + ' %' : '-'}</td>`;
            }
            bodyHtml += `<td><strong>${Math.round(total)}%</strong></td>`;
            bodyHtml += `<td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning admin-only" title="Editar" onclick="window.participacoesModule.editParticipacao('${imovel.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger admin-only" title="Excluir" onclick="window.participacoesModule.deleteParticipacao('${imovel.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td></tr>`;
        }
        tableBody.innerHTML = bodyHtml;
    }

    // Métodos editParticipacao y deleteParticipacao pueden ser implementados aquí
}

// Inicializar módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.participacoesModule = new ParticipacoesModule();
});
