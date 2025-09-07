
/**
 * Módulo Proprietarios - Gestão completa de proprietários
 * Inclui CRUD, importação, exportação e validações
 */

class ProprietariosModule {
    constructor() {
        // ...código existente...
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.proprietarios = [];
        this.currentEditId = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        // ...código existente...
        this.bindEvents();
        this.initialized = true;
        // ...código existente...
    }

    async load() {
        this.init();
        await this.loadProprietarios();
    }

    bindEvents() {
        const btnNovo = document.getElementById('btn-novo-proprietario');
        if (btnNovo) {
            btnNovo.addEventListener('click', () => this.showNewModal());
        }
        const formNovo = document.getElementById('form-novo-proprietario');
        if (formNovo) {
            formNovo.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(formNovo);
                const data = Object.fromEntries(formData.entries());
                this.handleCreateData(data, formNovo);
            });
        }
        // ...código existente...
        const formEditar = document.getElementById('form-editar-proprietario');
        if (formEditar) {
            formEditar.addEventListener('submit', (e) => this.handleUpdate(e));
        }
        const searchInput = document.getElementById('search-proprietarios');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterProprietarios(e.target.value));
        }
        // Registrar o evento apenas quando o DOM estiver pronto
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

        // INTERCEPTAR CLICS EN BOTONES DE CERRAR ANTES DE QUE BOOTSTRAP PROCESE
        const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            const modalId = button.closest('.modal')?.id;
            if (modalId && modalId.includes('proprietario')) {
                button.addEventListener('click', (e) => {
                    // Desenfocar inmediatamente ANTES de que Bootstrap inicie el proceso
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
            const response = await this.apiService.getProprietarios();
            if (response && response.success) {
                this.proprietarios = response.data;
                this.renderTable();
            } else {
                throw new Error(response?.error || 'Erro ao carregar proprietários');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao carregar proprietários: ' + error.message);
        } finally {
            this.uiManager.hideLoading();
        }
    }

    renderTable() {
        const tbody = document.getElementById('proprietarios-table-body');
        if (!tbody) return;
        
        if (this.proprietarios.length === 0) {
            SecurityUtils.setSafeHTML(tbody, `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <br>Não há proprietários registrados
                    </td>
                </tr>
            `);
            return;
        }
        
        const htmlContent = this.proprietarios.map(prop => {
            const nomeCompleto = prop.sobrenome ? `${SecurityUtils.escapeHtml(prop.nome)} ${SecurityUtils.escapeHtml(prop.sobrenome)}` : SecurityUtils.escapeHtml(prop.nome);
            const documentoInfo = (prop.tipo_documento && prop.documento) ? 
                `${SecurityUtils.escapeHtml(prop.tipo_documento)}: ${SecurityUtils.escapeHtml(prop.documento)}` : 
                (prop.documento ? `Doc: ${SecurityUtils.escapeHtml(prop.documento)}` : 'Sem documento');
            
            return `
                <tr>
                    <td data-label="Proprietário">
                        <strong>${nomeCompleto}</strong><br>
                        <small class="text-muted">${documentoInfo}</small>
                    </td>
                    <td data-label="Contato">${this.formatContact(prop.email, prop.telefone)}</td>
                    <td data-label="Endereço">${this.formatField(prop.endereco, 'Sem endereço')}</td>
                    <td data-label="Dados Bancários"><div class="small">${this.formatBankInfo(prop.banco, prop.agencia, prop.conta, prop.tipo_conta)}</div></td>
                    <td data-label="Data"><small class="text-muted">${new Date(prop.data_cadastro).toLocaleDateString()}</small></td>
                    <td data-label="Ações">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-warning admin-only" onclick="proprietariosModule.editProprietario(${prop.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline-danger admin-only" onclick="proprietariosModule.deleteProprietario(${prop.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        SecurityUtils.setSafeHTML(tbody, htmlContent);
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

    filterProprietarios(searchTerm) {
        const filteredData = this.proprietarios.filter(prop => {
            const searchString = `${prop.nome} ${prop.sobrenome} ${prop.documento} ${prop.email || ''}`.toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
        const tbody = document.getElementById('proprietarios-table-body');
        if (!tbody) return;
        
        if (filteredData.length === 0) {
            SecurityUtils.setSafeHTML(tbody, `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        <i class="fas fa-search fa-2x mb-2"></i>
                        <br>Não foram encontrados proprietários que correspondam a "${SecurityUtils.escapeHtml(searchTerm)}"
                    </td>
                </tr>
            `);
            return;
        }
        
        const htmlContent = filteredData.map(prop => {
            const nomeCompleto = prop.sobrenome ? `${SecurityUtils.escapeHtml(prop.nome)} ${SecurityUtils.escapeHtml(prop.sobrenome)}` : SecurityUtils.escapeHtml(prop.nome);
            const documentoInfo = (prop.tipo_documento && prop.documento) ? 
                `${SecurityUtils.escapeHtml(prop.tipo_documento)}: ${SecurityUtils.escapeHtml(prop.documento)}` : 
                (prop.documento ? `Doc: ${SecurityUtils.escapeHtml(prop.documento)}` : 'Sem documento');
            
            return `
                <tr>
                    <td data-label="Proprietário">
                        <strong>${nomeCompleto}</strong><br>
                        <small class="text-muted">${documentoInfo}</small>
                    </td>
                    <td data-label="Contato">${this.formatContact(prop.email, prop.telefone)}</td>
                    <td data-label="Endereço">${this.formatField(prop.endereco, 'Sem endereço')}</td>
                    <td data-label="Dados Bancários"><div class="small">${this.formatBankInfo(prop.banco, prop.agencia, prop.conta, prop.tipo_conta)}</div></td>
                    <td data-label="Data"><small class="text-muted">${new Date(prop.data_cadastro).toLocaleDateString()}</small></td>
                    <td data-label="Ações">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-warning admin-only" onclick="proprietariosModule.editProprietario(${prop.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline-danger admin-only" onclick="proprietariosModule.deleteProprietario(${prop.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        SecurityUtils.setSafeHTML(tbody, htmlContent);
    }

    showNewModal() {
        const modalEl = document.getElementById('novo-proprietario-modal');
        if (modalEl) {
            // Limpiar el formulario
            const form = document.getElementById('form-novo-proprietario');
            if (form) form.reset();

            // Mostrar modal usando Bootstrap
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    async handleCreateData(data, formElement) {
        try {
            this.uiManager.showLoading('Criando proprietário...');
            const response = await this.apiService.createProprietario(data);
            if (response && response.success) {
                // Blur y focus al body antes de cerrar el modal (igual que Novo Imóvel)
                const modalEl = document.getElementById('novo-proprietario-modal');
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                formElement.reset();
                // Limpieza manual de cualquier backdrop residual
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(bd => bd.remove());
                // Recargar lista automáticamente
                await this.loadProprietarios();
            } else {
                throw new Error(response?.error || 'Erro ao criar proprietário');
            }
        } catch (error) {
            this.uiManager.showError('Erro ao criar proprietário: ' + error.message);
        }
        // Oculta el loader siempre, incluso si no hay recarga de lista
        // ...existing code...
        this.uiManager.hideLoading();
        // ...existing code...
        // Eliminación forzada del loader global si persiste
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.remove();
        }
    }

    async editProprietario(id) {
        try {
            this.uiManager.showLoading('Carregando dados...');
            const response = await this.apiService.getProprietario(id);
            if (response.success) {
                this.currentEditId = id;
                this.fillEditForm(response.data);
                const modal = new bootstrap.Modal(document.getElementById('editar-proprietario-modal'));
                modal.show();
            } else {
                throw new Error(response.error || 'Erro ao carregar proprietário');
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
        const fields = ['nome', 'sobrenome', 'documento', 'tipo_documento', 'endereco', 'telefone', 'email', 'banco', 'agencia', 'conta', 'tipo_conta'];
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
            if (response.success) {
                // Aplicar la solución de focus management que funciona en alterar usuario
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                const modal = bootstrap.Modal.getInstance(document.getElementById('editar-proprietario-modal'));
                modal.hide();
                this.currentEditId = null;
                await this.loadProprietarios();
            } else {
                throw new Error(response.error || 'Erro ao atualizar proprietário');
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
            if (response.success) {
                await this.loadProprietarios();
            } else {
                throw new Error(response.error || 'Erro ao excluir proprietário');
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
            const response = await this.apiService.getProprietario(id);
            if (response.success) {
                this.showDetailsModal(response.data);
            } else {
                throw new Error(response.error || 'Erro ao carregar detalhes');
            }
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

// Inicializar módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Evita inicializar en la pantalla de importar
    const isImportScreen = window.location.hash.includes('importar') || window.location.pathname.includes('importar');
    if (AppConfig.modules.proprietarios && !isImportScreen) {
        window.proprietariosModule = new ProprietariosModule();
    }
});
