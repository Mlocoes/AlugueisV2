// Módulo de Relatórios
class RelatoriosManager {
    constructor() {
        this.currentData = [];
        this.filteredData = [];
        this.apiService = null;
        this.init();
    }

    init() {
        console.log('RelatoriosManager initialized');
        
        // Esperar a que ApiService esteja disponível
        this.waitForApiService().then(() => {
            this.setupEventListeners();
            // No cargar datos iniciales automáticamente
            // Solo cargarán cuando se active la pestaña de relatórios
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
        // Evento para filtrar por ano
        document.getElementById('relatorios-ano-select')?.addEventListener('change', () => {
            this.filterData();
        });

        // Evento para filtrar por mês
        document.getElementById('relatorios-mes-select')?.addEventListener('change', () => {
            this.filterData();
        });

        // Evento para filtrar por proprietário
        document.getElementById('relatorios-proprietario-select')?.addEventListener('change', () => {
            this.filterData();
        });

        // Evento para gerar relatório
        document.getElementById('btn-gerar-relatorio')?.addEventListener('click', () => {
            this.generateReport();
        });

        // Evento para exportar Excel
        document.getElementById('btn-exportar-excel')?.addEventListener('click', () => {
            this.exportToExcel();
        });

        // Evento para copiar para clipboard
        document.getElementById('btn-copiar-clipboard')?.addEventListener('click', () => {
            this.copyToClipboard();
        });
    }

    /**
     * Método para cargar datos cuando se activa la pestaña (llamado por UI manager)
     */
    async load() {
        console.log('🔄 Cargando datos de relatórios...');
        try {
            // Solo cargar si hay ApiService y el usuario está autenticado
            if (!this.apiService) {
                console.warn('⚠️ ApiService não disponível para relatórios');
                return;
            }

            // Verificar autenticación antes de cargar
            if (window.authService && !window.authService.isAuthenticated()) {
                console.warn('⚠️ Usuario não autenticado - não carregando relatórios');
                return;
            }

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
            const proprietarioId = document.getElementById('relatorios-proprietario-select')?.value;
            
            if (ano) params.append('ano', ano);
            if (mes) params.append('mes', mes);
            if (proprietarioId) params.append('proprietario_id', proprietarioId);
            
            const response = await this.apiService.get(`/api/reportes/resumen-mensual?${params.toString()}`);
            const data = response.success ? response.data : response;
            
            if (!Array.isArray(data)) {
                console.error('Resposta de relatórios não é um array:', data);
                return;
            }
            
            this.currentData = data;
            this.filteredData = [...data];
            
            this.updateTable();
            this.updateSummary();
            
        } catch (error) {
            console.error('Erro ao carregar dados de relatórios:', error);
            this.showError('Erro ao carregar relatórios');
        }
    }

    filterData() {
        this.loadRelatoriosData();
    }

    updateTable() {
        const tbody = document.getElementById('relatorios-table-body');
        
        if (!tbody) {
            console.error('Elemento relatorios-table-body não encontrado');
            return;
        }
        
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
        
        this.filteredData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td class="fw-bold">${item.nome_proprietario}</td>
                <td class="text-center">${item.mes}/${item.ano}</td>
                <td class="text-end fw-bold text-primary">R$ ${this.formatMoney(item.valor_total)}</td>
                <td class="text-center">
                    <span class="badge bg-success">
                        <i class="fas fa-building me-1"></i>${item.quantidade_imoveis || 1} imóvel(is)
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    updateSummary() {
        if (!this.filteredData || this.filteredData.length === 0) {
            document.getElementById('total-proprietarios').textContent = '0';
            document.getElementById('total-valor').textContent = 'R$ 0,00';
            document.getElementById('media-valor').textContent = 'R$ 0,00';
            return;
        }
        
        const totalProprietarios = new Set(this.filteredData.map(item => item.nome_proprietario)).size;
        const totalValor = this.filteredData.reduce((sum, item) => sum + parseFloat(item.valor_total), 0);
        const mediaValor = totalValor / this.filteredData.length;
        
        document.getElementById('total-proprietarios').textContent = totalProprietarios.toString();
        document.getElementById('total-valor').textContent = `R$ ${this.formatMoney(totalValor)}`;
        document.getElementById('media-valor').textContent = `R$ ${this.formatMoney(mediaValor)}`;
    }

    async generateReport() {
        const button = document.getElementById('btn-gerar-relatorio');
        const originalText = button.innerHTML;
        
        try {
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Gerando...';
            button.disabled = true;
            
            await this.loadRelatoriosData();
            
            this.showSuccess('Relatório gerado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            this.showError('Erro ao gerar relatório');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async exportToExcel() {
        if (!this.filteredData || this.filteredData.length === 0) {
            this.showWarning('Não há dados para exportar');
            return;
        }

        try {
            // Preparar dados para exportação
            const exportData = this.filteredData.map((item, index) => ({
                'Nº': index + 1,
                'Nome do Proprietário': item.nome_proprietario,
                'Período': `${item.mes}/${item.ano}`,
                'Valor Total': `R$ ${this.formatMoney(item.valor_total)}`,
                'Quantidade de Imóveis': item.quantidade_imoveis || 1
            }));

            // Converter para CSV
            const csvContent = this.convertToCSV(exportData);
            
            // Criar e baixar arquivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            const now = new Date();
            const timestamp = now.toISOString().slice(0, 10);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `relatorio-alugueis-${timestamp}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showSuccess('Relatório exportado com sucesso!');
            
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            this.showError('Erro ao exportar relatório');
        }
    }

    async copyToClipboard() {
        if (!this.filteredData || this.filteredData.length === 0) {
            this.showWarning('Não há dados para copiar');
            return;
        }

        try {
            // Criar texto formatado para clipboard
            let clipboardText = 'Nº\tNome do Proprietário\tPeríodo\tValor Total\tQuantidade de Imóveis\n';
            
            this.filteredData.forEach((item, index) => {
                clipboardText += `${index + 1}\t${item.nome_proprietario}\t${item.mes}/${item.ano}\tR$ ${this.formatMoney(item.valor_total)}\t${item.quantidade_imoveis || 1}\n`;
            });
            
            await navigator.clipboard.writeText(clipboardText);
            this.showSuccess('Dados copiados para a área de transferência!');
            
        } catch (error) {
            console.error('Erro ao copiar dados:', error);
            this.showError('Erro ao copiar dados');
        }
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeader = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                let value = row[header] || '';
                // Escapar aspas duplas e envolver em aspas se contém vírgula
                if (value.toString().includes(',') || value.toString().includes('"')) {
                    value = '"' + value.toString().replace(/"/g, '""') + '"';
                }
                return value;
            }).join(',')
        );
        
        return [csvHeader, ...csvRows].join('\n');
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
