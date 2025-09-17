// Utilidad para guardar logs en localStorage
function logToLocalStorage(message, data) {
    try {
        const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        const entry = { timestamp: new Date().toISOString(), message, data };
        logs.push(entry);
        localStorage.setItem('debugLogs', JSON.stringify(logs));
    } catch (e) {
        // Si localStorage falla, ignorar
    }
}

/**
 * Módulo Proprietarios - Gestão completa de proprietários
 * Inclui CRUD, importação, exportação e validações
 */

class ProprietariosModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.modalManager = null; 
        this.proprietarios = [];
        this.currentEditId = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        this.modalManager = new ModalManager('novo-proprietario-modal', 'editar-proprietario-modal');
        
        this.bindEvents();
        this.initialized = true;
    }

    async load() {
        // Siempre inicializar eventos y referencias tras cada renderizado
        this.init();
        this.bindEvents();
        await this.loadProprietarios();
    }

    bindEvents() {
        const btnNovo = document.getElementById('btn-novo-proprietario');
        if (btnNovo) {
                btnNovo.addEventListener('click', () => {
                    const msg = '[Proprietarios] btn-novo-proprietario click';
                    console.log(msg);
                    logToLocalStorage(msg);
                    this.showNewModal();
                });
        }
        const formNovo = document.getElementById('form-novo-proprietario');
        if (formNovo) {
                formNovo.addEventListener('submit', (e) => {
                    const msg = '[Proprietarios] form-novo-proprietario submit';
                    console.log(msg);
                    logToLocalStorage(msg);
                    e.preventDefault();
                    const formData = new FormData(formNovo);
                    const data = Object.fromEntries(formData.entries());
                    this.handleCreateData(data, formNovo);
                });
        }
        const formEditar = document.getElementById('form-editar-proprietario');
        if (formEditar) {
                formEditar.addEventListener('submit', (e) => {
                    const msg = '[Proprietarios] form-editar-proprietario submit';
                    console.log(msg);
                    logToLocalStorage(msg);
                    this.handleUpdate(e);
                });
        }

        document.addEventListener('DOMContentLoaded', () => {
            const modalNovo = document.getElementById('novo-proprietario-modal');
            if (modalNovo) {
                modalNovo.addEventListener('hidden.bs.modal', () => {
                    const searchInput = document.getElementById('search-proprietarios');
                    if (searchInput) {
                        searchInput.focus();
                    }
                });
            }
        });

        const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            const modalId = button.closest('.modal')?.id;
            if (modalId && modalId.includes('proprietario')) {
                button.addEventListener('click', (e) => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log(`🔧 PREEMPTIVE: Focus transferido antes del cierre por botón X en ${modalId}`);
                });
            }
        });
    }

    async loadProprietarios() {
        try {
            this.uiManager.showLoading('Carregando proprietários...');
            const proprietarios = await this.apiService.getProprietarios();
            if (proprietarios && Array.isArray(proprietarios)) {
                this.proprietarios = proprietarios;
                this.renderTable();
            } else {
                throw new Error('Dados de proprietários inválidos');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao carregar proprietários: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    renderTable() {
        const tableBody = document.getElementById('proprietarios-table-body');
        if (!tableBody) return;

        const noDataMessage = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <br>Não há proprietários registrados
                </td>
            </tr>
        `;

        if (this.proprietarios.length === 0) {
            tableBody.innerHTML = noDataMessage;
            return;
        }

        const htmlContent = this.proprietarios.map(prop => this.renderProprietarioRow(prop)).join('');
        tableBody.innerHTML = htmlContent;
    }

    renderProprietarioRow(prop) {
        const nomeCompleto = prop.sobrenome ? `${SecurityUtils.escapeHtml(prop.nome)} ${SecurityUtils.escapeHtml(prop.sobrenome)}` : SecurityUtils.escapeHtml(prop.nome);
        const documentoInfo = (prop.tipo_documento && prop.documento) ? 
            `${SecurityUtils.escapeHtml(prop.tipo_documento)}: ${SecurityUtils.escapeHtml(prop.documento)}` : 
            (prop.documento ? `Doc: ${SecurityUtils.escapeHtml(prop.documento)}` : 'Sem documento');
        
        return `
            <tr>
                <td>
                    <strong>${nomeCompleto}</strong><br>
                    <small class="text-muted">${documentoInfo}</small>
                </td>
                <td>${this.formatContact(prop.email, prop.telefone)}</td>
                <td>${this.formatField(prop.endereco, 'Sem endereço')}</td>
                <td><div class="small">${this.formatBankInfo(prop.banco, prop.agencia, prop.conta, prop.tipo_conta)}</div></td>
                <td><small class="text-muted">${new Date(prop.data_cadastro).toLocaleDateString()}</small></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning admin-only" onclick="proprietariosModule.editProprietario(${prop.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-outline-danger admin-only" onclick="proprietariosModule.deleteProprietario(${prop.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }

    formatField(value, placeholder = '—', prefix = '', suffix = '') {
        if (value === null || value === undefined || value === '' || value === 'NaN') {
            return `<span class="text-muted fst-italic">${SecurityUtils.escapeHtml(placeholder)}</span>`;
        }
        return `${SecurityUtils.escapeHtml(prefix)}${SecurityUtils.escapeHtml(value)}${SecurityUtils.escapeHtml(suffix)}`;
    }

    formatContact(email, telefone) {
        const emailPart = email ? 
            `<i class="fas fa-envelope text-muted me-1"></i>${SecurityUtils.escapeHtml(email)}` : 
            `<i class="fas fa-envelope text-muted me-1"></i><span class="text-muted fst-italic">Sem email</span>`;
        const telefonePart = telefone ? 
            `<i class="fas fa-phone text-muted me-1"></i>${SecurityUtils.escapeHtml(telefone)}` : 
            `<i class="fas fa-phone text-muted me-1"></i><span class="text-muted fst-italic">Sem telefone</span>`;
        return `${emailPart}<br>${telefonePart}`;
    }

    formatBankInfo(banco, agencia, conta, tipo_conta) {
        if (!banco && !agencia && !conta && !tipo_conta) {
            return '<span class="text-muted fst-italic">Sem dados bancários</span>';
        }
        let html = `<strong>${SecurityUtils.escapeHtml(banco || 'Banco não especificado')}</strong>`;
        if (agencia) html += `<br><small>Ag. ${SecurityUtils.escapeHtml(agencia)}</small>`;
        if (conta) html += `<br><small>Cta. ${SecurityUtils.escapeHtml(conta)}</small>`;
        if (tipo_conta) html += `<br><small>${SecurityUtils.escapeHtml(tipo_conta)}</small>`;
        return html;
    }

    showNewModal() {
        const form = document.getElementById('form-novo-proprietario');
        if (form) form.reset();
        this.modalManager.abrirModalCadastro();
    }

    async handleCreateData(data, formElement) {
        logToLocalStorage('[Proprietarios] handleCreateData called', data);
        console.log('[Proprietarios] handleCreateData called', data);
        const nullableFields = ['sobrenome', 'documento', 'tipo_documento', 'endereco', 'telefone', 'email', 'banco', 'agencia', 'conta', 'tipo_conta', 'observacoes'];
        const payload = { ...data };

        for (const field of nullableFields) {
            if (payload[field] === '') {
                payload[field] = null;
            }
        }

        try {
            this.uiManager.showLoading('Criando proprietário...');
            logToLocalStorage('[Proprietarios] Enviando payload para createProprietario', payload);
            console.log('[Proprietarios] Enviando payload para createProprietario', payload);
            const response = await this.apiService.createProprietario(payload);
            logToLocalStorage('[Proprietarios] Resposta de createProprietario', response);
            console.log('[Proprietarios] Resposta de createProprietario', response);
            if (response && (response.success || response.mensagem)) {
                logToLocalStorage('[Proprietarios] Cadastro realizado com sucesso, fechando modal e recarregando lista');
                console.log('[Proprietarios] Cadastro realizado com sucesso, fechando modal e recarregando lista');
                this.modalManager.fecharModalCadastro();
                formElement.reset();
                await this.loadProprietarios();
            } else {
                logToLocalStorage('[Proprietarios] Erro ao criar proprietário', response);
                console.error('[Proprietarios] Erro ao criar proprietário', response);
                throw new Error(response?.error || 'Erro ao criar proprietário');
            }
        } catch (error) {
            logToLocalStorage('[Proprietarios] Exception em handleCreateData', error);
            console.error('[Proprietarios] Exception em handleCreateData', error);
            this.uiManager.showError('Erro ao criar proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async editProprietario(id) {
        try {
            this.uiManager.showLoading('Carregando dados...');
            const proprietario = await this.apiService.getProprietario(id);
            if (proprietario) {
                this.currentEditId = id;
                this.fillEditForm(proprietario);
                this.modalManager.abrirModalEdicao();
            } else {
                throw new Error('Proprietário não encontrado');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao carregar proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    fillEditForm(proprietario) {
        const form = document.getElementById('form-editar-proprietario');
        if (!form) return;
        const fields = ['nome', 'sobrenome', 'documento', 'tipo_documento', 'endereco', 'telefone', 'email', 'banco', 'agencia', 'conta', 'tipo_conta', 'observacoes'];
        fields.forEach(field => {
            const input = form.querySelector(`[name="${field}"]`);
            if (input) {
                input.value = proprietario[field] || '';
            }
        });
    }

    async handleUpdate(event) {
        event.preventDefault();
        if (!this.currentEditId) {
            this.uiManager.showError('ID de proprietário inválido');
            return;
        }
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        try {
            this.uiManager.showLoading('Atualizando proprietário...');
            const response = await this.apiService.updateProprietario(this.currentEditId, data);
            if (response && (response.success || response.mensagem)) {
                this.modalManager.fecharModalEdicao();
                this.currentEditId = null;
                await this.loadProprietarios();
            } else {
                throw new Error(response?.error || 'Erro ao atualizar proprietário');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao atualizar proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async deleteProprietario(id) {
        const proprietario = this.proprietarios.find(p => p.id === id);
        if (!proprietario) return;
        const confirmed = await this.uiManager.showConfirm('Excluir Proprietário', `Tem certeza que deseja excluir ${proprietario.nome} ${proprietario.sobrenome}?`, 'danger');
        if (!confirmed) return;
        try {
            this.uiManager.showLoading('Excluindo proprietário...');
            const response = await this.apiService.deleteProprietario(id);
            if (response && (response.success || response.mensagem || response.message)) {
                this.uiManager.showSuccessToast('Proprietário excluído', 'O proprietário foi excluído com sucesso.');
                await this.loadProprietarios();
            } else {
                throw new Error('Resposta inesperada do servidor');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao excluir proprietário: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async viewDetails(id) {
        try {
            this.uiManager.showLoading('Carregando detalhes...');
            const proprietario = await this.apiService.getProprietario(id);
            this.showDetailsModal(proprietario);
        } catch (error) {
            this.uiManager.showError('Erro ao carregar detalhes: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    showDetailsModal(proprietario) {
        const modalBody = document.getElementById('proprietario-details-body');
        if (!modalBody) return;
        const nomeCompleto = proprietario.sobrenome ? `${proprietario.nome} ${proprietario.sobrenome}` : proprietario.nome;
        const documentoCompleto = (proprietario.tipo_documento && proprietario.documento) ? `${proprietario.tipo_documento} ${proprietario.documento}` : (proprietario.documento ? proprietario.documento : null);
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="text-muted mb-3"><i class="fas fa-user me-2"></i>Informação Pessoal</h6>
                    <div class="mb-2"><strong>Nome completo:</strong><br>${nomeCompleto}</div>
                    <div class="mb-2"><strong>Documento:</strong><br>${this.formatField(documentoCompleto, 'Sem documento')}</div>
                    <div class="mb-2"><strong>Email:</strong><br>${this.formatField(proprietario.email, 'Sem email')}</div>
                    <div class="mb-2"><strong>Telefone:</strong><br>${this.formatField(proprietario.telefone, 'Sem telefone')}</div>
                    <div class="mb-2"><strong>Endereço:</strong><br>${this.formatField(proprietario.endereco, 'Sem endereço')}</div>
                </div>
                <div class="col-md-6">
                    <h6 class="text-muted mb-3"><i class="fas fa-university me-2"></i>Informação Bancária</h6>
                    <div class="mb-2"><strong>Banco:</strong><br>${this.formatField(proprietario.banco, 'Sem banco')}</div>
                    <div class="mb-2"><strong>Agência:</strong><br>${this.formatField(proprietario.agencia, 'Sem agência')}</div>
                    <div class="mb-2"><strong>Conta:</strong><br>${this.formatField(proprietario.conta, 'Sem conta')}</div>
                    <div class="mb-2"><strong>Tipo de conta:</strong><br>${this.formatField(proprietario.tipo_conta, 'Sem tipo especificado')}</div>
                    <!-- Estado removido: campo 'ativo' eliminado -->
                    <div class="mb-2"><strong>Data de registro:</strong><br>${new Date(proprietario.data_cadastro).toLocaleDateString()}</div>
                </div>
            </div>
        `;
        const modal = new bootstrap.Modal(document.getElementById('proprietario-details-modal'));
        modal.show();
    }

    async refresh() {
        await this.loadProprietarios();
    }
}


