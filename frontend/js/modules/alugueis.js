

class AlugueisModule {
    constructor() {
        this.initialized = false;
        this.matriz = [];
        this.proprietarios = [];
        this.imoveis = [];
        this.anosDisponiveis = [];
        this.anoSelecionado = null;
        this.mesSelecionado = null;
        
        // Configurar servicios al inicializar
        this.setupServices();
    }

    setupServices() {
        // Configurar apiService
        this.apiService = window.apiService;
        if (!this.apiService) {
            console.warn('⚠️ ApiService não disponível durante inicialização do módulo aluguéis');
        }
        
        // Configurar uiManager
        this.uiManager = window.uiManager;
        if (!this.uiManager) {
            console.warn('⚠️ UiManager não disponível durante inicialização do módulo aluguéis');
        }
    }

    init() {
        if (this.initialized) {
            console.log('🏠 Módulo aluguéis já inicializado, pulando...');
            return;
        }
        
        console.log('🏠 Inicializando módulo Aluguéis...');
        console.log('🔍 ApiService disponível:', !!this.apiService);
        console.log('🔍 UiManager disponível:', !!this.uiManager);
        
        this.initialized = true;
        this.setupPeriodDropdowns();
        
        console.log('✅ Módulo aluguéis inicializado');
    }

    async load() {
        console.log('🏠 AlugueisModule.load() chamado');
        
        // Re-configurar servicios se necessário
        this.setupServices();
        
        if (!this.apiService) {
            console.error('❌ ApiService não disponível em AlugueisModule.load()');
            throw new Error('ApiService não disponível');
        }
        
        this.init();
        
        console.log('🔍 Iniciando loadAnosDisponiveis...');
        await this.loadAnosDisponiveis();
        console.log('✅ AlugueisModule.load() concluído');
    }

