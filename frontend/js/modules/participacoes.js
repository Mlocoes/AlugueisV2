

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
            const datas = await this.apiService.getDatasParticipacoes();
            this.uiManager.hideLoading();
            
            // Manejar caso donde datas es null o undefined
            if (!datas) {
                this.uiManager.showAlert('Nenhum conjunto de participações encontrado.', 'warning');
                this.datas = [];
                this.selectedData = null;
                this.renderDataSelector();
                return;
            }
            
            if (!Array.isArray(datas)) {
                this.uiManager.showAlert('Erro ao carregar datas.', 'error');
                return;
            }
            
            const seen = new Set();
            this.datas = datas.filter(d => !seen.has(d) && seen.add(d));
            this.selectedData = this.datas.length ? this.datas[0] : null;
            this.renderDataSelector();
            
            if (this.selectedData) {
                await this.loadParticipacoes();
            }
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar datas: ' + error.message, 'error');
            this.uiManager.hideLoading();
        }
    }

    renderDataSelector() {
        const container = document.getElementById('participacoes-data-selector');
        if (!container) return;
        if (!this.datas.length) {
            SecurityUtils.setSafeHTML(container, '<span class="text-muted">Nenhum conjunto disponível</span>');
            return;
        }
        let html = '<label for="data-participacoes">Conjunto de Participações:</label> ';
        html += `<select id="data-participacoes">`;
        for (const d of this.datas) {
            const formattedDate = new Date(d).toLocaleString();
            html += `<option value="${SecurityUtils.escapeHtml(d)}"${d === this.selectedData ? ' selected' : ''}>${SecurityUtils.escapeHtml(formattedDate)}</option>`;
        }
        html += '</select>';
        SecurityUtils.setSafeHTML(container, html);
        document.getElementById('data-participacoes').addEventListener('change', (e) => {
            this.selectedData = e.target.value;
            this.loadParticipacoes();
        });
    }

    async loadParticipacoes() {
        try {
            this.uiManager.showLoading('Carregando participações...');
            const [participacoes, proprietarios, imoveis] = await Promise.all([
                this.apiService.getParticipacoes(this.selectedData),
                this.apiService.getProprietarios(),
                this.apiService.getImoveis()
            ]);
            this.uiManager.hideLoading();
            this.participacoes = participacoes || [];
            this.proprietarios = proprietarios || [];
            this.imoveis = imoveis || [];
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
            SecurityUtils.setSafeHTML(tableHead, '');
            SecurityUtils.setSafeHTML(tableBody, '<tr><td colspan="5" class="text-center text-muted">Nenhuma participação encontrada.</td></tr>');
            return;
        }
        let headHtml = '<tr><th>Imóvel</th>';
        for (const prop of this.proprietarios) {
            headHtml += `<th>${prop.nome}</th>`;
        }
        headHtml += '<th>Total</th><th width="120">Ações</th></tr>';
        SecurityUtils.setSafeHTML(tableHead, headHtml);
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
                    <button class="btn btn-outline-primary admin-only" title="Nova versão" onclick="window.participacoesModule.novaVersao('${imovel.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td></tr>`;
        }
        SecurityUtils.setSafeHTML(tableBody, bodyHtml);
    }

    async novaVersao(imovelId) {
        // Admin-only
        if (!window.authService || !window.authService.isAuthenticated() || window.authService.getUserData()?.tipo !== 'administrador') {
            this.uiManager.showError('Apenas administradores podem criar nova versão.');
            return;
        }
        try {
            // Construir estrutura editável: porcentagens por imóvel/proprietário a partir do conjunto carregado
            const porImovel = {};
            for (const imovel of this.imoveis) {
                porImovel[imovel.id] = {};
                for (const prop of this.proprietarios) {
                    const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                    let val = part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                    porImovel[imovel.id][prop.id] = Number(val.toFixed(2));
                }
            }
            // Render modal simples com inputs percentuais por proprietario para o imóvel clicado
            const modalId = 'nova-versao-participacoes-modal';
            let modalEl = document.getElementById(modalId);
            if (!modalEl) {
                const cols = this.proprietarios.map(p => `<th>${p.nome}</th>`).join('');
                const inputs = this.proprietarios.map(p => `<td><input type="number" step="0.01" min="0" max="100" data-prop="${p.id}" class="form-control form-control-sm" /></td>`).join('');
                document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">Nova versão de participações</h5></div>
                            <div class="modal-body">
                                <p>Edite os percentuais para o imóvel selecionado. A soma deve ser 100%.</p>
                                <table class="table table-sm">
                                    <thead><tr><th>Imóvel</th>${cols}<th>Total</th></tr></thead>
                                    <tbody id="nv-body"></tbody>
                                </table>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" data-bs-dismiss="modal" id="nv-cancelar">Cancelar</button>
                                <button class="btn btn-primary" id="nv-salvar">Salvar nova versão</button>
                            </div>
                        </div>
                    </div>
                </div>`);
                modalEl = document.getElementById(modalId);
            }

            const body = modalEl.querySelector('#nv-body');
            const im = this.imoveis.find(i => String(i.id) === String(imovelId));
            const tds = this.proprietarios.map(p => {
                const value = porImovel[im.id][p.id];
                return `<td><input type="number" step="0.01" min="0" max="100" data-prop="${SecurityUtils.escapeHtml(p.id)}" class="form-control form-control-sm" value="${SecurityUtils.escapeHtml(value)}" /></td>`;
            }).join('');
            SecurityUtils.setSafeHTML(body, `<tr data-imovel="${SecurityUtils.escapeHtml(im.id)}"><td>${SecurityUtils.escapeHtml(im.nome)}</td>${tds}<td id="nv-total">0%</td></tr>`);

            const recalc = () => {
                let soma = 0;
                body.querySelectorAll('input[data-prop]').forEach(inp => { soma += Number(inp.value || 0); });
                const somaRounded = Math.round(soma);
                body.querySelector('#nv-total').textContent = somaRounded + '%';
                return { soma, somaRounded };
            };
            body.addEventListener('input', recalc);
            recalc();

            const salvar = async () => {
                // ...existing code...
                // Normalizar apenas o imóvel editado
                const edited = {};
                body.querySelectorAll('input[data-prop]').forEach(inp => {
                    const pid = Number(inp.getAttribute('data-prop'));
                    edited[pid] = Number(inp.value || 0);
                });
                // Construir payload: copiar conjunto atual, substituindo apenas o imóvel editado
                const payload = { participacoes: [] };
                for (const imovel of this.imoveis) {
                    for (const prop of this.proprietarios) {
                        let val;
                        if (imovel.id === im.id && edited[prop.id] != null) {
                            val = edited[prop.id];
                        } else {
                            const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                            val = part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                        }
                        payload.participacoes.push({ imovel_id: imovel.id, proprietario_id: prop.id, porcentagem: val });
                    }
                }
                // Enviar ao backend
                try {
                    this.uiManager.showLoading('Salvando nova versão...');
                    const resp = await this.apiService.createNovaVersaoParticipacoes(payload);
                    this.uiManager.hideLoading();
                    if (resp && (resp.success || resp.mensagem || resp.message)) {
                        this.uiManager.showSuccess('Nova versão criada com sucesso');
                        // Aplicar focus management antes de cerrar modal exitosamente
                        if (document.activeElement) document.activeElement.blur();
                        document.body.focus();
                        if (window.bootstrap && window.bootstrap.Modal) {
                            const bs = bootstrap.Modal.getOrCreateInstance(modalEl);
                            bs.hide();
                        } else {
                            modalEl.style.display = 'none'; modalEl.classList.remove('show');
                        }
                        // Recarregar dados após sucesso
                        await this.load();
                    } else {
                        this.uiManager.showError('Erro ao criar nova versão: Resposta inesperada do servidor');
                    }
                } catch (error) {
                    this.uiManager.showError('Erro ao criar nova versão: ' + error.message);
                    this.uiManager.hideLoading();
                }
            };

            modalEl.querySelector('#nv-salvar').onclick = salvar;
            
            // Configurar botón cancelar con focus management
            const cancelarBtn = modalEl.querySelector('#nv-cancelar');
            if (cancelarBtn) {
                cancelarBtn.onclick = () => {
                    // Aplicar focus management antes de cerrar
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    
                    if (window.bootstrap && window.bootstrap.Modal) {
                        const bs = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        bs.hide();
                    } else {
                        modalEl.style.display = 'none'; 
                        modalEl.classList.remove('show');
                    }
                };
            }
            
            // Añadir event listener para focus management en hide.bs.modal
            modalEl.addEventListener('hide.bs.modal', () => {
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                console.log('🔧 Focus transferido antes del cierre del modal participações');
            });
            
            if (window.bootstrap && window.bootstrap.Modal) {
                const bs = new bootstrap.Modal(modalEl);
                bs.show();
            } else {
                modalEl.style.display = 'block'; modalEl.classList.add('show');
            }
        } catch (e) {
            this.uiManager.showError('Erro na preparação da nova versão: ' + e.message);
        }
    }
}

// Inicializar módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.participacoesModule = new ParticipacoesModule();
});
