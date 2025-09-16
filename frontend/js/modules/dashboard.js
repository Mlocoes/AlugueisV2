console.log('📦 dashboard.js cargado');
/**
 * Módulo Dashboard - Gestão do dashboard principal
 * Exibe estatísticas, gráficos e resumo do sistema
 */

class DashboardModule {
    // Log de definición de clase
    static logDefinition() {
        console.log('✅ DashboardModule definido en window');
    }
    constructor() {
        this.charts = {};
        this.data = {};
    }

    /**
     * Carregar dados do dashboard
     */
    async load() {
        // Timeout de segurança para evitar carregamento infinito
        const loadingTimeout = setTimeout(() => {
            window.uiManager?.hideLoading();
        }, 10000); // 10 segundos no máximo

        try {
            window.uiManager?.showLoading('Carregando dashboard...');

            // Carregar dados em paralelo
            const [propietarios, imoveis, alugueis] = await Promise.all([
                window.apiService.getProprietarios(),
                window.apiService.getImoveis(),
                window.apiService.getAlugueis()
            ]);

            // Los métodos del apiService ya devuelven los datos directamente
            this.data = { 
                propietarios: propietarios || [], 
                imoveis: imoveis || [], 
                alugueis: alugueis || [] 
            };

            console.log('📊 Dados carregados no dashboard:', {
                propietarios: this.data.propietarios.length,
                imoveis: this.data.imoveis.length,
                alugueis: this.data.alugueis.length
            });

            // Atualizar estatísticas primeiro
            this.updateStats();

            // Esperar um pouco para garantir que o DOM esteja pronto
            await new Promise(resolve => setTimeout(resolve, 100));

            // Criar gráficos depois que os dados estiverem prontos
            await this.createCharts();

        } catch (error) {
            // ...código existente...
            window.uiManager?.showAlert('Erro ao carregar dados do dashboard: ' + error.message, 'error');
        } finally {
            clearTimeout(loadingTimeout);
            window.uiManager?.hideLoading();
        }
    }

