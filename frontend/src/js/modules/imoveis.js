/**
 * Módulo Imóveis - Gestão completa de imóveis
 * Inclui CRUD, importação, exportação e validações
 */
class ImoveisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.imoveis = [];
        this.currentEditId = null;
        this.initialized = false;
    }


    init() {
        if (this.initialized) return;
        // ...existing code...
        this.bindEvents();
        this.initialized = true;
    }

    async load() {
        this.init();
        await this.loadImoveis();
    }

    bindEvents() {
        const form = document.getElementById('edit-imovel-form');
        if (form) {
            form.addEventListener('submit', (event) => this.handleUpdate(event));
        }
    }

    async loadImoveis() {
        try {
            this.uiManager.showLoading('Carregando imóveis...');
            const response = await this.apiService.getImoveis();
            this.uiManager.hideLoading();

            if (!response.success) {
                this.uiManager.showErrorToast('Erro ao carregar imóveis', response.error);
                return;
            }

            this.imoveis = response.data;
            this.renderTable();
            this.updateStats();
        } catch (error) {
            this.uiManager.showErrorToast('Erro ao carregar imóveis', error.message);
            this.uiManager.hideLoading();
        }

    }

    renderTable() {
        const tableBody = document.getElementById('imoveis-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = this.imoveis.map(imovel => {
            const estado = imovel.ativo ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-secondary">Inativo</span>';
            return `
                <tr>
                    <td>${imovel.nome || ''}</td>
                    <td>${imovel.endereco || ''}</td>
                    <td>${imovel.tipo_imovel || ''}</td>
                    <td>${imovel.area_total || ''}</td>
                    <td>${imovel.area_construida || ''}</td>
                    <td>${imovel.valor_cadastral || ''}</td>
                    <td>${imovel.valor_mercado || ''}</td>
                    <td>${imovel.iptu_anual || ''}</td>
                    <td>${imovel.condominio_mensal || ''}</td>
                    <td>${estado}</td>
                    <td>${imovel.data_cadastro ? new Date(imovel.data_cadastro).toLocaleDateString() : ''}</td>
                    <td>${imovel.observacoes || ''}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-warning admin-only" onclick="window.imoveisModule.editImovel(${imovel.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger admin-only" onclick="window.imoveisModule.deleteImovel(${imovel.id})" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStats() {
        const statsElement = document.getElementById('imoveis-stats');
        if (!statsElement) return;
        statsElement.textContent = `Total de imóveis: ${this.imoveis.length}`;
    }

    async editImovel(id) {
        try {
            this.uiManager.showLoading('Carregando dados do imóvel...');
            const response = await this.apiService.getImovel(id);
            this.uiManager.hideLoading();

            if (!response.success) {
                this.uiManager.showErrorToast('Erro ao carregar dados do imóvel', response.error);
                return;
            }

            this.currentEditId = id;
            const imovel = response.data;
            this.fillEditForm(imovel);

            const editModal = new bootstrap.Modal(document.getElementById('edit-imovel-modal'));
            editModal.show();
        } catch (error) {
            this.uiManager.showErrorToast('Erro ao carregar dados do imóvel', error.message);
            this.uiManager.hideLoading();
        }
    }

    fillEditForm(imovel) {
        const form = document.getElementById('edit-imovel-form');
        if (!form) return;
        for (const key in imovel) {
            const input = form.elements[key];
            if (input) {
                input.value = imovel[key];
            }
        }
    }

    async handleUpdate(event) {
        event.preventDefault();

        const form = document.getElementById('edit-imovel-form');
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        this.uiManager.showLoading('Atualizando imóvel...');
        const response = await this.apiService.updateImovel(this.currentEditId, data);
        this.uiManager.hideLoading();

        if (!response.success) {
            this.uiManager.showErrorToast('Erro ao atualizar imóvel', response.error);
            return;
        }

        const editModal = bootstrap.Modal.getInstance(document.getElementById('edit-imovel-modal'));
        editModal.hide();
        this.uiManager.showSuccessToast('Imóvel atualizado', 'Os dados foram atualizados com sucesso.');
        this.loadImoveis();
    }

    async deleteImovel(id) {
        if (!confirm('Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.')) {
            return;
        }

        this.uiManager.showLoading('Excluindo imóvel...');
        const response = await this.apiService.deleteImovel(id);
        this.uiManager.hideLoading();

        if (!response.success) {
            this.uiManager.showErrorToast('Erro ao excluir imóvel', response.error);
            return;
        }

        this.uiManager.showSuccessToast('Imóvel excluído', 'O imóvel foi excluído com sucesso.');
        this.loadImoveis();
    }
}

window.imoveisModule = new ImoveisModule();
