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
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    async load() {
        if (!this.initialized) {
            this.init();
        }
        await this.loadDatas();
    }

    init() {
        if (this.initialized) return;
        this.container = this.isMobile
            ? document.getElementById('participacoes-list-mobile')
            : document.getElementById('participacoes-matrix-body');

        if (!this.container) {
            console.warn("Container for ParticipacoesModule not found.");
            return;
        }

        this.bindContainerEvents();
        this.initialized = true;
    }

    bindContainerEvents() {
        if (!this.container) return;
        this.container.addEventListener('click', e => {
            const novaVersaoButton = e.target.closest('.nova-versao-btn');
            if (novaVersaoButton) {
                const imovelId = novaVersaoButton.dataset.imovelId;
                if (imovelId) {
                    this.novaVersao(imovelId);
                }
            }
        });
    }

    async loadDatas() {
        try {
            this.uiManager.showLoading('Carregando conjuntos...');
            const datas = await this.apiService.getDatasParticipacoes();
            this.uiManager.hideLoading();
            
            this.datas = (datas && Array.isArray(datas)) ? datas : [];
            this.selectedData = this.datas.length ? this.datas[0].versao_id : "ativo";

            this.renderDataSelector();
            
            if (this.selectedData) {
                await this.loadParticipacoes(this.selectedData);
            }
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar conjuntos: ' + error.message, 'error');
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

        let html = '<label for="data-participacoes" class="form-label me-2">Conjunto:</label>';
        html += `<select id="data-participacoes" class="form-select" style="width: auto;">`;
        this.datas.forEach(item => {
            const value = item.versao_id || "ativo";
            const isSelected = value === (this.selectedData || "ativo");
            html += `<option value="${SecurityUtils.escapeHtml(value)}"${isSelected ? ' selected' : ''}>${SecurityUtils.escapeHtml(item.label)}</option>`;
        });
        html += '</select>';
        SecurityUtils.setSafeHTML(container, html);

        document.getElementById('data-participacoes').addEventListener('change', (e) => {
            this.selectedData = e.target.value;
            this.loadParticipacoes(this.selectedData);
        });
    }

    async loadParticipacoes(dataId = null) {
        try {
            this.uiManager.showLoading('Carregando participações...');
            const [participacoes, proprietarios, imoveis] = await Promise.all([
                this.apiService.getParticipacoes(dataId),
                this.apiService.getProprietarios(),
                this.apiService.getImoveis()
            ]);
            
            this.participacoes = participacoes || [];
            this.proprietarios = proprietarios || [];
            this.imoveis = imoveis || [];
            this.render();
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar participações: ' + error.message, 'error');
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
        this.applyPermissions();
    }

    renderMobileCards() {
        const isAdmin = window.authService && window.authService.isAdmin();
        const cardsHtml = this.imoveis.map(imovel => {
            const participacoesDoImovel = this.participacoes.filter(p => p.imovel_id === imovel.id && p.porcentagem > 0);
            if (participacoesDoImovel.length === 0) return '';

            const participantsHtml = participacoesDoImovel.map(part => {
                const proprietario = this.proprietarios.find(prop => prop.id === part.proprietario_id);
                const percentage = (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem).toFixed(2);
                return `<div class="d-flex justify-content-between py-1"><span>${proprietario ? SecurityUtils.escapeHtml(proprietario.nome) : 'Desconhecido'}</span><strong>${percentage}%</strong></div>`;
            }).join('');

            const actionButton = isAdmin ? `<button class="btn btn-sm btn-outline-primary nova-versao-btn" data-imovel-id="${imovel.id}"><i class="fas fa-edit me-1"></i>Editar</button>` : '';

            return `
                <div class="card mobile-card mb-3">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                        ${actionButton}
                    </div>
                    <div class="card-body p-3">${participantsHtml}</div>
                </div>`;
        }).join('');
        this.container.innerHTML = cardsHtml || `<div class="text-center p-4">Nenhuma participação encontrada.</div>`;
    }

    renderDesktopTable() {
        const tableHead = document.getElementById('participacoes-matrix-head');
        const tableBody = this.container;
        const tableContainer = document.getElementById('participacoes-table-container');

        if (tableContainer) tableContainer.style.display = 'block';
        if (!tableHead || !tableBody) return;

        if (this.imoveis.length === 0) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="1" class="text-center">Nenhuma participação encontrada.</td></tr>';
            return;
        }

        let headHtml = '<tr><th>Imóvel</th>';
        this.proprietarios.forEach(prop => headHtml += `<th>${SecurityUtils.escapeHtml(prop.nome)}</th>`);
        headHtml += '<th>Total</th><th>Ações</th></tr>';
        tableHead.innerHTML = headHtml;

        tableBody.innerHTML = '';
        this.imoveis.forEach(imovel => {
            let rowHtml = `<tr><td>${SecurityUtils.escapeHtml(imovel.nome)}</td>`;
            let total = 0;
            this.proprietarios.forEach(prop => {
                const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                const val = part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                total += val;
                rowHtml += `<td>${val > 0 ? val.toFixed(2) + ' %' : '-'}</td>`;
            });
            rowHtml += `<td><strong>${Math.round(total)}%</strong></td>`;
            rowHtml += `<td><button class="btn btn-sm btn-outline-primary nova-versao-btn admin-only" data-imovel-id="${imovel.id}"><i class="fas fa-copy"></i></button></td></tr>`;
            tableBody.innerHTML += rowHtml;
        });
    }

    async novaVersao(imovelId) {
        if (!window.authService.isAdmin()) {
            this.uiManager.showError('Apenas administradores podem criar uma nova versão.');
            return;
        }

        const imovel = this.imoveis.find(i => i.id == imovelId);
        if (!imovel) return;

        const participacoesAtuais = this.proprietarios.map(prop => {
            const part = this.participacoes.find(p => p.imovel_id == imovelId && p.proprietario_id === prop.id);
            const porcentagem = part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
            return { proprietario: prop, porcentagem };
        });

        const modalId = 'nova-versao-modal';
        this.createModal(modalId, imovel, participacoesAtuais);
        const modal = new bootstrap.Modal(document.getElementById(modalId));
        modal.show();
    }

    createModal(modalId, imovel, participacoes) {
        let modalElement = document.getElementById(modalId);
        if (modalElement) modalElement.remove();

        const inputsHtml = participacoes.map(p => `
            <div class="mb-2">
                <label for="prop-${p.proprietario.id}" class="form-label">${SecurityUtils.escapeHtml(p.proprietario.nome)}</label>
                <input type="number" class="form-control" id="prop-${p.proprietario.id}" value="${p.porcentagem.toFixed(2)}" step="0.01" min="0" max="100">
            </div>
        `).join('');

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nova Versão para ${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${inputsHtml}
                            <div class="mt-3 fw-bold">Total: <span id="total-percent">100.00</span>%</div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="save-nova-versao">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

// feature/mobile-interface
        const modalInstance = document.getElementById(modalId);
        const totalEl = modalInstance.querySelector('#total-percent');

            const body = modalEl.querySelector('#nv-body');
            const im = this.imoveis.find(i => String(i.id) === String(imovelId));
            const tds = this.proprietarios.map(p => {
                const value = porImovel[im.id][p.id];
                return `<td><input type="number" step="0.01" min="0" max="100" data-prop="${SecurityUtils.escapeHtml(p.id)}" class="form-control form-control-sm" style="font-size:0.80rem;" value="${SecurityUtils.escapeHtml(value)}" /></td>`;
            }).join('');
            SecurityUtils.setSafeHTML(body, `<tr data-imovel="${SecurityUtils.escapeHtml(im.id)}"><td>${SecurityUtils.escapeHtml(im.nome)}</td>${tds}<td class="nv-total">0%</td></tr>`);

            const recalc = () => {
                let soma = 0;
                body.querySelectorAll('input[data-prop]').forEach(inp => { soma += Number(inp.value || 0); });
                const somaRounded = Math.round(soma);
                body.querySelector('.nv-total').textContent = somaRounded + '%';
                return { soma, somaRounded };
            };
            body.addEventListener('input', recalc);
            recalc();

            const salvar = async () => {
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
// main

        const updateTotal = () => {
            let total = 0;
            participacoes.forEach(p => {
                const input = modalInstance.querySelector(`#prop-${p.proprietario.id}`);
                total += parseFloat(input.value) || 0;
            });
            totalEl.textContent = total.toFixed(2);
            totalEl.style.color = Math.abs(100 - total) < 0.01 ? 'green' : 'red';
        };

        modalInstance.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('input', updateTotal);
        });

        document.getElementById('save-nova-versao').addEventListener('click', async () => {
            const newParticipacoes = participacoes.map(p => {
                const input = modalInstance.querySelector(`#prop-${p.proprietario.id}`);
                return {
                    imovel_id: imovel.id,
                    proprietario_id: p.proprietario.id,
                    porcentagem: parseFloat(input.value) || 0
                };
            });

            const total = newParticipacoes.reduce((sum, p) => sum + p.porcentagem, 0);
            if (Math.abs(100 - total) > 0.01) {
                this.uiManager.showError("A soma das porcentagens deve ser 100.");
                return;
            }

            try {
                this.uiManager.showLoading('Salvando nova versão...');
                await this.apiService.createNovaVersaoParticipacoes({ participacoes: newParticipacoes });
                this.uiManager.hideLoading();
                this.uiManager.showSuccessToast('Sucesso', 'Nova versão de participações salva.');
                bootstrap.Modal.getInstance(modalInstance).hide();
                this.loadDatas();
            } catch (error) {
                this.uiManager.showError('Erro ao salvar: ' + error.message);
                this.uiManager.hideLoading();
            }
        });

        updateTotal();
    }

    applyPermissions() {
        const isAdmin = window.authService && window.authService.isAdmin();
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'inline-block' : 'none';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.participacoesModule = new ParticipacoesModule();
});