    /**
     * Atualizar estatísticas do dashboard
     */
    updateStats() {
        const { propietarios = [], imoveis = [], alugueis = [] } = this.data;

        // ...código existente...

        // Atualizar contadores
        this.updateCounter('dashboard-total-proprietarios', propietarios.length);
        this.updateCounter('dashboard-total-inmuebles', imoveis.length);

        // Novo: valor financeiro total dos aluguéis do ano corrente
        const totalAlugueisAno = this.valorFinanceiroAlugueisAnoCorrente(alugueis);
        this.updateCounter('dashboard-alugueis-ano-corrente', `R$ ${totalAlugueisAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        // Calcular receitas mensais
        const receitas = this.calculateMonthlyIncome(alugueis);
        this.updateCounter('dashboard-ingresos-mensuales', `R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        // ...código existente...
    }

    /**
     * Soma o valor financeiro total dos aluguéis do maior ano disponível nos dados
     */
    valorFinanceiroAlugueisAnoCorrente(alugueis) {
        if (!alugueis || alugueis.length === 0) return 0;
        // Encontrar o maior ano disponível
        let maxAno = Math.max(...alugueis.map(a => a.ano || 0));
        return alugueis
            .filter(a => a.ano === maxAno)
            .reduce((total, a) => total + (a.valor_liquido_proprietario || 0), 0);
    }

    /**
     * Atualizar contador individual
     */
    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Calcular receitas do último mês disponível nos dados
     */
    calculateMonthlyIncome(alugueis) {
        if (!alugueis || alugueis.length === 0) return 0;
        // Encontrar o maior ano e mês disponível
        let maxAno = Math.max(...alugueis.map(a => a.ano || 0));
        let mesesDoAno = alugueis.filter(a => a.ano === maxAno).map(a => a.mes || 0);
        let maxMes = Math.max(...mesesDoAno);
        // Somar todos os valores desse mês/ano
        return alugueis.reduce((total, aluguel) => {
            if (aluguel.ano === maxAno && aluguel.mes === maxMes) {
                return total + (aluguel.valor_liquido_proprietario || 0);
            }
            return total;
        }, 0);
    }

    /**
     * Criar gráficos do dashboard
     */
    async createCharts() {
        try {
            // Verificar se os canvas existem antes de criar os gráficos
            const incomeCanvas = document.getElementById('ingresosChart');
            if (!incomeCanvas) {
                // ...código existente...
                return;
            }
            // ...código existente...
            // Primeiro destruímos todos os gráficos existentes
            this.destroyAllCharts();
            // Depois criamos os novos
            this.createIncomeChart();
            //this.createDistributionChart();
            // ...código existente...
        } catch (error) {
            // ...código existente...
            // Não lançar o erro para não bloquear o resto do dashboard
        }
    }

    /**
     * Destruir todos os gráficos existentes
     */
    destroyAllCharts() {
        try {
            if (this.charts.income) {
                this.charts.income.destroy();
                this.charts.income = null;
            }

            // ...código existente...
        } catch (error) {
            // ...código existente...
        }
    }    /**
     * Criar gráfico de receitas
     */
    createIncomeChart() {
        let canvas = document.getElementById('ingresosChart');
        if (!canvas) {
            // ...código existente...
            return;
        }

        try {
            // Destruir gráfico anterior se existir
            if (this.charts.income) {
                this.charts.income.destroy();
                this.charts.income = null;
            }
            // Remover e recriar o canvas para garantir que Chart.js não reutilize instâncias antigas
            const parent = canvas.parentNode;
            parent.removeChild(canvas);
            canvas = document.createElement('canvas');
            canvas.id = 'ingresosChart';
            parent.appendChild(canvas);

            const chartData = this.processIncomeData();
            if (!chartData || !chartData.labels || !chartData.values) {
                // ...código existente...
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                // ...código existente...
                return;
            }

            // ...código existente...

            this.charts.income = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Receitas (R$)',
                        data: chartData.values,
                        borderColor: '#36A2EB',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#36A2EB',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: '#36A2EB',
                            borderWidth: 1
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                borderDash: [5, 5]
                            },
                            ticks: {
                                callback: function (value) {
                                    return 'R$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            // ...código existente...
            // ...código existente...
        }
    }

    /**
     * Criar gráfico de distribuição
     */

    /**
     * Processar dados para gráfico de receitas
     */
    processIncomeData() {
        const { alugueis = [] } = this.data;
        if (!alugueis.length) {
            return { labels: [], values: [] };
        }
        // Agrupar receitas por ano-mês
        const monthlyIncome = {};
        alugueis.forEach(aluguel => {
            if (aluguel.valor_liquido_proprietario && aluguel.mes && aluguel.ano) {
                const monthKey = `${aluguel.ano}-${aluguel.mes.toString().padStart(2, '0')}`;
                if (!monthlyIncome[monthKey]) monthlyIncome[monthKey] = 0;
                monthlyIncome[monthKey] += aluguel.valor_liquido_proprietario;
            }
        });
        // Ordenar as chaves ano-mês
        const sortedKeys = Object.keys(monthlyIncome).sort((a, b) => {
            const [aAno, aMes] = a.split('-').map(Number);
            const [bAno, bMes] = b.split('-').map(Number);
            return aAno !== bAno ? aAno - bAno : aMes - bMes;
        });
        return {
            labels: sortedKeys.map(key => {
                const [year, month] = key.split('-');
                const date = new Date(year, month - 1);
                return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
            }),
            values: sortedKeys.map(key => monthlyIncome[key])
        };
    }


    /**
     * Atualizar o dashboard
     */
    async refresh() {
        await this.load();
    }
}

// Expor globalmente
window.DashboardModule = DashboardModule;
DashboardModule.logDefinition();

// Criar instância global apenas se não existir
// window.dashboardModule solo se inicializa tras login exitoso
