/**
 * Módulo Dashboard - Gestión del dashboard principal
 * Muestra estadísticas, gráficos y resumen del sistema
 */

class DashboardModule {
    constructor() {
        this.charts = {};
        this.data = {};
        this.chartRetries = 0;
        this.maxRetries = 3;
    }

    /**
     * Cargar datos del dashboard
     */
    async load() {
        // Timeout de seguridad para evitar carga infinita
        const loadingTimeout = setTimeout(() => {
            window.uiManager?.hideLoading();
        }, 10000); // 10 segundos máximo

        try {
            window.uiManager?.showLoading('Cargando dashboard...');

            // Cargar datos en paralelo
            const results = await Promise.all([
                window.apiService.getProprietarios(),
                window.apiService.getImoveis(),
                window.apiService.getAlugueis()
            ]);

            // Extraer datos de las respuestas
            const propietarios = results[0]?.success ? results[0].data : [];
            const inmuebles = results[1]?.success ? results[1].data : [];
            const alquileres = results[2]?.success ? results[2].data : [];

            this.data = { propietarios, inmuebles, alquileres };

            // Actualizar estadísticas primero
            this.updateStats();

            // Esperar un poco para asegurar que el DOM esté listo
            await new Promise(resolve => setTimeout(resolve, 100));

            // Crear gráficos después de que los datos estén listos
            await this.createCharts();

        } catch (error) {
            // ...existing code...
            window.uiManager?.showAlert('Error cargando datos del dashboard: ' + error.message, 'error');
        } finally {
            clearTimeout(loadingTimeout);
            window.uiManager?.hideLoading();
        }
    }

