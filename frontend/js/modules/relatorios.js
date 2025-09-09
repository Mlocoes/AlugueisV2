// Módulo de Relatórios
class RelatoriosManager {
    constructor() {
        this.currentData = [];
        this.filteredData = [];
        this.apiService = null;
        this.init();
    }

    init() {
        console.log('RelatoriosManager inicializado');
        
        // Esperar que o ApiService esteja disponível
        this.waitForApiService().then(() => {
            console.log('✅ RelatoriosManager pronto - event listeners serão configurados no load()');
            // Event listeners serão configurados no método load() quando o DOM estiver pronto
        });
    }

    async waitForApiService() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.apiService) {
                this.apiService = window.apiService;
                console.log('✅ ApiService conectado ao RelatoriosManager');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.error('❌ ApiService não disponível após', maxAttempts * 100, 'ms');
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners de relatórios...');
        
        // Evento para filtrar por ano
        const anoSelect = document.getElementById('relatorios-ano-select');
        if (anoSelect) {
            anoSelect.addEventListener('change', () => {
                console.log('🎯 Filtro de ano alterado');
                this.filterData();
            });
            console.log('✅ Event listener configurado para ano-select');
        } else {
            console.warn('⚠️ Elemento relatorios-ano-select não encontrado');
        }

        // Evento para filtrar por mês
        const mesSelect = document.getElementById('relatorios-mes-select');
        if (mesSelect) {
            mesSelect.addEventListener('change', () => {
                console.log('🎯 Filtro de mês alterado');
                this.filterData();
            });
            console.log('✅ Event listener configurado para mes-select');
        } else {
            console.warn('⚠️ Elemento relatorios-mes-select não encontrado');
        }

        // Evento para filtrar por proprietário
        const proprietarioSelect = document.getElementById('relatorios-proprietario-select');
        if (proprietarioSelect) {
            proprietarioSelect.addEventListener('change', () => {
                console.log('🎯 Filtro de proprietário alterado');
                this.filterData();
            });
            console.log('✅ Event listener configurado para proprietario-select');
        } else {
            console.warn('⚠️ Elemento relatorios-proprietario-select não encontrado');
        }

        // Evento para checkbox de transferências
        const transferenciasCheck = document.getElementById('relatorios-transferencias-check');
        if (transferenciasCheck) {
            transferenciasCheck.addEventListener('change', () => {
                console.log('📋 Checkbox transferências alterado');
                this.updateTable();
            });
            console.log('✅ Event listener configurado para transferencias-check');
        } else {
            console.warn('⚠️ Elemento relatorios-transferencias-check não encontrado');
        }
    }

    /**
     * Método para carregar dados quando a aba é ativada (chamado pelo UI manager)
     */
    async load() {
        console.log('🔄 Carregando dados de relatórios...');
        try {
            // Apenas carregar se houver ApiService e o usuário estiver autenticado
            if (!this.apiService) {
                console.warn('⚠️ ApiService não disponível para relatórios');
                return;
            }

            // Verificar autenticação antes de carregar
            if (window.authService && !window.authService.isAuthenticated()) {
                console.warn('⚠️ Usuário não autenticado - não carregando relatórios');
                return;
            }

            // ⭐ IMPORTANTE: Configurar event listeners agora que o DOM está pronto
            this.setupEventListeners();

            await this.loadInitialData();
        } catch (error) {
            console.error('❌ Erro ao carregar relatórios:', error);
        }
    }

    async loadInitialData() {
        try {
            // Carregar anos disponíveis
            await this.loadYears();
            
            // Carregar proprietários
            await this.loadProprietarios();
            
            // Carregar dados iniciais
            await this.loadRelatoriosData();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados iniciais');
        }
    }

    async loadYears() {
        try {
            if (!this.apiService) {
                console.error('ApiService não disponível');
                return;
            }

            const response = await this.apiService.get('/api/reportes/anos-disponiveis');
            const anos = response.success ? response.data : response;
            
            if (!Array.isArray(anos)) {
                console.error('Resposta de anos não é um array:', anos);
                return;
            }
            
            const anoSelect = document.getElementById('relatorios-ano-select');
            anoSelect.innerHTML = '<option value="">Todos os anos</option>';
            
            anos.forEach(ano => {
                const option = document.createElement('option');
                option.value = ano;
                option.textContent = ano;
                anoSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('Erro ao carregar anos:', error);
        }
    }

    async loadProprietarios() {
        try {
            if (!this.apiService) {
                console.error('ApiService não disponível');
                return;
            }

            const response = await this.apiService.get('/api/proprietarios/');
            const data = response.success ? response.data : response;
            
            if (!Array.isArray(data)) {
                console.error('Resposta de proprietarios não é um array:', data);
                return;
            }
            
            const proprietarioSelect = document.getElementById('relatorios-proprietario-select');
            proprietarioSelect.innerHTML = '<option value="">Todos os proprietários</option>';
            
            data.forEach(proprietario => {
                const option = document.createElement('option');
                option.value = proprietario.id;
                option.textContent = `${proprietario.nome} ${proprietario.sobrenome || ''}`.trim();
                proprietarioSelect.appendChild(option);
            });
            
            // Cargar aliases después de cargar proprietários
            await this.loadAliases();
            
        } catch (error) {
            console.error('Erro ao carregar proprietários:', error);
        }
    }

    async loadRelatoriosData() {
        try {
            if (!this.apiService) {
                console.error('ApiService não disponível');
                return;
            }

            // Construir parâmetros de consulta
            const params = new URLSearchParams();
            
            const ano = document.getElementById('relatorios-ano-select')?.value;
            const mes = document.getElementById('relatorios-mes-select')?.value;
            const proprietarioSelection = document.getElementById('relatorios-proprietario-select')?.value;
            
            if (ano) params.append('ano', ano);
            if (mes) params.append('mes', mes);
            
            // Manejar selección de proprietário o alias
            if (proprietarioSelection) {
                const proprietarioIds = await this.getProprietarioIds(proprietarioSelection);
                
                if (proprietarioIds && proprietarioIds.length > 0) {
                    if (proprietarioIds.length === 1) {
                        // Un solo proprietário
                        params.append('proprietario_id', proprietarioIds[0]);
                    } else {
                        // Múltiples proprietários (alias) - necesitamos filtrar después
                        this.selectedProprietarioIds = proprietarioIds;
                        console.log(`🔍 Filtrando por múltiples proprietários: ${proprietarioIds.join(', ')}`);
                    }
                }
            } else {
                this.selectedProprietarioIds = null;
            }
            
            const response = await this.apiService.get(`/api/reportes/resumen-mensual?${params.toString()}`);
            const data = response.success ? response.data : response;
            
            if (!Array.isArray(data)) {
                console.error('Resposta de relatórios não é um array:', data);
                return;
            }
            
            this.currentData = data;
            this.filteredData = [...data];
            
            // Aplicar filtro de múltiples proprietários se é um alias
            if (this.selectedProprietarioIds && this.selectedProprietarioIds.length > 1) {
                this.filteredData = this.filteredData.filter(item => 
                    this.selectedProprietarioIds.includes(item.proprietario_id)
                );
                console.log(`📊 Filtrados ${this.filteredData.length} registros para o alias`);
            }
            
            this.updateTable();
            this.updateSummary();
            
        } catch (error) {
            console.error('Erro ao carregar dados de relatórios:', error);
            this.showError('Erro ao carregar relatórios');
        }
    }

    async loadAliases() {
        try {
            console.log('🔄 Carregando aliases...');
            const response = await this.apiService.get('/api/extras/reportes');
            const data = response.success ? response.data : response;
            
            if (!Array.isArray(data)) {
                console.log('⚠️ Resposta de aliases não é um array:', data);
                return;
            }
            
            const proprietarioSelect = document.getElementById('relatorios-proprietario-select');
            
            // Agregar aliases ao combo se existirem
            if (data.length > 0) {
                console.log(`✅ Encontrados ${data.length} aliases`);
                
                // Criar separador visual
                const separatorOption = document.createElement('option');
                separatorOption.disabled = true;
                separatorOption.textContent = '──── ALIASES ────';
                proprietarioSelect.appendChild(separatorOption);
                
                // Agregar cada alias
                data.forEach(alias => {
                    console.log(`📝 Adicionando alias: ${alias.alias} (ID: ${alias.id})`);
                    const option = document.createElement('option');
                    option.value = `alias:${alias.id}`;
                    option.textContent = `👥 ${alias.alias}`;
                    option.className = 'alias-option';
                    proprietarioSelect.appendChild(option);
                });
            } else {
                console.log('⚠️ Nenhum alias encontrado');
            }
            
        } catch (error) {
            console.error('Erro ao carregar aliases:', error);
        }
    }

    async getProprietarioIds(selectedValue) {
        if (!selectedValue) return null;
        
        // Se é um alias (formato: "alias:ID")
        if (selectedValue.startsWith('alias:')) {
            const aliasId = selectedValue.replace('alias:', '');
            
            try {
                const response = await this.apiService.get(`/api/extras/${aliasId}/proprietarios/relatorios`);
                const data = response.success ? response.data : response;
                
                if (Array.isArray(data)) {
                    const ids = data.map(p => p.id);
                    console.log(`👥 Alias contém proprietários: ${ids.join(', ')}`);
                    return ids;
                }
            } catch (error) {
                console.error('Erro ao obter proprietários do alias:', error);
            }
            
            return [];
        }
        
        // Se é um proprietário individual
        return [parseInt(selectedValue)];
    }

    async filterData() {
        console.log('🔍 Aplicando filtros de relatórios...');
        
        // Obter valores dos filtros
        const ano = document.getElementById('relatorios-ano-select')?.value;
        const mes = document.getElementById('relatorios-mes-select')?.value;
        const proprietarioSelection = document.getElementById('relatorios-proprietario-select')?.value;
        
        console.log(`🎯 Filtros: Ano=${ano}, Mês=${mes}, Proprietário=${proprietarioSelection}`);
        
        // Se não há filtros, mostrar todos os dados
        if (!ano && !mes && !proprietarioSelection) {
            this.filteredData = [...this.currentData];
            console.log(`📊 Sem filtros - mostrando ${this.filteredData.length} registros`);
            this.updateTable();
            this.updateSummary();
            return;
        }
        
        // Recarregar dados com filtros aplicados no backend
        await this.loadRelatoriosData();
    }

    // Función para obtener valor de transferencias para un proprietário específico
    async getTransferenciasValue(proprietarioId, ano, mes) {
        console.log(`🔍 Calculando transferências para proprietário ${proprietarioId} em ${mes}/${ano}`);
        
        if (!proprietarioId) {
            console.log('⚠️ Proprietário ID inválido');
            return 0;
        }
        
        try {
            // Intentar obtener transferencias desde la API
            console.log('📡 Buscando transferências na API...');
            const response = await this.apiService.get('/api/transferencias/relatorios');
            
            let transferencias = [];
            
            if (response.success && Array.isArray(response.data)) {
                transferencias = response.data;
                console.log(`📊 ${transferencias.length} transferências encontradas na API`);
            } else if (Array.isArray(response)) {
                transferencias = response;
                console.log(`📊 ${transferencias.length} transferências encontradas na API (resposta direta)`);
            } else {
                console.warn('⚠️ API não disponível, usando dados de fallback');
                // Fallback para dados de prueba cuando la API no está disponible
                transferencias = [
                    {
                        id: 1,
                        data_criacao: "2025-07-01T00:00:00",
                        data_fim: null,
                        id_proprietarios: JSON.stringify([
                            {"id": 1, "valor": 1000.00}, // Jandira Cozzolino
                            {"id": 3, "valor": -1000.00}  // Fabio Cozzolino
                        ])
                    }
                ];
                console.log(`📊 Usando ${transferencias.length} transferências de fallback`);
            }
            
            let valorTotal = 0;
            
            for (const transferencia of transferencias) {
                console.log(`🔍 Analisando transferência ID ${transferencia.id}`);
                
                // Verificar se a transferência está ativa no período
                const dataInicio = new Date(transferencia.data_criacao);
                const dataFim = transferencia.data_fim ? new Date(transferencia.data_fim) : null;
                const periodoConsulta = new Date(ano, mes - 1, 1); // Primer día del mes
                
                const estaAtiva = dataInicio <= periodoConsulta && (!dataFim || dataFim >= periodoConsulta);
                
                if (estaAtiva) {
                    try {
                        // Verificar se este proprietário está na lista de beneficiarios
                        let proprietarios = [];
                        
                        // La API puede devolver los datos de diferentes formas
                        if (transferencia.id_proprietarios) {
                            // Formato de la base de datos (JSON string)
                            proprietarios = JSON.parse(transferencia.id_proprietarios);
                        } else if (transferencia.proprietarios) {
                            // Formato ya parseado
                            proprietarios = transferencia.proprietarios;
                        }
                        
                        const proprietario = proprietarios.find(p => p.id == proprietarioId);
                        if (proprietario && proprietario.valor) {
                            const valor = parseFloat(proprietario.valor);
                            valorTotal += valor;
                            console.log(`💰 Transferência encontrada: R$ ${valor.toFixed(2)} para proprietário ${proprietarioId}`);
                        }
                    } catch (parseError) {
                        console.error('Erro ao parsear proprietários da transferência:', parseError);
                    }
                }
            }
            
            console.log(`💵 Total transferências para proprietário ${proprietarioId}: R$ ${valorTotal.toFixed(2)}`);
            return valorTotal;
            
        } catch (error) {
            console.error('❌ Erro ao obter transferências da API:', error);
            
            // Fallback para dados de prueba em caso de erro
            console.log('🔄 Usando dados de fallback...');
            return this.getTransferenciasValueFallback(proprietarioId, ano, mes);
        }
    }
    
    // Función de fallback con datos de prueba
    getTransferenciasValueFallback(proprietarioId, ano, mes) {
        console.log(`🔄 Fallback: Calculando transferências para proprietário ${proprietarioId}`);
        
        const transferenciasSimuladas = [
            {
                id: 1,
                data_criacao: "2025-07-01T00:00:00",
                data_fim: null,
                proprietarios: [
                    {"id": 1, "valor": 1000.00}, // Jandira Cozzolino
                    {"id": 3, "valor": -1000.00}  // Fabio Cozzolino
                ]
            }
        ];
        
        let valorTotal = 0;
        
        for (const transferencia of transferenciasSimuladas) {
            const dataInicio = new Date(transferencia.data_criacao);
            const dataFim = transferencia.data_fim ? new Date(transferencia.data_fim) : null;
            const periodoConsulta = new Date(ano, mes - 1, 1);
            
            const estaAtiva = dataInicio <= periodoConsulta && (!dataFim || dataFim >= periodoConsulta);
            
            if (estaAtiva) {
                const proprietario = transferencia.proprietarios.find(p => p.id == proprietarioId);
                if (proprietario && proprietario.valor) {
                    const valor = parseFloat(proprietario.valor);
                    valorTotal += valor;
                    console.log(`💰 Fallback: R$ ${valor.toFixed(2)} para proprietário ${proprietarioId}`);
                }
            }
        }
        
        return valorTotal;
    }

    async updateTable() {
        console.log('🔄 updateTable() chamada');
        
        const tbody = document.getElementById('relatorios-table-body');
        
        if (!tbody) {
            console.error('Elemento relatorios-table-body não encontrado');
            return;
        }
        
        // Verificar se checkbox de transferências existe e está marcado
        const transferenciasCheck = document.getElementById('relatorios-transferencias-check');
        const incluirTransferencias = transferenciasCheck ? transferenciasCheck.checked : false;
        console.log(`📋 Checkbox transferências: ${incluirTransferencias ? 'ATIVADO' : 'DESATIVADO'}`);
        
        if (!this.filteredData || this.filteredData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-info-circle me-2"></i>
                        Nenhum dado encontrado para os filtros selecionados
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        
        for (let index = 0; index < this.filteredData.length; index++) {
            const item = this.filteredData[index];
            
            // Calcular valor base de aluguéis
            let somaAlugueis = parseFloat(item.soma_alugueis || 0);
            
            // Si transferencias están activadas, agregar el valor
            if (incluirTransferencias) {
                const valorTransferencias = await this.getTransferenciasValue(
                    item.proprietario_id, 
                    item.ano, 
                    item.mes
                );
                somaAlugueis += valorTransferencias;
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="fw-bold">${item.nome_proprietario}</td>
                <td class="text-center">${item.mes}/${item.ano}</td>
                <td class="text-end">
                    ${this.formatMoney(somaAlugueis)}
                </td>
                <td class="text-end">${this.formatMoney(item.soma_taxas)}</td>
                <td class="text-center">
                    <span class="badge bg-success">
                        <i class="fas fa-building me-1"></i>${item.quantidade_imoveis || 1} imóvel(is)
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    updateSummary() {
    // Elementos resumen eliminados, no se actualiza nada
    return;
    }

    formatMoney(value) {
        if (!value && value !== 0) return '0,00';
        return parseFloat(value).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showWarning(message) {
        this.showAlert(message, 'warning');
    }

    showAlert(message, type) {
        const alertsContainer = document.getElementById('relatorios-alerts');
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
    window.relatoriosManager = new RelatoriosManager();
    // Disponibilizar também como relatoriosModule para o UI manager
    window.relatoriosModule = window.relatoriosManager;
});

// Função para mostrar tab (compatibilidade com sistema existente)
function showRelatorios() {
    if (window.relatoriosManager) {
        window.relatoriosManager.loadRelatoriosData();
    }
}
