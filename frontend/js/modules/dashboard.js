/**
 * Módulo Dashboard - Gestão do dashboard principal com dados agregados do backend.
 */
class DashboardModule {
    constructor() {
        this.charts = {};
        this.summaryData = {};
        this.initialized = false;
        // Adicionar referência ao uiManager e apiService
        this.uiManager = window.uiManager;
        this.apiService = window.apiService;
    }

    init() {
        if (this.initialized) return;

        window.addEventListener('navigate', (e) => {
            if (e.detail.view === 'dashboard') {
                this.isViewActive = true;
                if (!this.dataLoaded) {
                    this.load();
                } else {
                    this.createCharts();
                }
            } else {
                this.isViewActive = false;
                this.destroyAllCharts();
            }
        });

        this.initialized = true;
    }

    async handleApiCall(apiCall, loadingMessage, errorMessagePrefix) {
        try {
            this.uiManager.showLoading(loadingMessage);
            return await apiCall();
        } catch (error) {
            this.uiManager.showError(`${errorMessagePrefix}: ${error.message}`);
            console.error(errorMessagePrefix, error);
            return null;
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async load() {
        const summary = await this.handleApiCall(
            () => this.apiService.getDashboardSummary(),
            'Carregando dashboard...',
            'Erro ao carregar dados do dashboard'
        );

        if (summary) {
            this.dataLoaded = true;
            this.summaryData = summary;
            console.log('📊 Dados agregados do dashboard carregados:', this.summaryData);

            if (this.isViewActive) {
                this.updateStats();
                this.createCharts();
            }
        }
    }

    updateStats() {
        const { 
            total_proprietarios,
            total_imoveis,
            total_alugueis_ano_corrente,
            receitas_ultimo_mes
        } = this.summaryData;

        this.updateCounter('dashboard-total-proprietarios', total_proprietarios);
        this.updateCounter('dashboard-total-inmuebles', total_imoveis);
        this.updateCounter('dashboard-alugueis-ano-corrente', `R$ ${total_alugueis_ano_corrente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        this.updateCounter('dashboard-ingresos-mensuales', `R$ ${receitas_ultimo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }

    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    createCharts() {
        this.destroyAllCharts();
        this.createIncomeChart();
    }

    destroyAllCharts() {
        for (const chartKey in this.charts) {
            if (this.charts[chartKey]) {
                this.charts[chartKey].destroy();
                this.charts[chartKey] = null;
            }
        }
    }

    createIncomeChart() {
        if (!this.isViewActive) return;

        const canvas = document.getElementById('ingresosChart');
        if (!canvas) {
            console.error("Elemento canvas 'ingresosChart' não encontrado. O gráfico não será renderizado.");
            return;
        }
        this.renderIncomeChart(canvas);
    }

    renderIncomeChart(canvas) {
        const { income_chart_data } = this.summaryData;
        if (!income_chart_data || !income_chart_data.labels || !income_chart_data.values) {
            console.error("Dados para o gráfico de receitas estão incompletos.");
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error("Não foi possível obter o contexto 2D do canvas.");
            return;
        }

        this.charts.income = new Chart(ctx, {
            type: 'line',
            data: {
                labels: income_chart_data.labels,
                datasets: [{
                    label: 'Receitas (R$)',
                    data: income_chart_data.values,
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
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#36A2EB',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [5, 5] },
                        ticks: {
                            callback: value => `R$ ${value.toLocaleString('pt-BR')}`
                        }
                    }
                }
            }
        });
    }

    async refresh() {
        this.dataLoaded = false;
        await this.load();
    }
}

// Inicialização do módulo
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardModule = new DashboardModule();
    window.dashboardModule.init();
});

// Exportar classe globalmente para o app.js
window.DashboardModule = DashboardModule;
