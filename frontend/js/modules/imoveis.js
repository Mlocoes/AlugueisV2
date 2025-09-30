class ImoveisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.modalManager = null;
        this.imoveis = [];
        this.currentEditId = null;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    load() {
        this.container = this.isMobile
            ? document.getElementById('imoveis-list-mobile')
            : document.getElementById('imoveis-table-body');

        // If container not found, wait a bit and try again (timing issue)
        if (!this.container) {
            console.log('[ImoveisModule] Container not found, waiting 100ms and trying again...');
            setTimeout(() => {
                this.container = this.isMobile
                    ? document.getElementById('imoveis-list-mobile')
                    : document.getElementById('imoveis-table-body');
                console.log('[ImoveisModule] Container found after delay:', !!this.container);
                
                if (this.container) {
                    this.modalManager = new ModalManager('novo-imovel-modal', 'edit-imovel-modal');
                    this.bindPageEvents();
                    this.bindContainerEvents();
                    this.loadImoveis();
                }
            }, 100);
            return;
        }

        this.modalManager = new ModalManager('novo-imovel-modal', 'edit-imovel-modal');
        this.bindPageEvents();
        this.bindContainerEvents();
        this.loadImoveis();
        
        const isAdmin = window.authService && window.authService.isAdmin();
        this.applyPermissions(isAdmin);
    }

    async handleApiCall(apiCall, loadingMessage, errorMessagePrefix) {
        this.uiManager.showLoading(loadingMessage);
        try {
            return await apiCall();
        } catch (error) {
            this.uiManager.showError(`${errorMessagePrefix}. Please try again.`);
            return null;
        } finally {
            this.uiManager.hideLoading();
        }
    }

    bindPageEvents() {
        const btnNovo = document.getElementById('btn-novo-imovel');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => this.showNewModal());
        }

        const formNovo = document.getElementById('form-novo-imovel');
        if (formNovo) {
            formNovo.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(formNovo).entries());
                this.handleCreate(data, formNovo);
            });
        }

        const formEdit = document.getElementById('form-edit-imovel');
        if (formEdit) {
            formEdit.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(formEdit).entries());
                this.handleUpdate(data);
            });
        }
    }

    bindContainerEvents() {
        if (!this.container) return;
        this.container.addEventListener('click', e => {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-btn');

            const itemElement = e.target.closest('[data-id]');
            if (!itemElement) return;

            const id = parseInt(itemElement.dataset.id, 10);

            if (editButton) this.editImovel(id);
            if (deleteButton) this.deleteImovel(id);
        });
    }

    async loadImoveis() {
        const result = await this.handleApiCall(
            () => this.apiService.getImoveis(),
            'Carregando imóveis...',
            'Erro ao carregar imóveis'
        );
        if (result && Array.isArray(result)) {
            this.imoveis = result;
            this.render();
        } else {
            this.imoveis = [];
            this.render();
            this.uiManager.showError('Dados de imóveis inválidos recebidos do servidor.');
        }
    }

    render() {
        if (!this.container) return;
        if (this.imoveis.length === 0) {
            this.container.innerHTML = this.isMobile
                ? `<div class="text-center p-4">Nenhum imóvel encontrado.</div>`
                : `<tr><td colspan="6" class="text-center">Nenhum imóvel encontrado.</td></tr>`;
            return;
        }

        if (this.isMobile) {
            this.container.innerHTML = this.imoveis.map(imovel => this.renderMobileCard(imovel)).join('');
        } else {
            this.container.innerHTML = this.imoveis.map(imovel => this.renderImovelRow(imovel)).join('');
        }
    }

    renderMobileCard(imovel) {
        const sanitize = (str) => str ? String(str).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','/':'&#x2F;'})[c]) : '';
        const dataIdAttribute = `data-id="${imovel.id}"`;
        const statusAlugado = imovel.alugado ? '<span class="badge bg-danger">Alugado</span>' : '<span class="badge bg-success">Disponível</span>';
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        return `
            <div class="card mobile-card mb-2" ${dataIdAttribute}>
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h5 class="card-title mb-1">${sanitize(imovel.nome)}</h5>
                            <h6 class="card-subtitle mb-2 text-muted small">${sanitize(imovel.tipo_imovel) || 'Sem tipo'}</h6>
                        </div>
                        <div class="mobile-card-actions">
                            <button class="btn btn-sm btn-outline-primary edit-btn" ${disabledAttr}><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-btn" ${disabledAttr}><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="card-text small">
                        <p class="mb-1"><strong>Endereço:</strong> ${sanitize(imovel.endereco) || 'N/A'}</p>
                        <p class="mb-1"><strong>Valor:</strong> R$ ${imovel.valor_mercado ? imovel.valor_mercado.toLocaleString('pt-BR') : 'N/A'}</p>
                        <p class="mb-0"><strong>Status:</strong> ${statusAlugado}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderImovelRow(imovel) {
        const sanitize = (str) => str ? String(str).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','/':'&#x2F;'})[c]) : '';
        const dataIdAttribute = `data-id="${imovel.id}"`;
        const statusAlugado = imovel.alugado ? '<span class="badge bg-danger">Alugado</span>' : '<span class="badge bg-success">Disponível</span>';
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        return `
            <tr ${dataIdAttribute}>
                <td><strong>${sanitize(imovel.nome)}</strong><br><small class="text-muted">${sanitize(imovel.tipo_imovel) || 'Sem tipo'}</small></td>
                <td>${sanitize(imovel.endereco)}</td>
                <td>${imovel.area_total || '—'} m²</td>
                <td>R$ ${imovel.valor_mercado ? imovel.valor_mercado.toLocaleString('pt-BR') : '—'}</td>
                <td>${statusAlugado}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary edit-btn me-2" ${disabledAttr}><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" ${disabledAttr}><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }

    showNewModal() {
        this.currentEditId = null;
        const form = document.getElementById('form-novo-imovel');
        if (form) form.reset();
        this.modalManager.show('novo-imovel-modal');
    }

    async handleCreate(data, formElement) {
        const result = await this.handleApiCall(
            () => this.apiService.createImovel(data),
            'Criando imóvel...',
            'Erro ao criar imóvel'
        );
        if (result) {
            this.modalManager.hide('novo-imovel-modal');
            formElement.reset();
            this.loadImoveis();
            this.uiManager.showSuccessToast('Sucesso', 'Imóvel criado com sucesso.');
        }
    }

    async editImovel(id) {
        const imovel = this.imoveis.find(p => p.id === id);
        if (!imovel) {
            this.uiManager.showError('Imóvel não encontrado.');
            return;
        }

        this.currentEditId = id;
        const form = document.getElementById('form-edit-imovel');
        if (!form) return;

        Object.keys(imovel).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = imovel[key] || '';
            }
        });

        this.modalManager.show('edit-imovel-modal');
    }

    async handleUpdate(data) {
        if (!this.currentEditId) return;

        const result = await this.handleApiCall(
            () => this.apiService.updateImovel(this.currentEditId, data),
            'Atualizando imóvel...',
            'Erro ao atualizar imóvel'
        );

        if (result) {
            this.modalManager.hide('edit-imovel-modal');
            this.loadImoveis();
            this.uiManager.showSuccessToast('Sucesso', 'Imóvel atualizado com sucesso.');
        }
    }

    async deleteImovel(id) {
        const imovel = this.imoveis.find(p => p.id === id);
        if (!imovel) return;

        const confirmed = await this.uiManager.showConfirm('Excluir Imóvel', `Tem certeza que deseja excluir ${imovel.nome}?`, 'danger');
        if (!confirmed) return;

        const response = await this.handleApiCall(
            () => this.apiService.deleteImovel(id),
            'Excluindo imóvel...',
            'Erro ao excluir imóvel'
        );

        if (response) {
            this.loadImoveis();
            this.uiManager.showSuccessToast('Sucesso', 'Imóvel excluído com sucesso.');
        }
    }

    applyPermissions(isAdmin) {
        const btnNovo = document.getElementById('btn-novo-imovel');
        if (btnNovo) {
            btnNovo.style.display = isAdmin ? 'block' : 'none';
        }
        this.render();
    }
}

window.imoveisModule = new ImoveisModule();