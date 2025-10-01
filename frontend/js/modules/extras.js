/**
 * Módulo de Extras - Sistema de Alias
 * Acesso exclusivo para administradores
 */

class ExtrasManager {
    /**
     * Cierra el modal por id y devuelve el foco al botón indicado
     */
    safeCloseModal(modalId, buttonId) {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }
        }
        if (buttonId) {
            const btn = document.getElementById(buttonId);
            if (btn) {
                // O timeout é bom para permitir que o modal feche antes de focar
                setTimeout(() => {
                    btn.focus();
                }, 300);
            }
        }
    }
    confirmarExclusao(tipo, id, nome) {
        console.log('[DEBUG] Entrando en confirmarExclusao:', { tipo, id, nome });
        console.log('🗑️ Iniciando confirmação de exclusão:', { tipo, id, nome });
        
        // Mostrar el modal de confirmación
        const modalEl = document.getElementById('modal-confirmar-exclusao-extras');
        if (modalEl) {
            const modalMsg = document.getElementById('modal-confirmar-exclusao-extras-msg');
            if (modalMsg) {
                if (tipo === 'alias') {
                    modalMsg.textContent = `Tem certeza que deseja excluir o alias "${nome}"? Esta ação não pode ser desfeita.`;
                } else if (tipo === 'transferencia') {
                    modalMsg.textContent = `Tem certeza que deseja excluir a transferência "${nome}"? Esta ação não pode ser desfeita.`;
                } else {
                    modalMsg.textContent = 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.';
                }
            }
            
            // Configurar el event listener con closure para capturar los parámetros
            const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao-extras');
            if (btnConfirmarExclusao) {
                // Remover listener anterior si existe
                if (this._exclusaoListener) {
                    btnConfirmarExclusao.removeEventListener('click', this._exclusaoListener);
                }
                
                // Crear nuevo listener com closure
                this._exclusaoListener = async (e) => {
                    console.log('[DEBUG] Click en btn-confirmar-exclusao-extras:', { tipo, id });
                    e.stopImmediatePropagation();
                    btnConfirmarExclusao.removeEventListener('click', this._exclusaoListener);
                    console.log('🔥 Ejecutando exclusão:', { tipo, id });
                    try {
                        if (tipo === 'alias') {
                            await this.excluirAlias(id);
                        } else if (tipo === 'transferencia') {
                            await this.excluirTransferencia(id);
                        }
                        // Fechar modal após exclusão
                        this.safeCloseModal('modal-confirmar-exclusao-extras', 'btn-confirmar-exclusao-extras');
                    } catch (error) {
                        console.error('❌ Erro durante exclusão:', error);
                        this.showError('Erro ao excluir: ' + error.message);
                    }
                };
                
                btnConfirmarExclusao.addEventListener('click', this._exclusaoListener);
            }
            
            const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modalInstance.show();
        }
    }

    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.currentExtra = null;
        this.currentTransferencia = null;
        this.allExtras = [];
        this.allTransferencias = [];
        this.allProprietarios = [];
        this.initialized = false;
        this.pendingOperations = new Set();
        // Propriedades para exclusão
        this.exclusaoTipo = null;
        this.exclusaoId = null;
        this.exclusaoNome = null;
        // Flag para controlar configuração de eventos do modal de transferências
        this._transferModalEventsConfigured = false;
        // Binding de métodos
        this.load = this.load.bind(this);
        this.loadExtras = this.loadExtras.bind(this);
        this.loadProprietarios = this.loadProprietarios.bind(this);
    }

    

    /**
     * Inicializar eventos
     */
    setupEvents() {
        // Botões principais
        document.getElementById('btn-novo-alias')?.addEventListener('click', () => {
            this.showAliasModal();
        });

        document.getElementById('btn-novas-transferencias')?.addEventListener('click', () => {
            this.showTransferenciasModal();
        });

        // Formulários
        document.getElementById('form-alias')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarAlias();
        });

        // Formulário de transferências - configurar apenas uma vez
        const formTransferencias = document.getElementById('form-transferencias');
        const btnSalvarTransferencias = document.getElementById('btn-salvar-transferencias');
        
        console.log('[DEBUG] Elementos encontrados - Form:', !!formTransferencias, 'Button:', !!btnSalvarTransferencias);
        
        if (formTransferencias && !formTransferencias.hasTransferenciasListener) {
            console.log('[DEBUG] Configurando event listener para form-transferencias');
            formTransferencias.addEventListener('submit', (e) => {
                console.log('[DEBUG] ===== EVENTO SUBMIT DISPARADO =====');
                console.log('[DEBUG] Event submit disparado para form-transferencias');
                e.preventDefault();
                console.log('[DEBUG] Chamando salvarTransferencias...');
                this.salvarTransferencias();
            });
            formTransferencias.hasTransferenciasListener = true;
            console.log('[DEBUG] Event listener do form configurado com sucesso');
        }
        
        // Backup: event listener direto no botão
        if (btnSalvarTransferencias && !btnSalvarTransferencias.hasClickListener) {
            console.log('[DEBUG] Configurando event listener direto no botão salvar');
            btnSalvarTransferencias.addEventListener('click', (e) => {
                console.log('[DEBUG] ===== CLIQUE DIRETO NO BOTÃO SALVAR =====');
                console.log('[DEBUG] Botão salvar clicado diretamente');
                e.preventDefault();
                this.salvarTransferencias();
            });
            btnSalvarTransferencias.hasClickListener = true;
            console.log('[DEBUG] Event listener do botão configurado com sucesso');
        }

        document.addEventListener('DOMContentLoaded', () => {
            console.log('[DEBUG] JS extras.js cargado y DOM listo');
        });

        // Evento para carregar proprietários do alias selecionado
        document.getElementById('transferencia-alias')?.addEventListener('change', (e) => {
            this.carregarProprietariosAlias(e.target.value);
        });

        // Limpar currentTransferencia quando o modal fechar
        // REMOVIDO: Event listener pode estar causando conflitos
        // document.getElementById('modal-transferencias')?.addEventListener('hidden.bs.modal', () => {
        //     this.currentTransferencia = null;
        //     console.log('🧹 Modal fechado - currentTransferencia limpo');
        // });

        // Event listeners para botões de cancelar para gerenciamento de foco
        const setupCancelButtonHandlers = () => {
            // Botões de cancelar nos modais
            const cancelButtons = document.querySelectorAll('button[data-bs-dismiss="modal"], .btn-secondary');
            cancelButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remover foco imediatamente do botão
                    setTimeout(() => button.blur(), 10);
                });
            });
        };

        // Configurar handlers iniciais
        setupCancelButtonHandlers();

        // Reconfigurar handlers quando os modais forem exibidos (caso o DOM tenha mudado)
        document.addEventListener('shown.bs.modal', setupCancelButtonHandlers);

        console.log('🎯 Eventos do módulo Extras configurados');
    }

    /**
     * Carregar módulo quando ativado
     */
    async load() {
        console.log('🔄 Carregando módulo Extras...');
        
        if (!this.initialized) {
            this.setupEvents();
            this.initialized = true;
        }

        // Verificar se o usuário é administrador antes de carregar dados
        const isAdmin = window.authService && window.authService.isAdmin();
        if (!isAdmin) {
            console.log('⚠️ Usuário não-administrador tentou carregar módulo Extras - pulando carregamento de dados');
            return;
        }

        try {
            await this.loadProprietarios();
            await this.loadExtras();
            await this.loadTransferencias();
        } catch (error) {
            console.error('Erro ao carregar dados dos extras:', error);
            this.showError('Erro ao carregar dados: ' + error.message);
        }
    }

    /**
     * Carregar lista de extras
     */
    async loadExtras() {
        try {
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            console.log('Usuário é admin:', isAdmin);
            const disabledAttr = isAdmin ? '' : 'disabled';
            if (!isAdmin) {
                console.log('⚠️ Usuário não-administrador tentou carregar extras - pulando');
                this.renderExtrasTable([]);
                return;
            }

            console.log(' Carregando extras...');
            
            const response = await this.apiService.get('/api/extras/?ativo=true');
            
            if (response && response.success && Array.isArray(response.data)) {
                this.allExtras = response.data;
                // Refuerzo: recargar propietarios antes de renderizar la tabla
                await this.loadProprietarios();
                this.renderExtrasTable(this.allExtras);
                console.log(`✅ ${response.data.length} extras carregados`);
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.error('Erro ao carregar extras:', error);
            this.showError('Erro ao carregar extras: ' + error.message);
            this.renderExtrasTable([]);
        }
    }

    /**
     * Carregar proprietários para seleção
     */
    async loadProprietarios() {
        try {
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            if (!isAdmin) {
                console.log('⚠️ Usuário não-administrador tentou carregar proprietários - pulando');
                return;
            }

            console.log('📥 Carregando proprietários...');
            
            const response = await this.apiService.get('/api/extras/proprietarios/disponiveis');
            console.log('API response for proprietarios:', response); // Add this line
            
            if (response && response.success && Array.isArray(response.data)) {
                this.allProprietarios = response.data;
                this.populateProprietariosSelects();
                console.log(`✅ ${response.data.length} proprietários carregados`);
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários:', error);
            this.showError('Erro ao carregar proprietários: ' + error.message);
        }
    }

    /**
     * Renderizar tabela de extras
     */
    renderExtrasTable(extras) {
        const tbody = document.getElementById('extras-table-body');
        if (!tbody) return;

        // Limpiar completamente el tbody antes de repintar
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }

        if (!extras || extras.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhum alias encontrado
                    </td>
                </tr>
            `;
            return;
        }

        extras.forEach((extra, index) => {
            const row = document.createElement('tr');
            // Processar proprietários
            let proprietariosText = 'Nenhum';
            if (extra.id_proprietarios) {
                try {
                    const proprietarioIds = JSON.parse(extra.id_proprietarios);
                    const nomes = proprietarioIds.map(id => {
                        const prop = this.allProprietarios.find(p => p.id === id);
                        return prop ? prop.nome : `ID:${id}`;
                    });
                    proprietariosText = nomes.length > 0 ? nomes.join(', ') : 'Nenhum';
                } catch (e) {
                    proprietariosText = 'Erro no formato';
                }
            }

            const isAdmin = window.authService && window.authService.isAdmin();
            const disabledAttr = isAdmin ? '' : 'disabled';
            const disabledClass = isAdmin ? '' : 'opacity-50';
            const titleAttr = isAdmin ? 'title="Editar"' : 'title="Apenas administradores podem editar"';
            const deleteTitleAttr = isAdmin ? 'title="Excluir"' : 'title="Apenas administradores podem excluir"';

            row.innerHTML = `
                <td><strong>${extra.alias}</strong></td>
                <td title="${proprietariosText}">
                    ${proprietariosText.length > 50 ? proprietariosText.substring(0, 50) + '...' : proprietariosText}
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary ${disabledClass}" onclick="window.extrasManager.editarAlias(${extra.id})" ${disabledAttr} ${titleAttr}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger ${disabledClass}"
                                onclick="window.extrasManager.confirmarExclusao('alias', ${extra.id}, '${extra.alias}')" 
                                data-alias-id="${extra.id}"
                                ${disabledAttr} ${deleteTitleAttr}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Carregar transferências cadastradas
     */
    async loadTransferencias() {
        try {
            // Verificar se o usuário é administrador antes de fazer a chamada
            const isAdmin = window.authService && window.authService.isAdmin();
            if (!isAdmin) {
                console.log('⚠️ Usuário não-administrador tentou carregar transferências - pulando');
                this.renderTransferenciasTable([]);
                return;
            }

            console.log('📄 Carregando transferências...');
            
            const response = await this.apiService.get('/api/transferencias/');
            
            if (response && Array.isArray(response)) {
                this.allTransferencias = response;
                console.log('✅ Transferências carregadas:', this.allTransferencias.length);
                
                this.renderTransferenciasTable(this.allTransferencias);
            } else if (response && response.success && Array.isArray(response.data)) {
                this.allTransferencias = response.data;
                console.log('✅ Transferências carregadas:', this.allTransferencias.length);
                
                this.renderTransferenciasTable(this.allTransferencias);
            } else {
                console.warn('⚠️ Resposta inválida da API de transferências:', response);
                this.renderTransferenciasTable([]);
            }

        } catch (error) {
            console.error('Erro ao carregar transferências:', error);
            this.showError('Erro ao carregar transferências: ' + error.message);
            this.renderTransferenciasTable([]);
        }
    }

    /**
     * Renderizar tabela de transferências
     */
    renderTransferenciasTable(transferencias) {
        const tbody = document.getElementById('transferencias-table-body');
        if (!tbody) return;

        if (!transferencias || transferencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhuma transferência encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        
        transferencias.forEach((transferencia, index) => {
            const row = document.createElement('tr');
            
            const dataCriacaoFormatada = transferencia.data_criacao ? 
                new Date(transferencia.data_criacao).toLocaleDateString('pt-BR') : '-';
            
            const dataFimFormatada = transferencia.data_fim ? 
                new Date(transferencia.data_fim).toLocaleDateString('pt-BR') : '-';
            
            const isAdmin = window.authService && window.authService.isAdmin();
            const disabledAttr = isAdmin ? '' : 'disabled';
            const disabledClass = isAdmin ? '' : 'opacity-50';
            const titleAttr = isAdmin ? 'title="Editar"' : 'title="Apenas administradores podem editar"';
            const deleteTitleAttr = isAdmin ? 'title="Excluir"' : 'title="Apenas administradores podem excluir"';

            row.innerHTML = `
                <td><strong>${transferencia.alias}</strong></td>
                <td>${transferencia.nome_transferencia}</td>
                <td class="text-center">${dataCriacaoFormatada}</td>
                <td class="text-center">${dataFimFormatada}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary ${disabledClass}" onclick="console.log('Botão editar clicado para ID:', ${transferencia.id}); window.extrasManager.editarTransferencia(${transferencia.id})" ${disabledAttr} ${titleAttr}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger ${disabledClass}"
                                onclick="window.extrasManager.confirmarExclusao('transferencia', ${transferencia.id}, '${transferencia.nome_transferencia}')" 
                                data-transferencia-id="${transferencia.id}"
                                ${disabledAttr} ${deleteTitleAttr}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        // ...no llamar a setupEvents aquí...
    }

    /**
     * Popular selects de proprietários para ambos os modais
     */
    populateProprietariosSelects() {
        // Para o modal de Alias (apenas proprietários pertencentes)
        const proprietariosSelect = document.getElementById('alias-proprietarios');
        if (proprietariosSelect) {
            proprietariosSelect.innerHTML = '';
            this.allProprietarios.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop.id;
                option.textContent = `${prop.nome} ${prop.sobrenome || ''}`.trim();
                proprietariosSelect.appendChild(option);
            });
        }

        // Para o modal de Transferências (combo de aliases e outros selects)
        const aliasCombo = document.getElementById('transferencia-alias');
        if (aliasCombo) {
            aliasCombo.innerHTML = '<option value="">Selecione um alias...</option>';
            // Será preenchido quando os aliases forem carregados
        }

        const origemSelect = document.getElementById('transferencia-origem');
        if (origemSelect) {
            origemSelect.innerHTML = '<option value="">Selecione proprietário origem...</option>';
            this.allProprietarios.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop.id;
                option.textContent = `${prop.nome} ${prop.sobrenome || ''}`.trim();
                origemSelect.appendChild(option);
            });
        }

        const destinoSelect = document.getElementById('transferencia-destino');
        if (destinoSelect) {
            destinoSelect.innerHTML = '<option value="">Selecione proprietário destino...</option>';
            this.allProprietarios.forEach(prop => {
                const option = document.createElement('option');
                option.value = prop.id;
                option.textContent = `${prop.nome} ${prop.sobrenome || ''}`.trim();
                destinoSelect.appendChild(option);
            });
        }
    }

    /**
     * Mostrar modal de alias
     */
    async showAliasModal(extra = null) {
        this.currentExtra = extra;
        const modalEl = document.getElementById('modal-alias');
        const modalTitle = document.getElementById('modalAliasLabel');
        const form = document.getElementById('form-alias');
        
        if (extra) {
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Alias';
            this.populateAliasForm(extra);
        } else {
            modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
            form.reset();
            await this.loadProprietarios();
        }

        const alerts = document.getElementById('alias-alerts');
        if (alerts) alerts.innerHTML = '';

        const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modalEl);

        // Focar no primeiro input quando o modal for exibido
        modalEl.addEventListener('shown.bs.modal', () => {
            const firstInput = modalEl.querySelector('input[type="text"], select');
            if (firstInput) {
                firstInput.focus();
            }
        }, { once: true });

        bootstrapModal.show();
    }

    /**
     * Popular formulário de alias com dados
     */
    populateAliasForm(extra) {
    document.getElementById('alias-nome').value = extra.alias || '';

        // Selecionar múltiplos proprietários
        const proprietariosSelect = document.getElementById('alias-proprietarios');
        if (proprietariosSelect && extra.id_proprietarios) {
            try {
                const proprietarioIds = JSON.parse(extra.id_proprietarios);
                Array.from(proprietariosSelect.options).forEach(option => {
                    option.selected = proprietarioIds.includes(parseInt(option.value));
                });
            } catch (e) {
                console.warn('Erro ao processar proprietários:', e);
            }
        }
    }

    /**
     * Mostrar modal de transferências
     */
    showTransferenciasModal() {
        const modalEl = document.getElementById('modal-transferencias');
        const form = document.getElementById('form-transferencias');
        const modalTitle = document.getElementById('modalTransferenciasLabel');

        if (this.currentTransferencia) {
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Transferência';
        } else {
            form.reset();
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-exchange-alt me-2"></i>Nova Transferência';

            const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
            if (dataCriacaoInput) {
                dataCriacaoInput.value = new Date().toISOString().split('T')[0];
            }

            const container = document.getElementById('transferencia-proprietarios-container');
            if (container) container.style.display = 'none';
        }
        
        this.carregarAliasParaTransferencia();

        const alerts = document.getElementById('transferencia-alerts');
        if (alerts) alerts.innerHTML = '';

        const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modalEl);

        modalEl.addEventListener('shown.bs.modal', () => {
            const firstSelect = modalEl.querySelector('select');
            if (firstSelect) {
                firstSelect.focus();
            }
        }, { once: true });

        bootstrapModal.show();
    }

    /**
     * Carregar aliases para o combo de transferências
     */
    async carregarAliasParaTransferencia() {
        try {
            console.log('[DEBUG] Ejecutando carregarAliasParaTransferencia');
            const response = await this.apiService.get('/api/extras/?ativo=true');
            console.log('[DEBUG] Respuesta de API para alias:', response);
            const aliasSelect = document.getElementById('transferencia-alias');
            if (response && response.success && Array.isArray(response.data)) {
                aliasSelect.innerHTML = '<option value="">Selecione um alias...</option>';
                response.data.forEach(alias => {
                    const option = document.createElement('option');
                    option.value = alias.id;
                    option.textContent = alias.alias;
                    option.dataset.proprietarios = alias.id_proprietarios;
                    aliasSelect.appendChild(option);
                });
                // Seleccionar automáticamente si solo hay un alias
                if (response.data.length === 1) {
                    aliasSelect.value = response.data[0].id;
                    if (typeof this.carregarProprietariosAlias === 'function') {
                        this.carregarProprietariosAlias(aliasSelect.value);
                    }
                }
                console.log('[DEBUG] Opciones de alias cargadas:', Array.from(aliasSelect.options).map(opt => ({value: opt.value, text: opt.textContent, proprietarios: opt.dataset.proprietarios})));
            } else {
                console.warn('[DEBUG] No se recibieron alias válidos de la API');
            }
        } catch (error) {
            console.error('[DEBUG] Erro ao carregar aliases:', error);
            this.showError('Erro ao carregar aliases: ' + error.message);
        }
    }

    /**
     * Carregar proprietários do alias selecionado
     */
    async carregarProprietariosAlias(aliasId) {
        console.log('🏠 carregarProprietariosAlias chamada com aliasId:', aliasId);
        const container = document.getElementById('transferencia-proprietarios-container');
        const tableBody = document.getElementById('transferencia-proprietarios-table');
    // ...
    // ...existing code...
        if (!aliasId) {
            container.style.display = 'none';
            return;
        }
        try {
            console.log('🔍 Procurando proprietários para aliasId:', aliasId);
            const aliasSelect = document.getElementById('transferencia-alias');
            const selectedOption = aliasSelect.querySelector(`option[value="${aliasId}"]`);
            console.log('📋 Selected option:', selectedOption);
            console.log('📋 Dataset proprietarios:', selectedOption?.dataset?.proprietarios);

            if (selectedOption && selectedOption.dataset.proprietarios) {
                const proprietarioIds = JSON.parse(selectedOption.dataset.proprietarios);
                tableBody.innerHTML = '';
                for (const id of proprietarioIds) {
                    const proprietario = this.allProprietarios.find(p => p.id === parseInt(id));
                    if (proprietario) {
                        let valorSalvo = '';
                        if (this.currentTransferencia && this.currentTransferencia.id_proprietarios) {
                            try {
                                const proprietariosSalvos = JSON.parse(this.currentTransferencia.id_proprietarios);
                                const proprietarioSalvo = proprietariosSalvos.find(p => p.id === proprietario.id);
                                if (proprietarioSalvo) {
                                    valorSalvo = proprietarioSalvo.valor || '';
                                }
                            } catch (error) {
                                // ...existing code...
                            }
                        }
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <strong>${proprietario.nome} ${proprietario.sobrenome || ''}</strong>
                            </td>
                            <td>
                                <div class="input-group">
                                    <span class="input-group-text" style="font-size:0.80rem;">R$</span>
                                    <input type="number" class="form-control" style="font-size:0.80rem;" 
                                           name="transferencia_${proprietario.id}" 
                                           step="0.01" placeholder="0,00"
                                           value="${valorSalvo}">
                                </div>
                            </td>
                        `;
                        tableBody.appendChild(row);
                        console.log('➕ Linha adicionada para proprietário:', proprietario.nome);
                    } else {
                        console.log('⚠️ Proprietário não encontrado:', id);
                    }
                }
                console.log('📊 Total de linhas na tabela:', tableBody.children.length);
                console.log('👁️ Container visibility check:', {
                    display: container.style.display,
                    visibility: window.getComputedStyle(container).visibility,
                    opacity: window.getComputedStyle(container).opacity,
                    height: container.offsetHeight
                });
                container.style.display = proprietarioIds.length > 0 ? 'block' : 'none';
                console.log('📦 Container display set to:', container.style.display);
            } else {
                console.log('⚠️ Nenhum proprietário encontrado para este alias');
                container.style.display = 'none';
            }
        } catch (error) {
            // debugDiv.innerHTML += `<br>Erro ao carregar proprietarios: ${error}`;
        }
    }

    /**
     * Salvar alias
     */
    async salvarAlias() {
        try {
            const formData = new FormData(document.getElementById('form-alias'));
            
            // Obter proprietários selecionados
            const proprietariosSelect = document.getElementById('alias-proprietarios');
            const proprietariosSelecionados = Array.from(proprietariosSelect.selectedOptions)
                .map(option => parseInt(option.value))
                .filter(id => !isNaN(id));

            const aliasData = {
                alias: formData.get('alias-nome').trim(),
                id_proprietarios: proprietariosSelecionados.length > 0 ? JSON.stringify(proprietariosSelecionados) : null
            };

            // Validações básicas
            if (!aliasData.alias) {
                this.showAlert('Nome do alias é obrigatório', 'danger', 'alias-alerts');
                return;
            }

            if (proprietariosSelecionados.length === 0) {
                this.showAlert('Selecione pelo menos um proprietário', 'danger', 'alias-alerts');
                return;
            }

            console.log('💾 Salvando alias:', aliasData);

            let response;
            if (this.currentExtra) {
                // Editar
                response = await this.apiService.put(`/api/extras/${this.currentExtra.id}`, aliasData);
            } else {
                // Criar
                response = await this.apiService.post('/api/extras/', aliasData);
            }

            if (response && response.success) {
                this.showSuccess(this.currentExtra ? 'Alias atualizado com sucesso!' : 'Alias criado com sucesso!');
                // Fechar modal de forma segura para acessibilidade
                this.safeCloseModal('modal-alias', 'btn-salvar-alias');
                // Recargar la lista de aliases para mostrar el novo alias
                await this.loadExtras();
            }

        } catch (error) {
            console.error('Erro ao salvar alias:', error);
            
            // Tratamento específico para erro de duplicação
            let errorMessage = error.message;
            if (errorMessage.includes('Já existe um alias com este nome')) {
                errorMessage = 'Este nome de alias já existe. Por favor, escolha outro nome.';
            } else if (errorMessage.includes('HTTP 400')) {
                errorMessage = 'Dados inválidos. Verifique as informações e tente novamente.';
            }
            
            this.showAlert('Erro ao salvar alias: ' + errorMessage, 'danger', 'alias-alerts');
        }
    }

    /**
     * Salvar transferências
     */
    /**
     * Salvar transferências
     */
    async salvarTransferencias() {
    console.log('[DEBUG] Entrando en salvarTransferencias');
    try {
            console.log('[DEBUG] Iniciando coleta de dados do formulario');
            const aliasId = document.getElementById('transferencia-alias').value;
            const nomeTransferencia = document.getElementById('transferencia-nome').value.trim();
            const dataCriacao = document.getElementById('transferencia-data-criacao').value;
            const dataFim = document.getElementById('transferencia-data-fim').value;
            
            console.log('[DEBUG] Dados coletados:', { aliasId, nomeTransferencia, dataCriacao, dataFim });
            
            if (!aliasId) {
                console.log('[DEBUG] Validacao falhou: aliasId vazio');
                this.showAlert('Selecione um alias', 'danger', 'transferencia-alerts');
                return;
            }

            if (!nomeTransferencia) {
                console.log('[DEBUG] Validacao falhou: nomeTransferencia vazio');
                this.showAlert('Digite o nome da transferência', 'danger', 'transferencia-alerts');
                return;
            }

            if (!dataCriacao) {
                console.log('[DEBUG] Validacao falhou: dataCriacao vazia');
                this.showAlert('Selecione a data de criação', 'danger', 'transferencia-alerts');
                return;
            }

            // Validar que data_fim seja posterior à data_criacao (se informada)
            if (dataFim && dataCriacao && new Date(dataFim) < new Date(dataCriacao)) {
                this.showAlert('Data de fim deve ser posterior à data de criação', 'danger', 'transferencia-alerts');
                return;
            }

            console.log('[DEBUG] Validacoes passaram, coletando proprietarios');
            
            // Coletar valores das transferências
            const proprietarios = [];
            const inputs = document.querySelectorAll('#transferencia-proprietarios-table input[type="number"]');
            console.log('[DEBUG] Encontrados', inputs.length, 'inputs de proprietario');
            let hasValue = false;

            inputs.forEach(input => {
                const proprietarioId = parseInt(input.name.replace('transferencia_', ''));
                const valor = parseFloat(input.value);
                if (!isNaN(valor) && valor !== 0) {
                    proprietarios.push({
                        id: proprietarioId,
                        valor: valor
                    });
                    hasValue = true;
                }
            });

            if (!hasValue) {
                this.showAlert('Informe pelo menos um valor de transferência diferente de zero', 'danger', 'transferencia-alerts');
                return;
            }

            console.log('💾 Salvando transferência:', { aliasId, nomeTransferencia, dataCriacao, dataFim, proprietarios });

            // Calcular valor total da transferência (soma dos valores absolutos)
            const valorTotal = proprietarios.reduce((sum, p) => sum + Math.abs(p.valor), 0);

            // Verificar se é edição ou criação usando campo hidden
            const form = document.getElementById('form-transferencias');
            const transferenciaIdInput = form.querySelector('input[name="transferencia_id"]');
            const transferenciaId = transferenciaIdInput ? transferenciaIdInput.value : null;

            console.log('🔍 Verificando modo de salvamento:', {
                transferenciaId: transferenciaId,
                modo: transferenciaId ? 'EDIÇÃO' : 'CRIAÇÃO'
            });

            // Preparar dados para envio
            const transferenciaData = {
                alias_id: parseInt(aliasId),
                nome_transferencia: nomeTransferencia,
                valor_total: valorTotal,
                id_proprietarios: JSON.stringify(proprietarios),
                data_criacao: dataCriacao,
                data_fim: dataFim || null
            };

            let response;
            
            if (transferenciaId) {
                // Atualizar transferência existente
                console.log('✏️ Fazendo PUT para editar transferência ID:', transferenciaId);
                response = await this.apiService.put(`/api/transferencias/${transferenciaId}`, transferenciaData);
            } else {
                // Criar nova transferência
                console.log('➕ Fazendo POST para criar nova transferência');
                response = await this.apiService.post('/api/transferencias/', transferenciaData);
            }

            if (response && (response.id || response.success !== false)) {
                this.showSuccess(transferenciaId ? 
                    'Transferência atualizada com sucesso!' : 
                    'Transferência criada com sucesso!');
                console.log('[DEBUG] Transferencia salva com sucesso, fechando modal');
                // Resetar campo hidden
                if (transferenciaIdInput) transferenciaIdInput.value = '';
                // Fechar modal de forma segura para acessibilidade
                this.safeCloseModal('modal-transferencias', 'btn-salvar-transferencias');
                // Recargar la lista de transferencias para mostrar la nova transferência
                await this.loadTransferencias();
            }

        } catch (error) {
            console.error('Erro ao salvar transferência:', error);
            this.showAlert('Erro ao salvar transferência: ' + error.message, 'danger', 'transferencia-alerts');
        }
    }

    /**
     * Editar alias
     */
    async editarAlias(id) {
        try {
            const extra = this.allExtras.find(e => e.id === id);
            if (!extra) {
                this.showError('Alias não encontrado');
                return;
            }

            this.showAliasModal(extra);
        } catch (error) {
            console.error('Erro ao carregar alias para edição:', error);
            this.showError('Erro ao carregar alias: ' + error.message);
        }
    }

    /**
     * Excluir alias
     */
    async excluirAlias(id) {
        try {
            // Buscar o extra sem operações pesadas (comparando como número)
            const extra = this.allExtras.find(e => parseInt(e.id) === parseInt(id));
            if (!extra) {
                console.error('[DEBUG] Alias não encontrado para exclusão. id:', id, 'allExtras:', this.allExtras);
                this.showError('Alias não encontrado');
                return;
            }
            // Executar a exclusão diretamente (modal já confirma)
            await this.executeDeleteAlias(parseInt(id));
        } catch (error) {
            console.error('Erro ao excluir alias:', error);
            this.showError('Erro ao excluir alias: ' + error.message);
        }
    }

    /**
     * Executar exclusão de alias sem bloquear a UI
     */
    async executeDeleteAlias(id) {
        // Evitar operações múltiplas
        if (this.pendingOperations.has(`delete-alias-${id}`)) {
            return;
        }

        const operationId = `delete-alias-${id}`;
        this.pendingOperations.add(operationId);
        
        try {
            console.log('🗑️ Excluindo alias:', id);

            // Chamada de API sem bloquear a UI
            const response = await this.apiService.delete(`/api/extras/${id}`);
            
            if (response && response.success) {
                this.showSuccess('Alias excluído com sucesso!');
                // Refuerzo: recargar lista completa desde backend e renderizar
                await this.loadExtras();
            } else {
                throw new Error('Resposta inválida do servidor');
            }

        } catch (error) {
            console.error('Erro ao excluir alias:', error);
            this.showError('Erro ao excluir alias: ' + error.message);
        } finally {
            this.pendingOperations.delete(operationId);
        }
    }

    /**
     * Mostrar estatísticas
     */
    async showEstatisticas() {
        try {
            console.log('📊 Carregando estatísticas...');
            
            const response = await this.apiService.get('/api/extras/estatisticas');
            
            if (response && response.success && response.data) {
                const stats = response.data;
                document.getElementById('stat-total-extras').textContent = stats.total_extras || 0;
                document.getElementById('stat-extras-ativos').textContent = stats.extras_ativos || 0;
                document.getElementById('stat-extras-inativos').textContent = stats.extras_inativos || 0;
                document.getElementById('stat-valor-total').textContent = 'R$ ' + this.formatMoney(stats.valor_total_transferencias || 0);

                const modal = new bootstrap.Modal(document.getElementById('modal-estatisticas-extras'));
                modal.show();
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            this.showError('Erro ao carregar estatísticas: ' + error.message);
        }
    }

    /**
     * Formatar valor monetário
     */
    formatMoney(value) {
        if (!value && value !== 0) return '0,00';
        return parseFloat(value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Mostrar alerta de sucesso
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Mostrar alerta de erro
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * Editar transferência
     */
    async editarTransferencia(id) {
        console.log('🎯 editarTransferencia INÍCIO - id:', id, 'currentTransferencia antes:', this.currentTransferencia);
        // MOSTRAR MODAL IMEDIATAMENTE para feedback visual
        const modal = document.getElementById('modal-transferencias');
        if (!modal) {
            console.error('❌ Modal não encontrado no DOM');
            alert('Erro: Modal não encontrado!');
            return;
        }

        try {
            // Buscar transferência específica da API
            console.log('🔍 Buscando transferência ID:', id);
            const response = await this.apiService.get(`/api/transferencias/${id}`);
            
            if (!response || !response.success) {
                throw new Error('Transferência não encontrada');
            }
            
            const transferencia = response.data || response;
            console.log('📋 Transferência encontrada:', transferencia);

            try {
                // DEFINIR currentTransferencia para que os valores sejam carregados
                this.currentTransferencia = transferencia;
                console.log('✅ currentTransferencia SETEADO:', this.currentTransferencia);
                console.log('💰 Dados da transferência para valores:', {
                    id_proprietarios: transferencia.id_proprietarios,
                    transferenciaCompleta: transferencia
                });
            } catch (error) {
                console.error('❌ Erro ao setar currentTransferencia:', error);
            }

            // Resetar formulário
            const form = document.getElementById('form-transferencias');
            if (form) form.reset();

            // Adicionar campo hidden para o ID da transferência
            let hiddenId = form.querySelector('input[name="transferencia_id"]');
            if (!hiddenId) {
                hiddenId = document.createElement('input');
                hiddenId.type = 'hidden';
                hiddenId.name = 'transferencia_id';
                form.appendChild(hiddenId);
            }
            hiddenId.value = transferencia.id;

            // Definir título
            const modalTitle = document.getElementById('modalTransferenciasLabel');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Transferência';
            }

            // Preencher campos
            const nomeInput = document.getElementById('transferencia-nome');
            if (nomeInput) nomeInput.value = transferencia.nome_transferencia || '';

            const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
            if (dataCriacaoInput && transferencia.data_criacao) {
                dataCriacaoInput.value = transferencia.data_criacao.split('T')[0];
            }

            const dataFimInput = document.getElementById('transferencia-data-fim');
            if (dataFimInput && transferencia.data_fim) {
                dataFimInput.value = transferencia.data_fim.split('T')[0];
            }

            // CARREGAR PROPRIETÁRIOS PRIMEIRO se não estiverem carregados
            if (!this.allProprietarios || this.allProprietarios.length === 0) {
                console.log('🔄 Carregando proprietários primeiro...');
                await this.loadProprietarios();
            }

            // CARREGAR ALIASES E SELECIONAR O CORRETO
            console.log('🔄 Carregando aliases...');
            await this.carregarAliasParaTransferencia();
            
            // Aguardar um pouco para os aliases serem carregados
            setTimeout(() => {
                const aliasSelect = document.getElementById('transferencia-alias');
                if (aliasSelect && transferencia.alias_id) {
                    aliasSelect.value = transferencia.alias_id;
                    console.log('✅ Alias selecionado:', transferencia.alias_id);
                    
                    // Carregar proprietários do alias selecionado
                    console.log('🔄 Carregando proprietários do alias...');
                    if (typeof this.carregarProprietariosAlias === 'function') {
                        this.carregarProprietariosAlias(transferencia.alias_id);
                        console.log('✅ Função carregarProprietariosAlias chamada');
                    } else {
                        console.error('❌ Função carregarProprietariosAlias não encontrada');
                    }
                } else {
                    console.warn('⚠️ Alias select não encontrado ou transferência sem alias_id');
                }
            }, 200); // Aumentei para 200ms para dar mais tempo

            // MOSTRAR MODAL
            const bsModal = new bootstrap.Modal(modal, {
                backdrop: 'static',
                keyboard: false
            });
            bsModal.show();
            console.log('✅ Modal mostrado com sucesso');

        } catch (error) {
            console.error('❌ Erro ao buscar transferência:', error);
            alert('Erro ao carregar transferência: ' + error.message);
        }
    }

    /**
     * Excluir transferência
     */
    async excluirTransferencia(id) {
    console.log('[DEBUG] allTransferencias:', this.allTransferencias);
    console.log('[DEBUG] Entrando en excluirTransferencia:', id);
        try {
            // Executar a exclusão diretamente (modal já confirma)
            console.log('[DEBUG] Llamando executeDeleteTransferencia com:', id);
            await this.executeDeleteTransferencia(id);
        } catch (error) {
            console.error('Erro ao excluir transferência:', error);
            this.showError('Erro ao excluir transferência: ' + error.message);
        }
    }

    /**
     * Executar exclusão de transferência sem bloquear a UI
     */
    async executeDeleteTransferencia(id) {
        // Evitar operações múltiplas
        if (this.pendingOperations.has(`delete-transferencia-${id}`)) {
            return;
        }

        const operationId = `delete-transferencia-${id}`;
        this.pendingOperations.add(operationId);
        
        try {
            console.log('🗑️ Excluindo transferência:', id);
            console.log('[DEBUG] Llamando apiService.delete con:', `/api/transferencias/${id}`);

            // Chamada de API sem bloquear a UI
            const response = await this.apiService.delete(`/api/transferencias/${id}`);
            
            if (response && (response.message || response.success !== false)) {
                // Recargar transferências da API para garantir dados atualizados
                this.showSuccess('Transferência excluída com sucesso!');
                await this.loadTransferencias();
                
            } else {
                throw new Error('Resposta inválida do servidor');
            }

        } catch (error) {
            console.error('Erro ao excluir transferência:', error);
            this.showError('Erro ao excluir transferência: ' + error.message);
        } finally {
            this.pendingOperations.delete(operationId);
        }
    }

    /**
     * Mostrar alerta
     */
    showAlert(message, type, containerId = 'extras-alerts') {
        const alertsContainer = document.getElementById(containerId);
        if (!alertsContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertsContainer.appendChild(alert);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alert && alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.extrasManager = new ExtrasManager();
    window.extrasManager.apiService = window.apiService;
    // Disponibilizar também como extrasModule para o gerenciador de UI
    window.extrasModule = window.extrasManager;
    console.log('✅ ExtrasManager inicializado');
});

// Adicionar método applyPermissions à classe ExtrasManager
ExtrasManager.prototype.applyPermissions = function(isAdmin) {
    console.log(`🔒 Aplicando permissões no módulo Extras: ${isAdmin ? 'ADMIN' : 'USUÁRIO'}`);

    const btnNovoAlias = document.getElementById('btn-novo-alias');
    if (btnNovoAlias) {
        btnNovoAlias.disabled = !isAdmin;
        btnNovoAlias.title = isAdmin ? 'Criar novo alias' : 'Apenas administradores podem criar alias';
    }

    const btnNovasTransferencias = document.getElementById('btn-novas-transferencias');
    if (btnNovasTransferencias) {
        btnNovasTransferencias.disabled = !isAdmin;
        btnNovasTransferencias.title = isAdmin ? 'Criar nova transferência' : 'Apenas administradores podem criar transferências';
    }

    // Re-renderizar tabelas para atualizar os botões de ação
    if (this.allExtras) {
        this.renderExtrasTable(this.allExtras);
    }
    if (this.allTransferencias) {
        this.renderTransferenciasTable(this.allTransferencias);
    }
};
