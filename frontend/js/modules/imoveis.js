/**
 * Módulo Imóveis - Gestão completa de imóveis
 * Inclui CRUD, importação, exportação e validações
 */

// Utilidad para guardar logs en localStorage
function logToLocalStorage(message, data) {
    try {
        const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        const entry = { timestamp: new Date().toISOString(), message, data };
        logs.push(entry);
        localStorage.setItem('debugLogs', JSON.stringify(logs));
    } catch (e) {}
}

class ImoveisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.modalManager = null; // Será inicializado no init
        this.imoveis = [];
        this.currentEditId = null;
        this.initialized = false;
        this.imovelToDeleteId = null;
    }

    init() {
        if (this.initialized) return;

        // Inicializar ModalManagers
        this.modalManager = new ModalManager('novo-imovel-modal', 'edit-imovel-modal');
        
        const confirmarExclusaoModalEl = document.getElementById('modal-confirmar-exclusao-imovel');
        if (confirmarExclusaoModalEl) {
            this.modalManager.modalConfirmarExclusao = new bootstrap.Modal(confirmarExclusaoModalEl);
            // Add event listener to ensure aria-hidden is false when modal is shown
            confirmarExclusaoModalEl.addEventListener('shown.bs.modal', () => {
                confirmarExclusaoModalEl.setAttribute('aria-hidden', 'false');
            });
        }

        this.bindEvents();
        this.initialized = true;
    }

    bindEvents() {
        // Interceptar submit do formulário de Edição (Editar Imóvel)
        const formEditar = document.getElementById('edit-imovel-form');
        if (formEditar) {
            formEditar.addEventListener('submit', (e) => {
                logToLocalStorage('[Imoveis] edit-imovel-form submit');
                console.log('[Imoveis] edit-imovel-form submit');
                this.handleUpdate(e);
            });
        }

        // Botão de confirmação de exclusão
        const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao-imovel');
        if (btnConfirmarExclusao) {
            btnConfirmarExclusao.addEventListener('click', () => {
                if (this.imovelToDeleteId) {
                    this._deleteImovelConfirmed(this.imovelToDeleteId);
                }
            });
        }

        // Aplicar el patrón de focus management
        const modals = ['novo-imovel-modal', 'editar-imovel-modal'];
        modals.forEach(modalId => {
            const modalEl = document.getElementById(modalId);
            if (modalEl) {
                modalEl.addEventListener('hide.bs.modal', () => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log(`🔧 Focus transferido antes del cierre del modal ${modalId}`);
                });
            }
        });
    }

    showNewModal() {
        console.log('[Imoveis] showNewModal() chamado - abrindo modal de novo imóvel');
        const form = document.getElementById('form-novo-imovel');
        if (form) form.reset();
        this.modalManager.abrirModalCadastro();
    }

    // Método de compatibilidade para eliminar advertências legacy
    async load() {
        console.log('[Imoveis] Método load() chamado');
        if (!this.initialized) {
            console.log('[Imoveis] Inicializando módulo...');
            this.init();
        }

        // Garantir que os event listeners sejam configurados após o DOM estar pronto
        console.log('[Imoveis] Configurando event listeners específicos...');
        this.setupFormEventListeners();
        this.updateAdminRestrictions();

        // Só carregar imóveis se o usuário estiver autenticado
        if (window.authService && window.authService.isAuthenticated()) {
            console.log('[Imoveis] Carregando imóveis...');
            await this.loadImoveis();
        } else {
            console.log('[Imoveis] Usuário não autenticado, pulando carregamento de imóveis');
        }
    }

    setupFormEventListeners() {
        console.log('[Imoveis] setupFormEventListeners() chamado');

        // Pequeno delay para garantir que o DOM esteja atualizado
        setTimeout(() => {
            // Botão Novo Imóvel
            const btnNovoImovel = document.getElementById('btn-novo-imovel');
            console.log('[Imoveis] Elemento btn-novo-imovel encontrado:', btnNovoImovel);
            if (btnNovoImovel) {
                if (window.authService && window.authService.isAdmin()) {
                    btnNovoImovel.addEventListener('click', () => {
                        console.log('[Imoveis] Botão Novo Imóvel clicado');
                        this.showNewModal();
                    });
                    btnNovoImovel.disabled = false;
                    console.log('[Imoveis] Event listener configurado para btn-novo-imovel');
                } else {
                    btnNovoImovel.disabled = true;
                    btnNovoImovel.title = 'Apenas administradores podem criar imóveis';
                    console.log('[Imoveis] Botão Novo Imóvel desabilitado para usuário não-admin');
                }
            } else {
                console.log('[Imoveis] Botão btn-novo-imovel não encontrado (pode ser normal em outras vistas)');
            }

            // Interceptar submit do formulário de Cadastro (Novo Imóvel)
            const formNovoImovel = document.getElementById('form-novo-imovel');
            console.log('[Imoveis] Elemento form-novo-imovel encontrado:', formNovoImovel);

            if (formNovoImovel) {
                // Remover event listener anterior se existir
                formNovoImovel.onsubmit = null;

                formNovoImovel.addEventListener('submit', (e) => {
                    console.log('[Imoveis] Submit interceptado para form-novo-imovel');
                    e.preventDefault();
                    e.stopPropagation();

                    const formData = new FormData(formNovoImovel);
                    const data = Object.fromEntries(formData.entries());
                    console.log('[Imoveis] Dados do formulário:', data);

                    this.handleCreateData(data, formNovoImovel, 'main');
                    return false;
                });
                console.log('[Imoveis] Event listener configurado para form-novo-imovel');
            } else {
                console.warn('[Imoveis] Formulário form-novo-imovel não encontrado');
            }
        }, 100);
    }

    async handleCreateData(data, formElement, source = 'main') {
        logToLocalStorage('[Imoveis] handleCreateData called', data);
        console.log('[Imoveis] handleCreateData called', data);

        try {
            // Adaptar campos según modelo Imovel actualizado
            const nullableFields = ['tipo_imovel', 'area_total', 'area_construida', 'valor_cadastral', 'valor_mercado', 'iptu_mensal', 'condominio_mensal', 'numero_quartos', 'numero_banheiros', 'numero_vagas_garagem', 'alugado'];
            const payload = { ...data };
            console.log('[Imoveis] Payload inicial:', payload);

            // Eliminar campo 'observacoes' si existe
            if ('observacoes' in payload) {
                delete payload.observacoes;
            }

            // Si data_cadastro está vacío, asignar la fecha actual en formato ISO
            if (!payload.data_cadastro || payload.data_cadastro === '') {
                payload.data_cadastro = new Date().toISOString();
            }

            for (const field of nullableFields) {
                if (payload[field] === '') {
                    payload[field] = null;
                }
            }

            console.log('[Imoveis] Payload processado:', payload);

            // Validación de campos obrigatórios
            const requiredFields = ['nome', 'endereco'];
            for (const field of requiredFields) {
                if (!payload[field] || payload[field].trim() === '') {
                    console.error(`[Imoveis] Campo obrigatório vazio: ${field}`);
                    this.uiManager.showErrorToast('Campos obrigatórios não podem estar em branco', `Preencha o campo: ${field}`);
                    return;
                }
            }

            console.log('[Imoveis] Validações passaram, chamando API...');

            this.uiManager.showLoading('Criando imóvel...');
            const response = await this.apiService.createImovel(payload);

            console.log('[Imoveis] Resposta da API:', response);

            if (response && response.success) {
                console.log('[Imoveis] Imóvel criado com sucesso, fechando modal...');
                this.modalManager.fecharModalCadastro();
                formElement.reset();
                console.log('[Imoveis] Recarregando lista de imóveis...');
                await this.loadImoveis();
                console.log('[Imoveis] Processo concluído com sucesso!');
            } else {
                console.error('[Imoveis] Resposta da API indica erro:', response);
                throw new Error(response?.error || 'Erro ao criar imóvel');
            }
        } catch (error) {
            console.error('[Imoveis] Erro no handleCreateData:', error);
            this.uiManager.showErrorToast('Erro ao criar imóvel', error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async loadImoveis() {
        try {
            this.uiManager.showLoading('Carregando imóveis...');
            const imoveis = await this.apiService.getImoveis();
            this.uiManager.hideLoading();

            this.imoveis = imoveis;
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
        tableBody.innerHTML = '';
        if (this.imoveis.length === 0) {
            window.SecurityUtils.setSafeHTML(tableBody, `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-home fa-2x mb-2"></i>
                        <br>Não há imóveis registrados
                    </td>
                </tr>
            `);
            return;
        }
        this.imoveis.forEach(imovel => {
            const safeImovel = window.SecurityUtils.sanitizeData(imovel);
            const row = document.createElement('tr');
            const statusAlugado = imovel.alugado ? '<span class="badge bg-danger">Alugado</span>' : '<span class="badge bg-success">Disponível</span>';
            const isAdmin = window.authService && window.authService.isAdmin();
            const disabledAttr = isAdmin ? '' : 'disabled';
            const disabledClass = isAdmin ? '' : 'opacity-50';
            const titleAttr = isAdmin ? 'title="Editar"' : 'title="Apenas administradores podem editar imóveis"';
            const deleteTitleAttr = isAdmin ? 'title="Excluir"' : 'title="Apenas administradores podem excluir imóveis"';
            
            const rowTemplate = `
                <td>
                    <strong>${safeImovel.nome || ''}</strong><br>
                    <small class="text-muted">${safeImovel.tipo_imovel || 'Sem tipo'}</small>
                </td>
                <td>
                    <span>${safeImovel.endereco || '<span class="text-muted fst-italic">Sem endereço</span>'}</span>
                </td>
                <td>
                    <span>${safeImovel.area_total || '—'} m²</span><br>
                    <span>${safeImovel.area_construida || '—'} m²</span>
                </td>
                <td>
                    <span>R$ ${safeImovel.valor_cadastral || '—'}</span><br>
                    <span>R$ ${safeImovel.valor_mercado || '—'}</span>
                </td>
                <td>
                    <span>R$ ${safeImovel.iptu_mensal || '—'}</span><br>
                    <span>R$ ${safeImovel.condominio_mensal || '—'}</span>
                </td>
                <td>${statusAlugado}</td>
                <td><small class="text-muted">${imovel.data_cadastro ? new Date(imovel.data_cadastro).toLocaleDateString() : ''}</small></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning admin-only ${disabledClass}" onclick="window.imoveisModule.editImovel(${imovel.id})" ${disabledAttr} ${titleAttr}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger admin-only ${disabledClass}" onclick="window.imoveisModule.deleteImovel(${imovel.id})" ${disabledAttr} ${deleteTitleAttr}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            row.innerHTML = rowTemplate;
            tableBody.appendChild(row);
        });
    }

    updateStats() {
        const statsElement = document.getElementById('imoveis-stats');
        if (!statsElement) return;
        statsElement.textContent = `Total de imóveis: ${this.imoveis.length}`;
    }

    async editImovel(id) {
        // Verificar autenticação antes de editar
        if (!window.authService || !window.authService.isAuthenticated()) {
            this.uiManager.showErrorToast('Você precisa estar autenticado para editar imóveis.', 'error');
            if (window.loginManager) {
                window.loginManager.showLoginModal();
            }
            return;
        }
        try {
            this.uiManager.showLoading('Carregando dados do imóvel...');
            const imovel = await this.apiService.getImovel(id);
            this.uiManager.hideLoading();

            this.currentEditId = id;
            this.fillEditForm(imovel);

            this.modalManager.abrirModalEdicao();
        } catch (error) {
            this.uiManager.showError('Erro ao carregar dados do imóvel: ' + error.message);
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
                } else if (key === 'data_cadastro' && imovel[key]) {
                    // Formatear fecha para input type="date" (formato yyyy-MM-dd)
                    const date = new Date(imovel[key]);
                    if (!isNaN(date.getTime())) {
                        input.value = date.toISOString().split('T')[0];
                    }
                } else {
                    input.value = imovel[key] || '';
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

        // Campos permitidos por el backend (modelo Imovel atualizado)
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

        if (response && (response.success || response.mensagem || response.message)) {
            this.modalManager.fecharModalEdicao();
            this.uiManager.showSuccessToast('Imóvel atualizado', 'Os dados foram atualizados com sucesso.');
            this.loadImoveis();
        } else {
            this.uiManager.showErrorToast('Erro ao atualizar imóvel', 'Não foi possível atualizar o imóvel');
        }
    }

    deleteImovel(id) {
        this.imovelToDeleteId = id;
        this.modalManager.modalConfirmarExclusao.show();
    }

    async _deleteImovelConfirmed(id) {
        this.uiManager.showLoading('Excluindo imóvel...');
        const response = await this.apiService.deleteImovel(id);
        this.uiManager.hideLoading();

        if (response && (response.success || response.mensagem || response.message)) {
            this.modalManager.modalConfirmarExclusao.hide();
            this.uiManager.showSuccessToast('Imóvel excluído', 'O imóvel foi excluído com sucesso.');
            this.loadImoveis();
        } else {
            this.uiManager.showErrorToast('Erro ao excluir imóvel', 'Não foi possível excluir o imóvel');
        }
    }

    updateAdminRestrictions() {
        const isAdmin = window.authService && window.authService.isAdmin();
        const btnNovo = document.getElementById('btn-novo-imovel');
        
        if (btnNovo) {
            if (isAdmin) {
                // Re-enable the event listener if it was disabled
                btnNovo.disabled = false;
                btnNovo.title = '';
                btnNovo.addEventListener('click', () => this.showNewModal());
            } else {
                btnNovo.disabled = true;
                btnNovo.title = 'Apenas administradores podem criar imóveis';
            }
        }
        
        // Re-renderizar la tabla si já está cargada
        if (this.imoveis && this.imoveis.length > 0) {
            this.loadImoveis();
        }
    }
}

window.imoveisModule = new ImoveisModule();
