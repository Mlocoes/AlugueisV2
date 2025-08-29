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
        // Botón y modal para novo imóvel
        const btnNovo = document.getElementById('btn-novo-imovel');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => this.showNewModal());
        }
        const formNovo = document.getElementById('form-novo-imovel');
        if (formNovo) {
            formNovo.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(formNovo);
                const data = Object.fromEntries(formData.entries());
                this.handleCreateData(data, formNovo);
            });
        }
        // Formulario de edición
        const form = document.getElementById('edit-imovel-form');
        if (form) {
            form.addEventListener('submit', (event) => this.handleUpdate(event));
        }
    }

    showNewModal() {
        const modalEl = document.getElementById('novo-imovel-modal');
        if (!modalEl) {
            this.uiManager.showErrorToast('Modal de novo imóvel não encontrado no DOM.');
            return;
        }
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    async handleCreateData(data, formElement) {
        // Adaptar campos según modelo Imovel
        const allowed = ['nome', 'endereco', 'tipo_imovel', 'area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_anual', 'condominio_mensal', 'observacoes', 'ativo'];
        const numericFields = ['area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_anual', 'condominio_mensal'];
        const payload = {};
        for (const key of allowed) {
            if (key in data) {
                let val = data[key];
                if (val === '') { val = null; }
                if (numericFields.includes(key)) {
                    payload[key] = val !== null ? Number(val) : null;
                } else if (key === 'ativo') {
                    payload[key] = val === 'true' || val === true;
                } else {
                    payload[key] = val;
                }
            }
        }
        // Validación de campos obligatorios
        const requiredFields = ['nome', 'endereco'];
        for (const field of requiredFields) {
            if (!payload[field] || payload[field].trim() === '') {
                this.uiManager.showErrorToast('Campos obrigatórios não podem estar em branco', `Preencha o campo: ${field}`);
                return;
            }
        }
        try {
            this.uiManager.showLoading('Criando imóvel...');
            const response = await this.apiService.createImovel(payload);
            if (response && response.success) {
                const modalEl = document.getElementById('novo-imovel-modal');
                if (modalEl) {
                    // Mover el foco fuera del modal antes de cerrarlo
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
                formElement.reset();
                // Limpieza manual de cualquier backdrop residual
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(bd => bd.remove());
                // Restaurar scroll solo si la pestaña imoveis está activa
                const tabImoveis = document.getElementById('imoveis');
                if (tabImoveis && tabImoveis.classList.contains('active')) {
                    const tableResponsive = tabImoveis.querySelector('.table-responsive');
                    if (tableResponsive) {
                        tableResponsive.style.overflowY = 'auto';
                        tableResponsive.style.maxHeight = '';
                    }
                }
                // Siempre restaurar el scroll del body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = 'auto';
                this.uiManager.showSuccessToast('Imóvel cadastrado', 'O imóvel foi cadastrado com sucesso.');
                // Limpiar clases y scroll del body
                document.body.classList.remove('modal-open');
                document.body.style.overflow = 'auto';
            } else {
                // Lanzar error con mensaje siempre
                throw new Error(response?.error || 'Erro ao criar imóvel');
            }
        } catch (error) {
            const msg = error && error.message ? error.message : 'Erro desconhecido ao criar imóvel';
            this.uiManager.showErrorToast('Erro ao criar imóvel', msg);
        } finally {
            this.uiManager.hideLoading();
            // Eliminación forzada del loader global si persiste
            const loader = document.getElementById('global-loader');
            if (loader) loader.remove();
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
            // Sensibiliza alugado correctamente usando o campo 'ativo'
            const alugado = imovel.ativo ? '<span class="badge bg-success">Sim</span>' : '<span class="badge bg-secondary">Não</span>';
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
                        <td>${alugado}</td>
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
        // Verificar autenticación antes de editar
        if (!window.authService || !window.authService.isAuthenticated()) {
            this.uiManager.showErrorToast('Você precisa estar autenticado para editar imóveis.', 'error');
            if (window.loginManager) {
                window.loginManager.showLoginModal();
            }
            return;
        }
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
                if (key === 'ativo') {
                    input.value = imovel[key] ? 'true' : 'false';
                } else {
                    input.value = imovel[key];
                }
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
        const raw = Object.fromEntries(formData.entries());

        // Campos permitidos por el backend (modelo Imovel)
        const allowed = ['nome', 'endereco', 'tipo_imovel', 'area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_anual', 'condominio_mensal', 'observacoes', 'ativo'];
        const numericFields = ['area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_anual', 'condominio_mensal'];

        // Construir payload filtrado y tipado
        const data = {};
        for (const key of allowed) {
            if (key in raw) {
                let val = raw[key];
                if (val === '') { val = null; }
                if (numericFields.includes(key)) {
                    data[key] = val !== null ? Number(val) : null;
                } else if (key === 'ativo') {
                    data[key] = val === 'true' || val === true;
                } else {
                    data[key] = val;
                }
            }
        }

        // Validación solo para campos obligatorios
        const requiredFields = ['nome', 'endereco'];
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                this.uiManager.showErrorToast('Campos obrigatórios não podem estar em branco', `Preencha o campo: ${field}`);
                return;
            }
        }

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
