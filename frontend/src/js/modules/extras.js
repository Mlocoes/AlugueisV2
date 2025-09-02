/**
 * Módulo de Extras - Sistema de Alias
 * Acesso exclusivo para administradores
 */

class ExtrasManager {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.currentExtra = null;
        this.currentTransferencia = null;
        this.allExtras = [];
        this.allTransferencias = [];
        this.allProprietarios = [];
        this.initialized = false;
        
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

        document.getElementById('btn-estatisticas-extras')?.addEventListener('click', () => {
            this.showEstatisticas();
        });

        // Formulários
        document.getElementById('form-alias')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarAlias();
        });

        document.getElementById('form-transferencias')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarTransferencias();
        });

        // Evento para carregar proprietários do alias selecionado
        document.getElementById('transferencia-alias')?.addEventListener('change', (e) => {
            this.carregarProprietariosAlias(e.target.value);
        });

        // Limpar currentTransferencia quando modal fechar
        document.getElementById('modal-transferencias')?.addEventListener('hidden.bs.modal', () => {
            this.currentTransferencia = null;
            console.log('🧹 Modal fechado - currentTransferencia limpo');
        });

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
            console.log('� Carregando extras...');
            
            const response = await this.apiService.get('/api/extras/');
            
            if (response && response.success && Array.isArray(response.data)) {
                this.allExtras = response.data;
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
            console.log('📥 Carregando proprietários...');
            
            const response = await this.apiService.get('/api/extras/proprietarios/disponiveis');
            
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

        if (!extras || extras.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Nenhum alias encontrado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = '';
        
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

            row.innerHTML = `
                <td><strong>${extra.alias}</strong></td>
                <td title="${proprietariosText}">
                    ${proprietariosText.length > 50 ? proprietariosText.substring(0, 50) + '...' : proprietariosText}
                </td>
                <td class="text-center">
                    <span class="badge ${extra.ativo ? 'bg-success' : 'bg-secondary'}">
                        ${extra.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.extrasManager.editarAlias(${extra.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.extrasManager.excluirAlias(${extra.id})" title="Excluir">
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
                    <td colspan="6" class="text-center text-muted py-4">
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
            
            row.innerHTML = `
                <td><strong>${transferencia.alias}</strong></td>
                <td>${transferencia.nome_transferencia}</td>
                <td class="text-center">
                    <span class="badge ${transferencia.ativo ? 'bg-success' : 'bg-secondary'}">
                        ${transferencia.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="text-center">${dataCriacaoFormatada}</td>
                <td class="text-center">${dataFimFormatada}</td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.extrasManager.editarTransferencia(${transferencia.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.extrasManager.excluirTransferencia(${transferencia.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * Popular selects de proprietários para ambos os modales
     */
    populateProprietariosSelects() {
        // Para el modal de Alias (solo proprietários pertenecentes)
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

        // Para el modal de Transferências (combo de aliases y otros selects)
        const aliasCombo = document.getElementById('transferencia-alias');
        if (aliasCombo) {
            aliasCombo.innerHTML = '<option value="">Selecione um alias...</option>';
            // Se llenará cuando se carguen los alias
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
    showAliasModal(extra = null) {
        this.currentExtra = extra;
        const modal = document.getElementById('modal-alias');
        const modalTitle = document.getElementById('modalAliasLabel');
        const form = document.getElementById('form-alias');
        
        if (extra) {
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Alias';
            this.populateAliasForm(extra);
        } else {
            modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
            form.reset();
            document.getElementById('alias-ativo').checked = true;
        }

        // Limpar alerts
        const alerts = document.getElementById('alias-alerts');
        if (alerts) alerts.innerHTML = '';

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Popular formulário de alias com dados
     */
    populateAliasForm(extra) {
        document.getElementById('alias-nome').value = extra.alias || '';
        document.getElementById('alias-ativo').checked = extra.ativo !== false;

        // Selecionar proprietários múltiplos
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
        const modal = document.getElementById('modal-transferencias');
        const form = document.getElementById('form-transferencias');
        
        // Si NO estamos editando, limpiar todo
        if (!this.currentTransferencia) {
            form.reset();
            
            // Limpiar campo de nome da transferencia
            const nomeInput = document.getElementById('transferencia-nome');
            if (nomeInput) nomeInput.value = '';
            
            // Inicializar data de criação con la fecha actual
            const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
            if (dataCriacaoInput) {
                const hoje = new Date();
                const dataFormatada = hoje.toISOString().split('T')[0];
                dataCriacaoInput.value = dataFormatada;
            }
            
            // Limpar data fim
            const dataFimInput = document.getElementById('transferencia-data-fim');
            if (dataFimInput) dataFimInput.value = '';
            
            // Ocultar container de proprietários hasta seleccionar alias
            const container = document.getElementById('transferencia-proprietarios-container');
            if (container) container.style.display = 'none';
        }
        
        // Carregar aliases disponíveis (siempre)
        this.carregarAliasParaTransferencia();

        // Limpar alerts
        const alerts = document.getElementById('transferencia-alerts');
        if (alerts) alerts.innerHTML = '';

        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    }

    /**
     * Carregar aliases para o combo de transferências
     */
    async carregarAliasParaTransferencia() {
        try {
            const response = await this.apiService.get('/api/extras/?ativo=true');
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
            }
        } catch (error) {
            console.error('Erro ao carregar aliases:', error);
            this.showError('Erro ao carregar aliases: ' + error.message);
        }
    }

    /**
     * Carregar proprietários do alias selecionado
     */
    async carregarProprietariosAlias(aliasId) {
        const container = document.getElementById('transferencia-proprietarios-container');
        const tableBody = document.getElementById('transferencia-proprietarios-table');
        
        if (!aliasId) {
            container.style.display = 'none';
            return;
        }

        try {
            // Obter dados do alias selecionado
            const aliasSelect = document.getElementById('transferencia-alias');
            const selectedOption = aliasSelect.querySelector(`option[value="${aliasId}"]`);
            
            if (selectedOption && selectedOption.dataset.proprietarios) {
                const proprietarioIds = JSON.parse(selectedOption.dataset.proprietarios);
                
                // Buscar nomes dos proprietários
                tableBody.innerHTML = '';
                
                console.log('👥 Carregando proprietários para tabela:', proprietarioIds);
                console.log('📝 Editando transferência?', this.currentTransferencia ? 'SIM' : 'NÃO');
                
                for (const id of proprietarioIds) {
                    const proprietario = this.allProprietarios.find(p => p.id === parseInt(id));
                    if (proprietario) {
                        // Se estamos editando, buscar o valor salvo
                        let valorSalvo = '';
                        if (this.currentTransferencia && this.currentTransferencia.id_proprietarios) {
                            try {
                                const proprietariosSalvos = JSON.parse(this.currentTransferencia.id_proprietarios);
                                const proprietarioSalvo = proprietariosSalvos.find(p => p.id === proprietario.id);
                                if (proprietarioSalvo) {
                                    valorSalvo = proprietarioSalvo.valor || '';
                                    console.log(`💰 Valor salvo para ${proprietario.nome}:`, valorSalvo);
                                }
                            } catch (error) {
                                console.error('Erro ao parsing id_proprietarios:', error);
                            }
                        }
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <strong>${proprietario.nome} ${proprietario.sobrenome || ''}</strong>
                            </td>
                            <td>
                                <div class="input-group">
                                    <span class="input-group-text">R$</span>
                                    <input type="number" class="form-control" 
                                           name="transferencia_${proprietario.id}" 
                                           step="0.01" placeholder="0,00"
                                           value="${valorSalvo}">
                                </div>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    }
                }
                
                container.style.display = 'block';
                console.log('✅ Tabela de proprietários carregada com valores salvos');
            }
        } catch (error) {
            console.error('Erro ao carregar proprietários do alias:', error);
            this.showError('Erro ao carregar proprietários: ' + error.message);
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
                alias: formData.get('alias').trim(),
                ativo: formData.get('ativo') === 'on',
                id_proprietarios: proprietariosSelecionados.length > 0 ? JSON.stringify(proprietariosSelecionados) : null,
                valor_transferencia: 0,  // Valor padrão para alias
                origem_id_proprietario: null,
                destino_id_proprietario: null
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
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modal-alias'));
                modal.hide();
                
                // Recarregar dados
                await this.loadExtras();
                await this.loadTransferencias();
            }

        } catch (error) {
            console.error('Erro ao salvar alias:', error);
            this.showAlert('Erro ao salvar alias: ' + error.message, 'danger', 'alias-alerts');
        }
    }

    /**
     * Salvar transferências
     */
    /**
     * Salvar transferências
     */
    async salvarTransferencias() {
        try {
            const aliasId = document.getElementById('transferencia-alias').value;
            const nomeTransferencia = document.getElementById('transferencia-nome').value.trim();
            const dataCriacao = document.getElementById('transferencia-data-criacao').value;
            const dataFim = document.getElementById('transferencia-data-fim').value;
            
            if (!aliasId) {
                this.showAlert('Selecione um alias', 'danger', 'transferencia-alerts');
                return;
            }

            if (!nomeTransferencia) {
                this.showAlert('Digite o nome da transferência', 'danger', 'transferencia-alerts');
                return;
            }

            if (!dataCriacao) {
                this.showAlert('Selecione a data de criação', 'danger', 'transferencia-alerts');
                return;
            }

            // Validar que data_fim seja posterior à data_criacao (se informada)
            if (dataFim && dataCriacao && new Date(dataFim) < new Date(dataCriacao)) {
                this.showAlert('Data fim deve ser posterior à data criação', 'danger', 'transferencia-alerts');
                return;
            }

            // Coletar valores das transferências
            const proprietarios = [];
            const inputs = document.querySelectorAll('#transferencia-proprietarios-table input[type="number"]');
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

            // Calcular valor total
            const valorTotal = proprietarios.reduce((sum, prop) => sum + prop.valor, 0);

            // Preparar dados para envio
            const transferenciaData = {
                alias_id: parseInt(aliasId),
                nome_transferencia: nomeTransferencia,
                valor_total: valorTotal,
                id_proprietarios: JSON.stringify(proprietarios),
                data_criacao: dataCriacao,
                data_fim: dataFim || null,
                ativo: true
            };

            let response;
            if (this.currentTransferencia) {
                // Atualizar transferência existente
                response = await this.apiService.put(`/api/transferencias/${this.currentTransferencia.id}`, transferenciaData);
            } else {
                // Criar nova transferência
                response = await this.apiService.post('/api/transferencias/', transferenciaData);
            }

            if (response && (response.id || response.success !== false)) {
                this.showSuccess(this.currentTransferencia ? 
                    'Transferência atualizada com sucesso!' : 
                    'Transferência criada com sucesso!');
                
                // Reset currentTransferencia
                this.currentTransferencia = null;
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modal-transferencias'));
                modal.hide();
                
                // Recarregar dados
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
            const extra = this.allExtras.find(e => e.id === id);
            if (!extra) {
                this.showError('Alias não encontrado');
                return;
            }

            if (!confirm(`Tem certeza que deseja excluir o alias "${extra.alias}"?`)) {
                return;
            }

            console.log('🗑️ Excluindo alias:', id);

            const response = await this.apiService.delete(`/api/extras/${id}`);
            
            if (response && response.success) {
                this.showSuccess('Alias excluído com sucesso!');
                await this.loadExtras();
                await this.loadTransferencias();
            }

        } catch (error) {
            console.error('Erro ao excluir alias:', error);
            this.showError('Erro ao excluir alias: ' + error.message);
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
        try {
            const transferencia = this.allTransferencias.find(t => t.id === id);
            if (!transferencia) {
                this.showError('Transferência não encontrada');
                return;
            }

            console.log('📝 Editando transferência:', transferencia);

            // Marcar como edição ANTES de mostrar o modal
            this.currentTransferencia = transferencia;
            
            // Popular o modal com os dados da transferência
            this.showTransferenciasModal();
            
            // Aguardar o modal ser mostrado e os aliases serem carregados
            setTimeout(async () => {
                try {
                    // Aguardar que os aliases sejam carregados
                    await this.carregarAliasParaTransferencia();
                    
                    // Aguardar mais um pouco para garantir que o DOM esteja atualizado
                    setTimeout(() => {
                        // Selecionar o alias correto (usando o alias_id da transferência)
                        const aliasSelect = document.getElementById('transferencia-alias');
                        if (aliasSelect) {
                            aliasSelect.value = transferencia.alias_id;
                            console.log('🔍 Alias selecionado:', aliasSelect.value);
                        }
                        
                        // Preencher os campos
                        const nomeInput = document.getElementById('transferencia-nome');
                        if (nomeInput) {
                            nomeInput.value = transferencia.nome_transferencia || '';
                            console.log('📝 Nome preenchido:', nomeInput.value);
                        }
                        
                        // Preencher datas
                        if (transferencia.data_criacao) {
                            const dataCriacaoInput = document.getElementById('transferencia-data-criacao');
                            if (dataCriacaoInput) {
                                const data = new Date(transferencia.data_criacao);
                                dataCriacaoInput.value = data.toISOString().split('T')[0];
                                console.log('📅 Data criação preenchida:', dataCriacaoInput.value);
                            }
                        }
                        
                        if (transferencia.data_fim) {
                            const dataFimInput = document.getElementById('transferencia-data-fim');
                            if (dataFimInput) {
                                const data = new Date(transferencia.data_fim);
                                dataFimInput.value = data.toISOString().split('T')[0];
                                console.log('📅 Data fim preenchida:', dataFimInput.value);
                            }
                        }
                        
                        // Carregar proprietários do alias automaticamente
                        this.carregarProprietariosAlias(transferencia.alias_id);
                        
                    }, 200);
                    
                } catch (error) {
                    console.error('Erro ao carregar dados para edição:', error);
                }
            }, 300);

        } catch (error) {
            console.error('Erro ao carregar transferência para edição:', error);
            this.showError('Erro ao carregar transferência: ' + error.message);
        }
    }

    /**
     * Excluir transferência
     */
    async excluirTransferencia(id) {
        try {
            const transferencia = this.allTransferencias.find(t => t.id === id);
            if (!transferencia) {
                this.showError('Transferência não encontrada');
                return;
            }

            if (!confirm(`Tem certeza que deseja excluir a transferência "${transferencia.nome_transferencia}"?`)) {
                return;
            }

            console.log('🗑️ Excluindo transferência:', id);

            const response = await this.apiService.delete(`/api/transferencias/${id}`);
            
            if (response && (response.message || response.success !== false)) {
                this.showSuccess('Transferência excluída com sucesso!');
                await this.loadTransferencias();
            }

        } catch (error) {
            console.error('Erro ao excluir transferência:', error);
            this.showError('Erro ao excluir transferência: ' + error.message);
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
        
        // Auto remover após 5 segundos
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
    
    // Disponibilizar também como extrasModule para o UI manager
    window.extrasModule = window.extrasManager;
    
    console.log('✅ ExtrasManager inicializado');
});
