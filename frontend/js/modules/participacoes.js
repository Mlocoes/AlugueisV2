class ParticipacoesModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.participacoes = [];
        this.datas = [];
        this.selectedData = null;
        this.proprietarios = [];
        this.imoveis = [];
        this.container = null;
        this.isMobile = false;
    }

    async load() {
        // Re-evaluate container and device type every time the view is loaded.
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
        this.container = this.isMobile
            ? document.getElementById('participacoes-list-mobile')
            : document.getElementById('participacoes-matrix-body');

        // If container not found, wait a bit and try again (timing issue)
        if (!this.container) {
            console.log('[DEBUG] Container not found, waiting 100ms and trying again...');
            await new Promise(resolve => setTimeout(resolve, 100));
            this.container = this.isMobile
                ? document.getElementById('participacoes-list-mobile')
                : document.getElementById('participacoes-matrix-body');
            console.log('[DEBUG] Container found after delay:', !!this.container);
        }

        if (!this.container) {
            console.warn("ParticipacoesModule: Container not found. View might not be active.");
            return;
        }

        this.bindContainerEvents();
        await this.loadDatas();
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

            if (this.isMobile && this.datas.length > 0) {
                // Em dispositivos móveis, mostrar apenas o conjunto mais recente.
                this.datas = [this.datas[0]];
            }

            this.selectedData = this.datas.length ? this.datas[0].versao_id : "ativo";

            if (!this.isMobile) {
                this.renderDataSelector();
            }
            
            if (this.selectedData) {
                // Para mobile, sempre carregar o conjunto mais recente (ativo)
                const dataToLoad = this.isMobile ? null : this.selectedData;
                await this.loadParticipacoes(dataToLoad);
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

        let targetVersaoId;
        if (this.isMobile) {
            // No mobile, sempre usar null para pegar participações ativas (mais recentes)
            targetVersaoId = null;
        } else {
            if (this.selectedData === 'ativo' || this.selectedData === null) {
                targetVersaoId = null;
            } else {
                targetVersaoId = parseInt(this.selectedData, 10);
            }
        }

        // Filtrar participações para garantir que só do conjunto mais recente sejam exibidas
        // Para participações ativas, versao_id é null ou undefined
        const participacoesFiltradas = this.participacoes.filter(p => {
            if (targetVersaoId === null) {
                return p.versao_id == null || p.versao_id === undefined;
            } else {
                return p.versao_id === targetVersaoId;
            }
        });

        const cardsHtml = this.imoveis.map(imovel => {
            const participacoesDoImovel = participacoesFiltradas.filter(p =>
                p.imovel_id === imovel.id &&
                p.porcentagem > 0
            );
            if (participacoesDoImovel.length === 0) return '';

            const participantsHtml = participacoesDoImovel.map(part => {
                const proprietario = this.proprietarios.find(prop => prop.id === part.proprietario_id);
                const percentage = (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem).toFixed(2);
                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${proprietario ? SecurityUtils.escapeHtml(proprietario.nome) : 'Desconhecido'}
                        <span class="badge bg-primary rounded-pill">${percentage}%</span>
                    </li>
                `;
            }).join('');

            const actionButton = isAdmin ? `<button class="btn btn-sm btn-outline-primary nova-versao-btn" data-imovel-id="${imovel.id}"><i class="fas fa-edit me-1"></i>Editar</button>` : '';

            return `
                <div class="card mobile-card mb-3 shadow-sm">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${SecurityUtils.escapeHtml(imovel.nome)}</h5>
                        ${actionButton}
                    </div>
                    <ul class="list-group list-group-flush">
                        ${participantsHtml}
                    </ul>
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

        let targetVersaoId;
        if (this.selectedData === 'ativo' || this.selectedData === null) {
            targetVersaoId = null;
        } else {
            targetVersaoId = this.selectedData; // Manter como string UUID
        }

        tableBody.innerHTML = '';
        this.imoveis.forEach(imovel => {
            let rowHtml = `<tr><td>${SecurityUtils.escapeHtml(imovel.nome)}</td>`;
            let total = 0;
            this.proprietarios.forEach(prop => {
                const part = this.participacoes.find(p =>
                    p.imovel_id === imovel.id &&
                    p.proprietario_id === prop.id &&
                    (p.versao_id || null) === targetVersaoId
                );
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

        const modalInstance = document.getElementById(modalId);
        const totalEl = modalInstance.querySelector('#total-percent');

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