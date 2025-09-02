

class AlugueisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.matriz = [];
        this.proprietarios = [];
        this.imoveis = [];
        this.initialized = false;
        this.anosDisponiveis = [];
        this.anoSelecionado = null;
        this.mesSelecionado = null;
    }

    init() {
        if (this.initialized) return;
        console.log('🏠 Inicializando módulo Aluguéis');
        this.initialized = true;
        this.setupPeriodDropdowns();
    }

    async load() {
        this.init();
        await this.loadAnosDisponiveis();
    }

    async loadAnosDisponiveis() {
        try {
            const resp = await this.apiService.getAnosDisponiveisAlugueis();
            if (resp.success && resp.data && resp.data.anos && resp.data.anos.length) {
                // Solo el año más reciente
                const anoMaisRecente = Math.max(...resp.data.anos);
                this.anosDisponiveis = [anoMaisRecente];
                this.anoSelecionado = anoMaisRecente;
                this.populateAnoDropdown();
                // Cargar automáticamente el mes más reciente
                await this.loadMesReciente();
            } else {
                this.anosDisponiveis = [];
                this.populateAnoDropdown();
            }
        } catch (error) {
            this.anosDisponiveis = [];
            this.populateAnoDropdown();
        }
    }

    async loadMesReciente() {
        try {
            // Usar fetch directo como fallback para obtener último período
            let ultimoPeriodo = null;
            try {
                const response = await fetch('/api/alugueis/ultimo-periodo/', {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': window.authService?.getAuthHeader()?.Authorization || ''
                    }
                });
                if (response.ok) {
                    ultimoPeriodo = await response.json();
                }
            } catch (fetchError) {
                console.warn('Erro ao usar fetch direto:', fetchError);
            }

            console.log('🔍 Ultimo periodo obtido:', ultimoPeriodo);

            if (ultimoPeriodo?.success && ultimoPeriodo?.data?.ano && ultimoPeriodo?.data?.mes) {
                this.mesSelecionado = ultimoPeriodo.data.mes;
                console.log('🔍 Mes selecionado definido como:', this.mesSelecionado);
                this.populateMesDropdown();
                // Cargar matriz automáticamente con el mes más reciente de la BD
                this.loadMatrizAlugueis(this.anoSelecionado, ultimoPeriodo.data.mes);
            } else {
                // Si no hay datos, seleccionar "Todos os meses" por defecto
                console.warn('Sem dados de ultimo periodo, usando todos os meses');
                this.mesSelecionado = 'todos';
                this.populateMesDropdown();
                this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
            }
        } catch (error) {
            console.warn('Erro ao carregar ultimo periodo, usando todos os meses:', error);
            // Si hay error, seleccionar "Todos os meses" por defecto
            this.mesSelecionado = 'todos';
            this.populateMesDropdown();
            this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
        }
    } populateAnoDropdown() {
        const anoSelect = document.getElementById('alugueis-ano-select');
        if (!anoSelect) return;
        anoSelect.innerHTML = '<option value="">Selecione o ano</option>';
        this.anosDisponiveis.forEach(ano => {
            anoSelect.innerHTML += `<option value="${ano}">${ano}</option>`;
        });
        anoSelect.disabled = this.anosDisponiveis.length === 0;

        // Seleccionar automáticamente el año más reciente
        if (this.anoSelecionado) {
            anoSelect.value = this.anoSelecionado;
        }

        // Reset mês
        this.populateMesDropdown();
    }

    populateMesDropdown() {
        const mesSelect = document.getElementById('alugueis-mes-select');
        if (!mesSelect) return;
        mesSelect.innerHTML = '<option value="">Selecione o mês</option>';
        if (this.anosDisponiveis.length > 0) {
            // Opción para todos los meses
            mesSelect.innerHTML += '<option value="todos">Todos os meses</option>';
            // Enero a Diciembre
            const meses = [
                { num: 1, nome: 'Janeiro' },
                { num: 2, nome: 'Fevereiro' },
                { num: 3, nome: 'Março' },
                { num: 4, nome: 'Abril' },
                { num: 5, nome: 'Maio' },
                { num: 6, nome: 'Junho' },
                { num: 7, nome: 'Julho' },
                { num: 8, nome: 'Agosto' },
                { num: 9, nome: 'Setembro' },
                { num: 10, nome: 'Outubro' },
                { num: 11, nome: 'Novembro' },
                { num: 12, nome: 'Dezembro' }
            ];
            meses.forEach(m => {
                mesSelect.innerHTML += `<option value="${m.num}">${m.nome}</option>`;
            });
            mesSelect.disabled = false;

            // Seleccionar automáticamente el mes más reciente si está disponible
            if (this.mesSelecionado) {
                console.log('🔍 Selecionando mes:', this.mesSelecionado);
                mesSelect.value = this.mesSelecionado;
                console.log('🔍 Valor do select após seleção:', mesSelect.value);
            }
        } else {
            mesSelect.disabled = true;
        }
    }

    setupPeriodDropdowns() {
        const anoSelect = document.getElementById('alugueis-ano-select');
        const mesSelect = document.getElementById('alugueis-mes-select');
        if (anoSelect) {
            anoSelect.addEventListener('change', (e) => {
                const ano = e.target.value;
                this.anoSelecionado = ano || null;
                // Habilita mês apenas se ano selecionado
                if (mesSelect) {
                    mesSelect.disabled = !ano;
                    mesSelect.value = '';
                }
                this.mesSelecionado = null;
                if (ano) {
                    // Carrega matriz apenas com ano (sem mês)
                    this.loadMatrizAlugueis(ano, null);
                } else {
                    // Limpa matriz
                    this.clearMatriz();
                }
            });
        }
        if (mesSelect) {
            mesSelect.addEventListener('change', (e) => {
                const mes = e.target.value;
                this.mesSelecionado = mes || null;
                if (this.anoSelecionado) {
                    if (mes === 'todos') {
                        // Mostrar suma de todos los meses del año
                        this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
                    } else if (mes) {
                        // Mostrar matriz filtrada por mes específico
                        this.loadMatrizAlugueis(this.anoSelecionado, mes);
                    } else {
                        // Sin selección, limpiar matriz
                        this.clearMatriz();
                    }
                } else {
                    this.clearMatriz();
                }
            });
        }
    }

    async loadMatrizAlugueis(ano = null, mes = null) {
        try {
            this.uiManager.showLoading('Carregando matriz de aluguéis...');

            // Verificar se apiService está disponível
            if (!this.apiService) {
                throw new Error('API Service não está disponível');
            }

            let resp;
            if (mes === 'todos') {
                // Usar fetch directo para suma de todos los meses
                try {
                    console.log('🔍 Buscando soma de todos os meses para ano:', ano);
                    const response = await fetch(`/api/alugueis/distribuicao-todos-meses/?ano=${ano}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': window.authService?.getAuthHeader()?.Authorization || ''
                        }
                    });
                    if (response.ok) {
                        resp = await response.json();
                        console.log('✅ Soma de todos os meses obtida via fetch direto');
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (fetchError) {
                    console.warn('Erro ao usar fetch direto para todos os meses, usando método padrão:', fetchError);
                    resp = await this.apiService.getDistribuicaoMatrizAlugueis(ano, null);
                }
            } else {
                // Usar endpoint normal para mes específico
                resp = await this.apiService.getDistribuicaoMatrizAlugueis(ano, mes);
            }

            this.uiManager.hideLoading();
            console.log('🔎 Dados recebidos do backend:', resp.data); if (!resp.success || !resp.data || !resp.data.matriz) {
                this.uiManager.showError('Erro ao carregar matriz de aluguéis.');
                this.clearMatriz();
                return;
            }

            this.matriz = resp.data.matriz;
            this.proprietarios = resp.data.proprietarios;
            this.imoveis = resp.data.imoveis;
            this.renderMatriz();
        } catch (error) {
            this.uiManager.showError('Erro ao carregar matriz de aluguéis: ' + error.message);
            this.uiManager.hideLoading();
            this.clearMatriz();
        }
    }

    clearMatriz() {
        const tableHead = document.getElementById('alugueis-matrix-head');
        const tableBody = document.getElementById('alugueis-matrix-body');
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.</td></tr>';
        const tableContainer = document.getElementById('alugueis-table-container');
        if (tableContainer) tableContainer.style.display = 'block';
    }

    renderMatriz() {
        // Usar IDs e estrutura igual à de participações
        const tableHead = document.getElementById('alugueis-matrix-head');
        const tableBody = document.getElementById('alugueis-matrix-body');
        const tableContainer = document.getElementById('alugueis-table-container');
        if (tableContainer) tableContainer.style.display = 'block';
        if (!tableHead || !tableBody) return;

        if (!this.matriz.length || !this.proprietarios?.length || !this.imoveis?.length) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.</td></tr>';
            return;
        }

        // Cabeçalho: Imóvel | Proprietário1 | Proprietário2 | ... | Total | Ações
        let headHtml = '<tr><th>Imóvel</th>';
        for (const prop of this.proprietarios) {
            headHtml += `<th>${prop.nome}</th>`;
        }
        headHtml += '<th>Total</th><th width="120">Ações</th></tr>';
        tableHead.innerHTML = headHtml;

        // Corpo: para cada imóvel, uma linha
        let bodyHtml = '';
        for (const imovel of this.imoveis) {
            bodyHtml += `<tr><td>${imovel.nome}</td>`;
            let total = 0;
            for (const prop of this.proprietarios) {
                // Busca valor do aluguel para este imóvel/proprietário
                let valor = 0;
                for (const linha of this.matriz) {
                    if (linha.proprietario_id === prop.proprietario_id && linha.valores[imovel.nome] != null) {
                        valor = linha.valores[imovel.nome];
                        break;
                    }
                }
                total += valor;
                bodyHtml += `<td>${valor ? 'R$ ' + valor.toFixed(2) : '-'}</td>`;
            }
            bodyHtml += `<td><strong>R$ ${total.toFixed(2)}</strong></td>`;
            bodyHtml += `<td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning admin-only" title="Editar" onclick="window.alugueisModule.editAluguel('${imovel.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline-danger admin-only" title="Excluir" onclick="window.alugueisModule.deleteAluguel('${imovel.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td></tr>`;
        }
        tableBody.innerHTML = bodyHtml;

        // Actualizar visibilidad de botones admin-only después de renderizar
        if (window.uiManager && typeof window.uiManager.updateActionButtonsVisibility === 'function') {
            window.uiManager.updateActionButtonsVisibility();
        }
    }

    showAddModal() {
        this.uiManager.showInfo('Funcionalidade de adicionar aluguel em desenvolvimento.');
    }

    search() {
        // Implementar busca futuramente
    }
}

window.alugueisModule = new AlugueisModule();
