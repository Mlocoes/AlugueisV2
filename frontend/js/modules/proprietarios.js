class ProprietariosModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.modalManager = null;
        this.proprietarios = [];
        this.currentEditId = null;
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    load() {
        this.container = this.isMobile
            ? document.getElementById('proprietarios-list-mobile')
            : document.getElementById('proprietarios-table-body');

        // If container not found, wait a bit and try again (timing issue)
        if (!this.container) {
            console.log('[ProprietariosModule] Container not found, waiting 100ms and trying again...');
            setTimeout(() => {
                this.container = this.isMobile
                    ? document.getElementById('proprietarios-list-mobile')
                    : document.getElementById('proprietarios-table-body');
                console.log('[ProprietariosModule] Container found after delay:', !!this.container);
                
                if (this.container) {
                    this.modalManager = new ModalManager('proprietario-modal');
                    this.bindPageEvents();
                    this.bindContainerEvents();
                    this.loadProprietarios();
                }
            }, 100);
            return;
        }
        
        this.modalManager = new ModalManager('proprietario-modal');
        this.bindPageEvents();
        this.bindContainerEvents();
        this.loadProprietarios();

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
        const btnNovo = document.getElementById('btn-novo-proprietario');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => this.showNewModal());
        }

        const form = document.getElementById('form-proprietario');
        form?.addEventListener('submit', e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            if (this.currentEditId) {
                this.handleUpdate(data);
            } else {
                this.handleCreate(data, form);
            }
        });
    }

    bindContainerEvents() {
        if (!this.container) return;
        this.container.addEventListener('click', e => {
            const editButton = e.target.closest('.edit-btn');
            const deleteButton = e.target.closest('.delete-btn');

            const itemElement = e.target.closest('[data-id]');
            if (!itemElement) return;

            const id = parseInt(itemElement.dataset.id, 10);

            if (editButton) this.editProprietario(id);
            if (deleteButton) this.deleteProprietario(id);
        });
    }

    async loadProprietarios() {
        const result = await this.handleApiCall(
            () => this.apiService.getProprietarios(),
            'Carregando proprietários...',
            'Erro ao carregar proprietários'
        );
        if (result && Array.isArray(result)) {
            this.proprietarios = result;
            this.render();
        } else {
            this.proprietarios = [];
            this.render();
            this.uiManager.showError('Dados de proprietários inválidos recebidos do servidor.');
        }
    }

    render() {
        if (!this.container) return;
        if (this.proprietarios.length === 0) {
            this.container.innerHTML = this.isMobile
                ? `<div class="text-center p-4">Nenhum proprietário encontrado.</div>`
                : `<tr><td colspan="6" class="text-center">Nenhum proprietário encontrado.</td></tr>`;
            return;
        }

        if (this.isMobile) {
            this.container.innerHTML = this.proprietarios.map(prop => this.renderMobileCard(prop)).join('');
        } else {
            this.container.innerHTML = this.proprietarios.map(prop => this.renderProprietarioRow(prop)).join('');
        }
    }

    renderMobileCard(prop) {
        const sanitize = (str) => str ? String(str).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','/':'&#x2F;'})[c]) : '';
        const dataIdAttribute = `data-id="${prop.id}"`;
        const fullName = `${prop.nome || ''} ${prop.sobrenome || ''}`.trim();
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        return `
            <div class="card mobile-card mb-2" ${dataIdAttribute}>
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <h5 class="card-title mb-1">${sanitize(fullName)}</h5>
                        <div class="mobile-card-actions">
                            <button class="btn btn-sm btn-outline-primary edit-btn" ${disabledAttr}><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger delete-btn" ${disabledAttr}><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                    <div class="card-text small">
                        <p class="mb-1"><strong>Doc:</strong> ${sanitize(prop.documento) || 'N/A'}</p>
                        <p class="mb-1"><strong>Tel:</strong> ${sanitize(prop.telefone) || 'N/A'}</p>
                        <p class="mb-0"><strong>Email:</strong> ${sanitize(prop.email) || 'N/A'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderProprietarioRow(prop) {
        const sanitize = (str) => str ? String(str).replace(/[<>&"'/]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','/':'&#x2F;'})[c]) : '';
        const dataIdAttribute = `data-id="${prop.id}"`;
        const fullName = `${prop.nome || ''} ${prop.sobrenome || ''}`.trim();
        const isAdmin = window.authService && window.authService.isAdmin();
        const disabledAttr = isAdmin ? '' : 'disabled';

        return `
            <tr ${dataIdAttribute}>
                <td>${sanitize(prop.id)}</td>
                <td>${sanitize(fullName)}</td>
                <td>${sanitize(prop.documento) || 'N/A'}</td>
                <td>${sanitize(prop.telefone) || 'N/A'}</td>
                <td>${sanitize(prop.email) || 'N/A'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary edit-btn me-2" ${disabledAttr}><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" ${disabledAttr}><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }

    showNewModal() {
        this.currentEditId = null;
        const form = document.getElementById('form-proprietario');
        if (form) form.reset();
        this.modalManager.setTitle('Novo Proprietário');
        this.modalManager.show();
    }

    async handleCreate(data, formElement) {
        const result = await this.handleApiCall(
            () => this.apiService.createProprietario(data),
            'Criando proprietário...',
            'Erro ao criar proprietário'
        );
        if (result) {
            this.modalManager.hide();
            formElement.reset();
            this.loadProprietarios();
            this.uiManager.showSuccessToast('Sucesso', 'Proprietário criado com sucesso.');
        }
    }

    async editProprietario(id) {
        const proprietario = this.proprietarios.find(p => p.id === id);
        if (!proprietario) {
            this.uiManager.showError('Proprietário não encontrado.');
            return;
        }

        this.currentEditId = id;
        const form = document.getElementById('form-proprietario');
        if (!form) return;

        Object.keys(proprietario).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = proprietario[key] || '';
            }
        });

        this.modalManager.setTitle('Editar Proprietário');
        this.modalManager.show();
    }

    async handleUpdate(data) {
        if (!this.currentEditId) return;

        const result = await this.handleApiCall(
            () => this.apiService.updateProprietario(this.currentEditId, data),
            'Atualizando proprietário...',
            'Erro ao atualizar proprietário'
        );

        if (result) {
            this.modalManager.hide();
            this.loadProprietarios();
            this.uiManager.showSuccessToast('Sucesso', 'Proprietário atualizado com sucesso.');
        }
    }

    async deleteProprietario(id) {
        const proprietario = this.proprietarios.find(p => p.id === id);
        if (!proprietario) return;

        const confirmed = await this.uiManager.showConfirm('Excluir Proprietário', `Tem certeza que deseja excluir ${proprietario.nome}?`, 'danger');
        if (!confirmed) return;

        const response = await this.handleApiCall(
            () => this.apiService.deleteProprietario(id),
            'Excluindo proprietário...',
            'Erro ao excluir proprietário'
        );

        if (response) {
            this.loadProprietarios();
            this.uiManager.showSuccessToast('Sucesso', 'Proprietário excluído com sucesso.');
        }
    }

    applyPermissions(isAdmin) {
        const btnNovo = document.getElementById('btn-novo-proprietario');
        if (btnNovo) {
            btnNovo.style.display = isAdmin ? 'block' : 'none';
        }
        this.render();
    }
}

window.proprietariosModule = new ProprietariosModule();