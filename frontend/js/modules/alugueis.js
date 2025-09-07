

class AlugueisModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.matriz = [];
        this.matrizCompleta = []; // Para armazenar dados completos do backend
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
        console.log('🚀 AlugueisModule.load() iniciado');
        
        // Aguardar que os elementos DOM estejam disponíveis
        await this.waitForDOMElements();
        
        this.init();
        await this.loadAnosDisponiveis();
        
        console.log('✅ AlugueisModule.load() concluído');
    }

    async waitForDOMElements() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            const checkElements = () => {
                const anoSelect = document.getElementById('alugueis-ano-select');
                const mesSelect = document.getElementById('alugueis-mes-select');
                
                console.log(`🔍 Tentativa ${attempts + 1}: Verificando elementos DOM:`, { 
                    anoSelect: !!anoSelect, 
                    mesSelect: !!mesSelect 
                });
                
                if (anoSelect && mesSelect) {
                    console.log('✅ Elementos DOM encontrados!');
                    resolve();
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkElements, 100);
                } else {
                    console.warn('⚠️ Timeout aguardando elementos DOM, continuando...');
                    resolve();
                }
            };
            
            checkElements();
        });
    }

    async loadAnosDisponiveis() {
        try {
            console.log('🔍 Iniciando loadAnosDisponiveis...');
            console.log('🔍 ApiService disponível:', !!this.apiService);
            
            const resp = await this.apiService.getAnosDisponiveisAlugueis();
            console.log('🔍 Resposta da API:', resp);
            
            // O apiService já retorna os dados diretamente, não o wrapper completo
            if (resp && resp.anos && Array.isArray(resp.anos) && resp.anos.length > 0) {
                // Usar todos os anos disponíveis (ordenados do mais recente ao mais antigo)
                const anosNumericos = resp.anos
                    .map(ano => parseInt(ano))
                    .filter(ano => !isNaN(ano))
                    .sort((a, b) => b - a);
                
                console.log('🔍 Anos processados:', anosNumericos);
                
                this.anosDisponiveis = anosNumericos;
                this.anoSelecionado = anosNumericos[0]; // Ano mais recente
                
                console.log('🔍 Ano selecionado:', this.anoSelecionado);
                
                this.populateAnoDropdown();
                
                // Carregar automaticamente o mês mais recente
                await this.loadMesReciente();
            } else {
                console.warn('⚠️ Dados inválidos ou vazios da API:', resp);
                this.anosDisponiveis = [];
                this.usarAnoAtual();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar anos:', error);
            this.anosDisponiveis = [];
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
                // Carregar dados do mês específico detectado
                console.log('🔧 Carregando mês específico:', this.mesSelecionado);
                this.loadMatrizAlugueis(this.anoSelecionado, this.mesSelecionado);
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
        console.log('🔧 Populando dropdown de anos...');
        const anoSelect = document.getElementById('alugueis-ano-select');
        if (!anoSelect) {
            console.error('❌ Elemento alugueis-ano-select não encontrado!');
            return;
        }
        
        console.log('🔧 Anos disponíveis:', this.anosDisponiveis);
        
        // Limpar e popular manualmente para evitar problemas com SecurityUtils
        anoSelect.innerHTML = '<option value="">Selecione o ano</option>';
        
        this.anosDisponiveis.forEach(ano => {
            const option = document.createElement('option');
            option.value = String(ano); // Garantir que é string
            option.textContent = String(ano);
            anoSelect.appendChild(option);
        });
        
        anoSelect.disabled = this.anosDisponiveis.length === 0;

        // Selecionar automaticamente o ano mais recente
        if (this.anoSelecionado) {
            anoSelect.value = String(this.anoSelecionado);
            console.log('✅ Ano selecionado no dropdown:', this.anoSelecionado);
        }

        // Resetar mês
        this.populateMesDropdown();
    }

    populateMesDropdown() {
        console.log('🔧 Populando dropdown de meses...');
        const mesSelect = document.getElementById('alugueis-mes-select');
        if (!mesSelect) {
            console.error('❌ Elemento alugueis-mes-select não encontrado!');
            return;
        }
        
        // Limpar e popular manualmente
        mesSelect.innerHTML = '<option value="">Selecione o mês</option>';
        
        if (this.anosDisponiveis.length > 0) {
            console.log('🔧 Adicionando opções de mês...');
            
            // Opção para todos los meses
            const todosOption = document.createElement('option');
            todosOption.value = 'todos';
            todosOption.textContent = 'Todos os meses';
            mesSelect.appendChild(todosOption);
            
            // Janeiro a Dezembro
            const meses = [
                { num: 1, nome: 'Janeiro' }, { num: 2, nome: 'Fevereiro' }, { num: 3, nome: 'Março' },
                { num: 4, nome: 'Abril' }, { num: 5, nome: 'Maio' }, { num: 6, nome: 'Junho' },
                { num: 7, nome: 'Julho' }, { num: 8, nome: 'Agosto' }, { num: 9, nome: 'Setembro' },
                { num: 10, nome: 'Outubro' }, { num: 11, nome: 'Novembro' }, { num: 12, nome: 'Dezembro' }
            ];
            
            meses.forEach(m => {
                const monthOption = document.createElement('option');
                monthOption.value = String(m.num); // Garantir que é string
                monthOption.textContent = m.nome;
                mesSelect.appendChild(monthOption);
            });
            
            mesSelect.disabled = false;

            // Selecionar automaticamente o mês mais recente se estiver disponível
            if (this.mesSelecionado) {
                mesSelect.value = String(this.mesSelecionado);
                console.log('✅ Mês selecionado no dropdown:', this.mesSelecionado);
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
                let ano = e.target.value;
                console.log('📅 Evento change ano - valor bruto:', ano, 'tipo:', typeof ano);
                
                // Limpiar y validar el valor
                if (ano === '' || ano === null || ano === undefined) {
                    this.anoSelecionado = null;
                } else {
                    // Si es un objeto serializado, usar primer año disponible
                    if (typeof ano === 'string' && ano.includes('[object')) {
                        console.warn('⚠️ Valor ano corrompido, usando primeiro ano disponível');
                        ano = this.anosDisponiveis.length > 0 ? this.anosDisponiveis[0].toString() : '';
                    }
                    this.anoSelecionado = ano ? parseInt(ano) : null;
                }
                
                console.log('📅 this.anoSelecionado final:', this.anoSelecionado);
                
                // Habilita mês apenas se ano selecionado
                if (mesSelect) {
                    mesSelect.disabled = !this.anoSelecionado;
                    mesSelect.value = '';
                }
                this.mesSelecionado = null;
                
                if (this.anoSelecionado) {
                    // Carrega matriz apenas com ano (sem mês)
                    this.loadMatrizAlugueis(this.anoSelecionado, null);
                } else {
                    // Limpa matriz
                    this.clearMatriz();
                }
            });
        }
        
        if (mesSelect) {
            mesSelect.addEventListener('change', (e) => {
                let mes = e.target.value;
                console.log('📅 Evento change mes - valor bruto:', mes, 'tipo:', typeof mes);
                console.log('📅 Ano selecionado atual:', this.anoSelecionado);
                
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
                        console.log('🔄 Carregando TODOS os meses para ano:', this.anoSelecionado);
                        this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
                    } else if (this.mesSelecionado) {
                        // Mostrar matriz filtrada por mes específico
                        const mesNumerico = parseInt(this.mesSelecionado);
                        console.log('🔄 Carregando mês ESPECÍFICO:', mesNumerico, 'para ano:', this.anoSelecionado);
                        this.loadMatrizAlugueis(this.anoSelecionado, mesNumerico);
                    } else {
                        // Sin selección, mostrar todos los meses del año
                        console.log('🔄 Sem seleção, carregando TODOS os meses');
                        this.loadMatrizAlugueis(this.anoSelecionado, 'todos');
                    }
                } else {
                    console.log('❌ Ano não selecionado, limpando matriz');
                    this.clearMatriz();
                }
            });
        }
    }

    async loadMatrizAlugueis(ano = null, mes = null) {
        try {
            console.log('🔍 loadMatrizAlugueis chamado com:', { ano, mes, tipoAno: typeof ano, tipoMes: typeof mes });
            
            // Sanitizar e validar parâmetros
            let anoLimpo = null;
            let mesLimpo = null;
            
            // Limpiar año
            if (ano !== null && ano !== undefined && ano !== '') {
                if (typeof ano === 'number') {
                    anoLimpo = ano;
                } else if (typeof ano === 'string') {
                    // Si es string pero válido
                    if (!ano.includes('[object') && !isNaN(parseInt(ano))) {
                        anoLimpo = parseInt(ano);
                    }
                }
            }
            
            // Limpiar mes
            if (mes !== null && mes !== undefined && mes !== '') {
                if (typeof mes === 'string' && !mes.includes('[object')) {
                    if (mes === 'todos') {
                        mesLimpo = 'todos';
                    } else if (!isNaN(parseInt(mes))) {
                        mesLimpo = parseInt(mes);
                    }
                } else if (typeof mes === 'number') {
                    mesLimpo = mes;
                }
            }
            
            console.log('🔧 Parâmetros limpos:', { anoLimpo, mesLimpo });
            
            if (!anoLimpo || isNaN(anoLimpo)) {
                console.error('❌ Ano inválido:', ano, 'sanitizado:', anoLimpo);
                this.uiManager.showError('Ano inválido para carregar dados.');
                return;
            }

            this.uiManager.showLoading('Carregando matriz de aluguéis...');

            // Verificar se apiService está disponível
            if (!this.apiService) {
                throw new Error('API Service não está disponível');
            }

            let resp;
            
            try {
                console.log('🔍 Buscando dados para ano:', anoLimpo, 'mês solicitado:', mesLimpo);
                
                if (mesLimpo === 'todos' || mesLimpo === null) {
                    // Usar endpoint para todos os meses do ano
                    console.log('🔧 Usando endpoint: distribuicao-todos-meses');
                    console.log('🌐 URL completa:', `/api/alugueis/distribuicao-todos-meses/?ano=${anoLimpo}`);
                    if (window.apiService) {
                        resp = await window.apiService.get(`/api/alugueis/distribuicao-todos-meses/?ano=${anoLimpo}`);
                        console.log('✅ Dados de todos os meses obtidos via ApiService');
                    } else {
                        throw new Error('ApiService não disponível');
                    }
                } else {
                    // Usar endpoint para mês específico
                    console.log(`🔧 Usando endpoint: distribuicao-matriz para mês ${mesLimpo}`);
                    console.log('🌐 URL completa:', `/api/alugueis/distribuicao-matriz/?ano=${anoLimpo}&mes=${mesLimpo}`);
                    if (window.apiService) {
                        resp = await window.apiService.get(`/api/alugueis/distribuicao-matriz/?ano=${anoLimpo}&mes=${mesLimpo}`);
                        console.log(`✅ Dados do mês ${mesLimpo} obtidos via ApiService`);
                    } else {
                        throw new Error('ApiService não disponível');
                    }
                }
            } catch (apiError) {
                console.error('❌ Erro ao carregar dados de aluguéis:', apiError);
                this.uiManager.showError('Erro ao carregar dados de aluguéis: ' + apiError.message);
                this.clearMatriz();
                return;
            }

            this.uiManager.hideLoading();
            console.log('🔎 Dados recebidos do backend:', resp.data);
            
            if (!resp.success || !resp.data || !resp.data.matriz) {
                this.uiManager.showError('Erro ao carregar matriz de aluguéis.');
                this.clearMatriz();
                return;
            }

            // Armazenar dados recebidos
            this.matrizCompleta = resp.data.matriz;
            this.matriz = resp.data.matriz; // Dados já filtrados pelo backend
            this.proprietarios = resp.data.proprietarios;
            this.imoveis = resp.data.imoveis;
            
            // Exibir a matriz diretamente (dados já filtrados pelo backend)
            this.renderMatriz();
            
        } catch (error) {
            this.uiManager.showError('Erro ao carregar matriz de aluguéis: ' + error.message);
            this.uiManager.hideLoading();
            this.clearMatriz();
        }
    }

    aplicarFiltroMes(mes) {
        console.log('🔧 Aplicando filtro por mês:', mes);
        
        if (!this.matrizCompleta || !Array.isArray(this.matrizCompleta)) {
            console.warn('⚠️ Matriz completa não disponível para filtrar');
            this.matriz = [];
            this.renderMatriz();
            return;
        }
        
        if (mes === 'todos' || mes === null || mes === undefined) {
            // Somar todos os meses disponíveis do ano
            console.log('📊 Somando todos os meses disponíveis do ano');
            this.matriz = this.somarTodosMesesDisponiveis(this.matrizCompleta);
        } else {
            // Filtrar por mês específico
            console.log('📊 Filtrando dados para mês:', mes);
            this.matriz = this.filtrarMatrizPorMes(this.matrizCompleta, mes);
        }
        
        this.renderMatriz();
    }

    filtrarMatrizPorMes(matrizCompleta, mesDesejado) {
        console.log('🔍 Filtrando matriz por mês:', mesDesejado);
        
        return matrizCompleta.map(entrada => {
            // Criar uma cópia da entrada
            const entradaFiltrada = { ...entrada };
            
            // Se a entrada tem dados por mês (estrutura tipo: {valores: {Jan: 100, Feb: 200, ...}})
            if (entrada.valores && typeof entrada.valores === 'object') {
                const valoresFiltrados = {};
                
                // Mapear número do mês para nomes possíveis
                const nomesMesesPossiveis = [
                    `mes_${mesDesejado}`,                    // mes_1, mes_2, etc.
                    `${mesDesejado.toString().padStart(2, '0')}`,  // 01, 02, etc.
                    mesDesejado.toString(),                   // 1, 2, etc.
                    // Nomes em português
                    { 1: 'janeiro', 2: 'fevereiro', 3: 'marco', 4: 'abril', 5: 'maio', 6: 'junho',
                      7: 'julho', 8: 'agosto', 9: 'setembro', 10: 'outubro', 11: 'novembro', 12: 'dezembro' }[mesDesejado],
                    // Nomes em inglês (comuns em APIs)
                    { 1: 'jan', 2: 'feb', 3: 'mar', 4: 'apr', 5: 'may', 6: 'jun',
                      7: 'jul', 8: 'aug', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dec' }[mesDesejado]
                ];
                
                // Para cada imóvel, buscar o valor do mês específico
                for (const [imovel, valores] of Object.entries(entrada.valores)) {
                    let valorEncontrado = 0;
                    
                    if (typeof valores === 'object' && valores !== null) {
                        // Buscar o valor usando diferentes formatos de chave
                        for (const possibleKey of nomesMesesPossiveis) {
                            if (possibleKey && valores[possibleKey] !== undefined) {
                                valorEncontrado = Number(valores[possibleKey]) || 0;
                                break;
                            }
                        }
                    }
                    
                    valoresFiltrados[imovel] = valorEncontrado;
                }
                
                entradaFiltrada.valores = valoresFiltrados;
            } else {
                // Se não tem estrutura por mês, mostrar zero (não há dados específicos)
                console.log('📝 Sem dados específicos por mês, mostrando zeros');
                
                for (const key in entradaFiltrada) {
                    if (typeof entradaFiltrada[key] === 'number' && key !== 'proprietario_id') {
                        entradaFiltrada[key] = 0;
                    }
                }
                
                // Se há campo valores, zerar todos
                if (entradaFiltrada.valores && typeof entradaFiltrada.valores === 'object') {
                    for (const imovel in entradaFiltrada.valores) {
                        entradaFiltrada.valores[imovel] = 0;
                    }
                }
            }
            
            return entradaFiltrada;
        });
    }

    somarTodosMesesDisponiveis(matrizCompleta) {
        console.log('🔍 Somando todos os meses disponíveis na matriz');
        
        return matrizCompleta.map(entrada => {
            // Criar uma cópia da entrada
            const entradaSomada = { ...entrada };
            
            // Se a entrada tem dados por mês
            if (entrada.valores && typeof entrada.valores === 'object') {
                const valoresSomados = {};
                
                // Para cada imóvel, somar todos os meses disponíveis
                for (const [imovel, valores] of Object.entries(entrada.valores)) {
                    let somaTotal = 0;
                    
                    if (typeof valores === 'object' && valores !== null) {
                        // Somar todos os valores numéricos encontrados (assumindo que são meses)
                        for (const [chave, valor] of Object.entries(valores)) {
                            const valorNumerico = Number(valor);
                            if (!isNaN(valorNumerico)) {
                                somaTotal += valorNumerico;
                                console.log(`💰 ${imovel} - ${chave}: ${valorNumerico}`);
                            }
                        }
                    } else if (typeof valores === 'number') {
                        // Se já é um valor numérico, usar diretamente
                        somaTotal = valores;
                    }
                    
                    valoresSomados[imovel] = somaTotal;
                }
                
                entradaSomada.valores = valoresSomados;
            } else {
                // Se não tem estrutura por mês, manter valores originais
                console.log('📝 Mantendo valores originais (sem estrutura por mês)');
            }
            
            return entradaSomada;
        });
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
        console.log('🎨 Renderizando matriz com filtro aplicado...');
        
        // Usar IDs e estrutura igual à de participações
        const tableHead = document.getElementById('alugueis-matrix-head');
        const tableBody = document.getElementById('alugueis-matrix-body');
        const tableContainer = document.getElementById('alugueis-table-container');
        
        if (tableContainer) tableContainer.style.display = 'block';
        if (!tableHead || !tableBody) {
            console.error('❌ Elementos da tabela não encontrados');
            return;
        }

        if (!this.matriz?.length || !this.proprietarios?.length || !this.imoveis?.length) {
            SecurityUtils.setSafeHTML(tableHead, '');
            SecurityUtils.setSafeHTML(tableBody, '<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.</td></tr>');
            return;
        }

        // Determinar título baseado no filtro
        let tituloFiltro = '';
        if (this.mesSelecionado && this.mesSelecionado !== 'todos') {
            const nomesMeses = {
                1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril', 5: 'Maio', 6: 'Junho',
                7: 'Julho', 8: 'Agosto', 9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
            };
            tituloFiltro = ` - ${nomesMeses[this.mesSelecionado]} ${this.anoSelecionado}`;
        } else {
            tituloFiltro = ` - Ano ${this.anoSelecionado} (Soma Anual)`;
        }

        // Cabeçalho: Imóvel | Proprietário1 | Proprietário2 | ... | Total
        let headHtml = `<tr><th>Imóvel${tituloFiltro}</th>`;
        for (const prop of this.proprietarios) {
            headHtml += `<th>${prop.nome}</th>`;
        }
        headHtml += '<th>Total</th></tr>';
        SecurityUtils.setSafeHTML(tableHead, headHtml);

        // Corpo: para cada imóvel, uma linha
        let bodyHtml = '';
        for (const imovel of this.imoveis) {
            bodyHtml += `<tr><td><strong>${imovel.nome}</strong></td>`;
            let total = 0;
            
            for (const prop of this.proprietarios) {
                // Busca valor do aluguel para este imóvel/proprietário
                let valor = 0;
                for (const linha of this.matriz) {
                    if (linha.proprietario_id === prop.proprietario_id) {
                        if (linha.valores && linha.valores[imovel.nome] != null) {
                            valor = linha.valores[imovel.nome];
                        }
                        break;
                    }
                }
                total += valor;
                
                // Formatação com indicação se é valor filtrado
                const valorFormatado = valor ? `R$ ${valor.toFixed(2)}` : '-';
                bodyHtml += `<td class="text-end">${valorFormatado}</td>`;
            }
            
            bodyHtml += `<td class="text-end"><strong>R$ ${total.toFixed(2)}</strong></td></tr>`;
        }
        
        // Adicionar linha de totais por proprietário
        bodyHtml += '<tr class="table-secondary"><td><strong>Total por Proprietário</strong></td>';
        let granTotal = 0;
        
        for (const prop of this.proprietarios) {
            let totalProp = 0;
            for (const linha of this.matriz) {
                if (linha.proprietario_id === prop.proprietario_id && linha.valores) {
                    for (const valor of Object.values(linha.valores)) {
                        if (typeof valor === 'number') {
                            totalProp += valor;
                        }
                    }
                }
            }
            granTotal += totalProp;
            bodyHtml += `<td class="text-end"><strong>R$ ${totalProp.toFixed(2)}</strong></td>`;
        }
        
        bodyHtml += `<td class="text-end"><strong style="color: #0d6efd;">R$ ${granTotal.toFixed(2)}</strong></td></tr>`;
        
        SecurityUtils.setSafeHTML(tableBody, bodyHtml);

        // Actualizar visibilidad de botones admin-only después de renderizar
        if (window.uiManager && typeof window.uiManager.updateActionButtonsVisibility === 'function') {
            window.uiManager.updateActionButtonsVisibility();
        }
        
        console.log('✅ Matriz renderizada com sucesso');
    }
}

window.alugueisModule = new AlugueisModule();