    /**
     * Actualizar estadísticas del dashboard
     */
    updateStats() {
        const { propietarios = [], inmuebles = [], alquileres = [] } = this.data;

        // ...existing code...

        // Atualizar contadores
        this.updateCounter('dashboard-total-proprietarios', propietarios.length);
        this.updateCounter('dashboard-total-inmuebles', inmuebles.length);

        // Novo: valor financeiro total dos aluguéis do ano corrente
        const totalAlugueisAno = this.valorFinanceiroAlugueisAnoCorrente(alquileres);
        this.updateCounter('dashboard-alugueis-ano-corrente', `R$ ${totalAlugueisAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        // Calcular ingresos mensais
        const ingresos = this.calculateMonthlyIncome(alquileres);
        this.updateCounter('dashboard-ingresos-mensuales', `R$ ${ingresos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

        // ...existing code...
    }

    /**
     * Soma o valor financeiro total dos aluguéis do maior ano disponível nos dados
     */
    valorFinanceiroAlugueisAnoCorrente(alquileres) {
        if (!alquileres || alquileres.length === 0) return 0;
        // Encontrar o maior ano disponível
        let maxAno = Math.max(...alquileres.map(a => a.ano || 0));
        return alquileres
            .filter(a => a.ano === maxAno)
            .reduce((total, a) => total + (a.valor_liquido_proprietario || 0), 0);
    }

    /**
     * Actualizar contador individual
     */
    updateCounter(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Calcular ingresos do último mês disponível nos dados
     */
    calculateMonthlyIncome(alquileres) {
        if (!alquileres || alquileres.length === 0) return 0;
        // Encontrar o maior ano e mês disponível
        let maxAno = Math.max(...alquileres.map(a => a.ano || 0));
        let mesesDoAno = alquileres.filter(a => a.ano === maxAno).map(a => a.mes || 0);
        let maxMes = Math.max(...mesesDoAno);
        // Somar todos os valores desse mês/ano
        return alquileres.reduce((total, aluguel) => {
            if (aluguel.ano === maxAno && aluguel.mes === maxMes) {
                return total + (aluguel.valor_liquido_proprietario || 0);
            }
            return total;
        }, 0);
    }

    /**
     * Crear gráficos del dashboard
     */
    async createCharts() {
        try {
            // Checar se os canvas existem antes de criar os gráficos
            const incomeCanvas = document.getElementById('ingresosChart');
            const distributionCanvas = document.getElementById('distribucionChart');
            if (!incomeCanvas || !distributionCanvas) {
                // ...existing code...
                return;
            }
            // ...existing code...
            // Primeiro destruimos todos os gráficos existentes
            this.destroyAllCharts();
            // Depois criamos os novos
            this.createIncomeChart();
            this.createDistributionChart();
            // ...existing code...
            this.chartRetries = 0; // Reset contador
        } catch (error) {
            // ...existing code...
            // No lanzar el error para no bloquear el resto del dashboard
        }
    }

    /**
     * Destruir todos los gráficos existentes
     */
    destroyAllCharts() {
        try {
            if (this.charts.income) {
                this.charts.income.destroy();
                this.charts.income = null;
            }

            if (this.charts.distribution) {
                this.charts.distribution.destroy();
                this.charts.distribution = null;
            }
            // ...existing code...
        } catch (error) {
            // ...existing code...
        }
    }    /**
     * Crear gráfico de ingresos
     */
    createIncomeChart() {
        let canvas = document.getElementById('ingresosChart');
        if (!canvas) {
            // ...existing code...
            return;
        }

        try {
            // Destruir gráfico previo si existe
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
                // ...existing code...
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                // ...existing code...
                return;
            }

            // ...existing code...

            this.charts.income = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Ingresos ($)',
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
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            // ...existing code...
            // ...existing code...
        }
    }

    /**
     * Crear gráfico de distribución
     */
    createDistributionChart() {
        let canvas = document.getElementById('distribucionChart');
        if (!canvas) {
            console.warn('❌ Canvas distribucionChart no encontrado');
            return;
        }

        try {
            // Destruir gráfico previo si existe
            if (this.charts.distribution) {
                this.charts.distribution.destroy();
                this.charts.distribution = null;
            }
            // Remover e recriar o canvas para garantir que Chart.js não reutilize instâncias antigas
            const parent = canvas.parentNode;
            parent.removeChild(canvas);
            canvas = document.createElement('canvas');
            canvas.id = 'distribucionChart';
            parent.appendChild(canvas);

            const chartData = this.processDistributionData();
            if (!chartData || !chartData.labels || !chartData.values) {
                console.warn('❌ Datos del gráfico de distribución inválidos');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.warn('❌ No se pudo obtener contexto 2D del canvas de distribución');
                return;
            }

            console.log('📊 Creando gráfico de distribución con datos:', chartData);

            this.charts.distribution = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        data: chartData.values,
                        backgroundColor: window.AppConfig?.charts?.colors || [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                        ],
                        borderWidth: 0,
                        hoverBorderWidth: 2,
                        hoverBorderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white'
                        }
                    },
                    cutout: '60%'
                }
            });

        } catch (error) {
            console.error('❌ Error creando gráfico de distribución:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Procesar datos para gráfico de ingresos
     */
    processIncomeData() {
        const { alquileres = [] } = this.data;
        if (!alquileres.length) {
            return { labels: [], values: [] };
        }
        // Agrupar receitas por ano-mês
        const monthlyIncome = {};
        alquileres.forEach(aluguel => {
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
     * Procesar datos para gráfico de distribución por tipo de inmueble
     */
    processDistributionData() {
        const { inmuebles = [] } = this.data;
        const typeCount = {};

        inmuebles.forEach(inmueble => {
            // Extraer tipo del nombre del inmueble (Apartamento, Casa, Comercial, etc.)
            let tipo = 'Sin clasificar';
            if (inmueble.nombre) {
                if (inmueble.nombre.toLowerCase().includes('apartamento')) {
                    tipo = 'Apartamento';
                } else if (inmueble.nombre.toLowerCase().includes('casa')) {
                    tipo = 'Casa';
                } else if (inmueble.nombre.toLowerCase().includes('comercial')) {
                    tipo = 'Comercial';
                } else if (inmueble.nombre.toLowerCase().includes('studio')) {
                    tipo = 'Studio';
                } else {
                    tipo = 'Otro';
                }
            }
            typeCount[tipo] = (typeCount[tipo] || 0) + 1;
        });

        return {
            labels: Object.keys(typeCount),
            values: Object.values(typeCount)
        };
    }

    /**
     * Refrescar el dashboard
     */
    async refresh() {
        await this.load();
    }
}

// Exponer globalmente
window.DashboardModule = DashboardModule;

// Crear instancia global solo si no existe
if (!window.dashboardModule) {
    window.dashboardModule = new DashboardModule();
}
