

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
                // Apenas o ano mais recente
                const anoMaisRecente = Math.max(...resp.data.anos);
                this.anosDisponiveis = [anoMaisRecente];
                this.anoSelecionado = anoMaisRecente;
                this.populateAnoDropdown();
                // Carregar automaticamente o mês mais recente
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
            // Usar ApiService para obter o último período
            let ultimoPeriodo = null;
            try {
                if (window.apiService) {
                    ultimoPeriodo = await window.apiService.get('/api/alugueis/ultimo-periodo/');
                }
            } catch (apiError) {
                console.warn('Erro ao usar ApiService:', apiError);
            }

            console.log('🔍 Último período obtido:', ultimoPeriodo);

            if (ultimoPeriodo?.success && ultimoPeriodo?.data?.ano && ultimoPeriodo?.data?.mes) {
                this.mesSelecionado = ultimoPeriodo.data.mes;
                console.log('🔍 Mês selecionado definido como:', this.mesSelecionado);
                this.populateMesDropdown();
                // Carregar matriz automaticamente com o mês mais recente do BD
                this.loadMatrizAlugueis(this.anoSelecionado, ultimoPeriodo.data.mes);
            } else {
                // Se não houver dados, selecionar "Todos os meses" por padrão
                console.warn('Sem dados de último período, usando todos os meses');
                this.mesSelecionado = 'todos';
                this.populateMesDropdown();
                this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
            }
        } catch (error) {
            console.warn('Erro ao carregar último período, usando todos os meses:', error);
            // Se houver erro, selecionar "Todos os meses" por padrão
            this.mesSelecionado = 'todos';
            this.populateMesDropdown();
            this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
        }
    } populateAnoDropdown() {
        const anoSelect = document.getElementById('alugueis-ano-select');
        if (!anoSelect) return;
        SecurityUtils.setSafeHTML(anoSelect, '<option value="">Selecione o ano</option>');
        this.anosDisponiveis.forEach(ano => {
            const option = SecurityUtils.createSafeElement('option', {
                value: ano,
                textContent: ano
            });
            anoSelect.appendChild(option);
        });
        anoSelect.disabled = this.anosDisponiveis.length === 0;

        // Selecionar automaticamente o ano mais recente
        if (this.anoSelecionado) {
            anoSelect.value = this.anoSelecionado;
        }

        // Resetar mês
        this.populateMesDropdown();
    }

    populateMesDropdown() {
        const mesSelect = document.getElementById('alugueis-mes-select');
        if (!mesSelect) return;
        SecurityUtils.setSafeHTML(mesSelect, '<option value="">Selecione o mês</option>');
        if (this.anosDisponiveis.length > 0) {
            // Opção para todos os meses
            const todosOption = SecurityUtils.createSafeElement('option', {
                value: 'todos',
                textContent: 'Todos os meses'
            });
            mesSelect.appendChild(todosOption);
            // Janeiro a Dezembro
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
                const monthOption = SecurityUtils.createSafeElement('option', {
                    value: m.num,
                    textContent: m.nome
                });
                mesSelect.appendChild(monthOption);
            });
            mesSelect.disabled = false;

            // Selecionar automaticamente o mês mais recente se estiver disponível
            if (this.mesSelecionado) {
                console.log('🔍 Selecionando mês:', this.mesSelecionado);
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
                // Usar ApiService para suma de todos los meses
                try {
                    console.log('🔍 Buscando soma de todos os meses para ano:', ano);
                    if (window.apiService) {
                        resp = await window.apiService.get(`/api/alugueis/distribuicao-todos-meses/?ano=${ano}`);
                        console.log('✅ Soma de todos os meses obtida via ApiService');
                    } else {
                        throw new Error('ApiService não disponível');
                    }
                } catch (apiError) {
                    console.warn('Erro ao usar ApiService para todos os meses, usando método padrão:', apiError);
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
        if (tableHead) SecurityUtils.setSafeHTML(tableHead, '');
        if (tableBody) SecurityUtils.setSafeHTML(tableBody, '<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.</td></tr>');
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
            SecurityUtils.setSafeHTML(tableHead, '');
            SecurityUtils.setSafeHTML(tableBody, '<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.</td></tr>');
            return;
        }

        // Cabeçalho: Imóvel | Proprietário1 | Proprietário2 | ... | Total (sem Ações)
        let headHtml = '<tr><th>Imóvel</th>';
        for (const prop of this.proprietarios) {
            headHtml += `<th>${prop.nome}</th>`;
        }
        headHtml += '<th>Total</th></tr>';
        SecurityUtils.setSafeHTML(tableHead, headHtml);

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
            bodyHtml += `<td><strong>R$ ${total.toFixed(2)}</strong></td></tr>`;
        }
        SecurityUtils.setSafeHTML(tableBody, bodyHtml);

        // Actualizar visibilidad de botones admin-only después de renderizar
        if (window.uiManager && typeof window.uiManager.updateActionButtonsVisibility === 'function') {
            window.uiManager.updateActionButtonsVisibility();
        }
    }
}

window.alugueisModule = new AlugueisModule();