    async loadAnosDisponiveis() {
        try {
            console.log('🔍 Iniciando carga de anos disponíveis...');
            console.log('🔍 ApiService disponível:', !!this.apiService);
            
            const data = await this.apiService.getAnosDisponiveisAlugueis();
            console.log('🔍 Dados recebidos de anos:', data);
            
            if (data && data.anos && Array.isArray(data.anos) && data.anos.length) {
                // Garantir que todos os anos sejam números
                const anosNumericos = data.anos.map(ano => {
                    const num = typeof ano === 'number' ? ano : parseInt(ano);
                    return isNaN(num) ? null : num;
                }).filter(ano => ano !== null);
                
                console.log('🔍 Anos numéricos processados:', anosNumericos);
                
                if (anosNumericos.length > 0) {
                    // Usar todos os anos disponíveis (ordenados do mais recente ao mais antigo)
                    this.anosDisponiveis = anosNumericos.sort((a, b) => b - a);
                    this.anoSelecionado = this.anosDisponiveis[0]; // Ano mais recente
                    console.log('🔍 Anos disponíveis:', this.anosDisponiveis);
                    console.log('🔍 Ano selecionado por padrão:', this.anoSelecionado);
                    this.populateAnoDropdown();
                    // Carregar automaticamente o mês mais recente
                    await this.loadMesReciente();
                } else {
                    console.warn('⚠️ Nenhum ano numérico válido encontrado');
                    this.usarAnoAtual();
                }
            } else {
                console.warn('⚠️ Dados de anos inválidos ou vazios:', data);
                this.usarAnoAtual();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar anos:', error);
            this.usarAnoAtual();
        }
    }

    usarAnoAtual() {
        console.log('🔄 Usando ano atual como fallback');
        const anoAtual = new Date().getFullYear();
        this.anosDisponiveis = [anoAtual];
        this.anoSelecionado = anoAtual;
        this.populateAnoDropdown();
        this.populateMesDropdown();
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
    }

    populateAnoDropdown() {
        const anoSelect = document.getElementById('alugueis-ano-select');
        if (!anoSelect) {
            console.warn('⚠️ Elemento alugueis-ano-select não encontrado');
            return;
        }
        
        SecurityUtils.setSafeHTML(anoSelect, '<option value="">Selecione o ano</option>');
        this.anosDisponiveis.forEach(ano => {
            const option = SecurityUtils.createSafeElement('option', {
                value: ano.toString(),
                textContent: ano.toString()
            });
            anoSelect.appendChild(option);
        });
        anoSelect.disabled = this.anosDisponiveis.length === 0;

        // Selecionar automaticamente o ano mais recente
        if (this.anoSelecionado && this.anosDisponiveis.includes(this.anoSelecionado)) {
            anoSelect.value = this.anoSelecionado.toString();
        }

        // Resetar mês
        this.populateMesDropdown();
    }

    populateMesDropdown() {
        const mesSelect = document.getElementById('alugueis-mes-select');
        if (!mesSelect) {
            console.warn('⚠️ Elemento alugueis-mes-select não encontrado');
            return;
        }
        
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
                { num: 1, nome: 'Janeiro' }, { num: 2, nome: 'Fevereiro' }, { num: 3, nome: 'Março' },
                { num: 4, nome: 'Abril' }, { num: 5, nome: 'Maio' }, { num: 6, nome: 'Junho' },
                { num: 7, nome: 'Julho' }, { num: 8, nome: 'Agosto' }, { num: 9, nome: 'Setembro' },
                { num: 10, nome: 'Outubro' }, { num: 11, nome: 'Novembro' }, { num: 12, nome: 'Dezembro' }
            ];
            
            meses.forEach(m => {
                const monthOption = SecurityUtils.createSafeElement('option', {
                    value: m.num.toString(),
                    textContent: m.nome
                });
                mesSelect.appendChild(monthOption);
            });
            mesSelect.disabled = false;

            // Selecionar automaticamente o mês mais recente se estiver disponível
            if (this.mesSelecionado) {
                mesSelect.value = this.mesSelecionado.toString();
            }
        } else {
            mesSelect.disabled = true;
        }
    }

    setupPeriodDropdowns() {
        // Esperar a que el DOM esté listo
        const checkElements = () => {
            const anoSelect = document.getElementById('alugueis-ano-select');
            const mesSelect = document.getElementById('alugueis-mes-select');
            
            console.log('🔍 Verificando elementos:', { 
                anoSelect: !!anoSelect, 
                mesSelect: !!mesSelect 
            });
            
            if (!anoSelect || !mesSelect) {
                console.warn('⚠️ Elementos de dropdown não encontrados, tentando novamente...');
                setTimeout(checkElements, 100);
                return;
            }
            
            // Limpar event listeners anteriores (evitar duplicação)
            const newAnoSelect = anoSelect.cloneNode(true);
            const newMesSelect = mesSelect.cloneNode(true);
            anoSelect.parentNode.replaceChild(newAnoSelect, anoSelect);
            mesSelect.parentNode.replaceChild(newMesSelect, mesSelect);
            
            console.log('✅ Configurando event listeners dos dropdowns');
            
            newAnoSelect.addEventListener('change', (e) => {
                let ano = e.target.value;
                console.log('📅 Evento change ano - valor bruto:', ano, 'tipo:', typeof ano);
                
                // Limpiar y validar el valor
                if (ano === '' || ano === null || ano === undefined) {
                    this.anoSelecionado = null;
                } else {
                    // Si es un objeto serializado, extraer el valor numérico
                    if (typeof ano === 'string' && ano.includes('[object')) {
                        console.warn('⚠️ Valor ano corrompido, usando primeiro ano disponível');
                        ano = this.anosDisponiveis.length > 0 ? this.anosDisponiveis[0].toString() : '';
                    }
                    this.anoSelecionado = ano ? parseInt(ano) : null;
                }
                
                console.log('📅 this.anoSelecionado final:', this.anoSelecionado);
                
                // Habilita mês apenas se ano selecionado
                newMesSelect.disabled = !this.anoSelecionado;
                newMesSelect.value = '';
                this.mesSelecionado = null;
                
                if (this.anoSelecionado) {
                    // Carrega matriz apenas com ano (sem mês)
                    this.loadMatrizAlugueis(this.anoSelecionado, null);
                } else {
                    // Limpa matriz
                    this.clearMatriz();
                }
            });

            newMesSelect.addEventListener('change', (e) => {
                let mes = e.target.value;
                console.log('📅 Evento change mes - valor bruto:', mes, 'tipo:', typeof mes);
                
                // Limpiar y validar el valor
                if (mes === '' || mes === null || mes === undefined) {
                    this.mesSelecionado = null;
                } else {
                    // Si es un objeto serializado, usar 'todos' por defecto
                    if (typeof mes === 'string' && mes.includes('[object')) {
                        console.warn('⚠️ Valor mes corrompido, usando "todos"');
                        mes = 'todos';
                    }
                    this.mesSelecionado = mes;
                }
                
                console.log('📅 this.mesSelecionado final:', this.mesSelecionado);
                
                if (this.anoSelecionado) {
                    if (this.mesSelecionado === 'todos') {
                        // Mostrar suma de todos los meses del año
                        this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
                    } else if (this.mesSelecionado) {
                        // Mostrar matriz filtrada por mes específico
                        const mesNumerico = parseInt(this.mesSelecionado);
                        this.loadMatrizAlugueis(this.anoSelecionado, mesNumerico);
                    } else {
                        // Sin selección, mostrar todos los meses del año
                        this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
                    }
                } else {
                    this.clearMatriz();
                }
            });
        };
        
        checkElements();
    }

    async loadMatrizAlugueis(ano = null, mes = null) {
        try {
            console.log('🔍 loadMatrizAlugueis chamado com:', { ano, mes, tipoAno: typeof ano, tipoMes: typeof mes });
            
            // Garantir que ano seja um número válido
            let anoNumerico = null;
            if (ano !== null && ano !== undefined) {
                if (typeof ano === 'number') {
                    anoNumerico = ano;
                } else if (typeof ano === 'string') {
                    // Si es string pero contiene [object Object], extraer el año de this.anosDisponiveis
                    if (ano.includes('[object Object]') && this.anosDisponiveis.length > 0) {
                        anoNumerico = this.anosDisponiveis[0];
                        console.log('🔧 Corrigido ano de object para:', anoNumerico);
                    } else {
                        anoNumerico = parseInt(ano);
                    }
                } else {
                    // Si es un objeto o tipo desconocido, usar el primer año disponible
                    anoNumerico = this.anosDisponiveis.length > 0 ? this.anosDisponiveis[0] : null;
                    console.log('� Corrigido ano de object para:', anoNumerico);
                }
            }
            
            console.log('🔢 Ano final:', anoNumerico, 'tipo:', typeof anoNumerico);
            
            if (!anoNumerico || isNaN(anoNumerico)) {
                console.error('❌ Ano inválido:', ano, 'convertido para:', anoNumerico);
                this.uiManager.showError('Ano inválido para carregar dados.');
                return;
            }

            this.uiManager.showLoading('Carregando matriz de aluguéis...');

            // Verificar se apiService está disponível
            if (!this.apiService) {
                throw new Error('API Service não está disponível');
            }

            let resp;
            // Por ahora, usar siempre el endpoint que funciona para obtener datos del año
            try {
                console.log('🔍 Buscando dados para ano:', anoNumerico, 'mes:', mes);
                if (window.apiService) {
                    resp = await window.apiService.get(`/api/alugueis/distribuicao-todos-meses/?ano=${anoNumerico}`);
                    console.log('✅ Dados obtidos via ApiService');
                } else {
                    throw new Error('ApiService não disponível');
                }
            } catch (apiError) {
                console.warn('Erro ao usar ApiService:', apiError);
                this.uiManager.showError('Erro ao carregar dados de aluguéis: ' + apiError.message);
                this.clearMatriz();
                return;
            }

            this.uiManager.hideLoading();
            console.log('🔎 Dados recebidos do backend:', resp);
            if (!resp || !resp.data || !resp.data.matriz) {
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

// Registrar el módulo en el contexto global
window.alugueisModule = new AlugueisModule();
