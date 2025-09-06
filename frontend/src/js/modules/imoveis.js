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
        this.imovelToDeleteId = null; // <-- Novo campo para guardar o id a ser eliminado
    }


    init() {
        if (this.initialized) return;
        // ...código existente...
        this.bindEvents();
            // Interceptar submit do formulário de Importar (Novo Imóvel)
            const formNovoImportar = document.getElementById('form-novo-imovel-importar');
            if (formNovoImportar) {
                formNovoImportar.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = new FormData(formNovoImportar);
                    const data = Object.fromEntries(formData.entries());
                    this.handleCreateData(data, formNovoImportar);
                });
            }

            // Aplicar el patrón de focus management que funciona en usuario alterar
            const modalNovoImovel = document.getElementById('novo-imovel-modal');
            if (modalNovoImovel) {
                modalNovoImovel.addEventListener('hide.bs.modal', () => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log('🔧 Focus transferido antes del cierre del modal novo-imovel');
                });
            }

            const modalNovoImovelImportar = document.getElementById('novo-imovel-importar-modal');
            if (modalNovoImovelImportar) {
                modalNovoImovelImportar.addEventListener('hide.bs.modal', () => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log('🔧 Focus transferido antes del cierre del modal novo-imovel-importar');
                });
            }

            const modalEditarImovel = document.getElementById('editar-imovel-modal');
            if (modalEditarImovel) {
                modalEditarImovel.addEventListener('hide.bs.modal', () => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log('🔧 Focus transferido antes del cierre del modal editar-imovel');
                });
            }

            // INTERCEPTAR CLICS EN BOTONES DE CERRAR ANTES DE QUE BOOTSTRAP PROCESE
            const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
            closeButtons.forEach(button => {
                const modalId = button.closest('.modal')?.id;
                if (modalId && modalId.includes('imovel')) {
                    button.addEventListener('click', (e) => {
                        // Desenfocar inmediatamente ANTES de que Bootstrap inicie el proceso
                        if (document.activeElement) document.activeElement.blur();
                        document.body.focus();
                        console.log(`🔧 PREEMPTIVE: Focus transferido antes del cierre por botón X en ${modalId}`);
                    });
                }
            });
        this.initialized = true;
    }

    async load() {
        this.init();
        await this.loadImoveis();
    }

    bindEvents() {
        // Botão e modal para novo imóvel
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
        // Formulário de edição
        const form = document.getElementById('edit-imovel-form');
        if (form) {
            form.addEventListener('submit', (event) => this.handleUpdate(event));
        }
        // Integrar o botão de confirmação do modal visual
        const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao-imovel');
        if (btnConfirmarExclusao) {
            btnConfirmarExclusao.addEventListener('click', () => {
                if (this.imovelToDeleteId) {
                    this._deleteImovelConfirmed(this.imovelToDeleteId);
                    this.imovelToDeleteId = null;
                    const modalEl = document.getElementById('modal-confirmar-exclusao-imovel');
                    if (modalEl) {
                        // Aplicar la solución de focus management que funciona en alterar usuario
                        if (document.activeElement) document.activeElement.blur();
                        document.body.focus();
                        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        modal.hide();
                    }
                }
            });
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
        // Adaptar campos según modelo Imovel actualizado
        const allowed = ['nome', 'endereco', 'tipo_imovel', 'area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_mensal', 'condominio_mensal', 'numero_quartos', 'numero_banheiros', 'numero_vagas_garagem', 'alugado'];
        const numericFields = ['area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_mensal', 'condominio_mensal', 'numero_quartos', 'numero_banheiros', 'numero_vagas_garagem'];
        const payload = {};
        for (const key of allowed) {
            if (key in data) {
                let val = data[key];
                if (val === '') { val = null; }
                if (numericFields.includes(key)) {
                    payload[key] = val !== null ? Number(val) : null;
                } else if (key === 'alugado') {
                    payload[key] = val === 'true' || val === true;
                } else {
                    payload[key] = val;
                }
            } else if (key === 'alugado') {
                // Los checkboxes no aparecen en FormData cuando no están marcados
                payload[key] = false;
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
                // Detectar el modal correcto
                let modalId = 'novo-imovel-modal';
                if (formElement && formElement.id === 'form-novo-imovel-importar') {
                    modalId = 'novo-imovel-importar-modal';
                }
                // Aplicar la solución de focus management que funciona en alterar usuario
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
                if (modal) modal.hide();
                formElement.reset();
                // Limpiar backdrop residual
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(bd => bd.remove());
                // Recargar lista de imóveis
                await this.loadImoveis();
                this.uiManager.showSuccessToast('Imóvel cadastrado', 'O imóvel foi cadastrado com sucesso.');
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
            // Usando campo 'alugado' actualizado
            const statusAlugado = imovel.alugado ? '<span class="badge bg-danger">Alugado</span>' : '<span class="badge bg-success">Disponível</span>';
            return `
                    <tr>
                        <td>${imovel.nome || ''}</td>
                        <td>${imovel.endereco || ''}</td>
                        <td>${imovel.tipo_imovel || ''}</td>
                        <td>${imovel.area_total || ''}</td>
                        <td>${imovel.area_construida || ''}</td>
                        <td>${imovel.valor_cadastral || ''}</td>
                        <td>${imovel.valor_mercado || ''}</td>
                        <td>${imovel.iptu_mensal || ''}</td>
                        <td>${imovel.condominio_mensal || ''}</td>
                        <td>${statusAlugado}</td>
                        <td>${imovel.data_cadastro ? new Date(imovel.data_cadastro).toLocaleDateString() : ''}</td>
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
                if (key === 'alugado') {
                    input.checked = Boolean(imovel[key]);
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

        // Campos permitidos por el backend (modelo Imovel actualizado)
        const allowed = ['nome', 'endereco', 'tipo_imovel', 'area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_mensal', 'condominio_mensal', 'numero_quartos', 'numero_banheiros', 'numero_vagas_garagem', 'alugado'];
        const numericFields = ['area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_mensal', 'condominio_mensal', 'numero_quartos', 'numero_banheiros', 'numero_vagas_garagem'];

        // Construir payload filtrado y tipado
        const data = {};
        for (const key of allowed) {
            if (key in raw) {
                let val = raw[key];
                if (val === '') { val = null; }
                if (numericFields.includes(key)) {
                    data[key] = val !== null ? Number(val) : null;
                } else if (key === 'alugado' || key === 'tem_garagem') {
                    data[key] = val === 'true' || val === true;
                } else {
                    data[key] = val;
                }
            } else if (key === 'alugado' || key === 'tem_garagem') {
                // Los checkboxes no aparecen en FormData cuando no están marcados
                data[key] = false;
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

        // Aplicar la solución de focus management que funciona en alterar usuario
        if (document.activeElement) document.activeElement.blur();
        document.body.focus();
        const editModal = bootstrap.Modal.getInstance(document.getElementById('edit-imovel-modal'));
        editModal.hide();
        this.uiManager.showSuccessToast('Imóvel atualizado', 'Os dados foram atualizados com sucesso.');
        this.loadImoveis();
    }

    deleteImovel(id) {
        // Mostrar el modal visual en vez de confirm()
        this.imovelToDeleteId = id;
        const modalEl = document.getElementById('modal-confirmar-exclusao-imovel');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    async _deleteImovelConfirmed(id) {
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
