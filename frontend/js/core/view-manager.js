/**
 * Manejador de Vistas Unificado
 * Gestiona la carga y visualización de las diferentes secciones de la aplicación
 */

class ViewManager {
    constructor() {
        this.views = new Map();
        this.currentView = null;
        this.isInitialized = false;
        this.contentContainer = null;
    }

    /**
     * Inicializar manejador de vistas
     */
    init() {
        if (this.isInitialized) return;
        
        this.contentContainer = document.getElementById('main-content');
        if (!this.contentContainer) {
            console.error('❌ Container de contenido principal no encontrado');
            return;
        }

        this.setupEventListeners();
        this.registerViews();
        this.isInitialized = true;
        
        console.log('📄 ViewManager inicializado');
    }

    /**
     * Registrar todas las vistas disponibles
     */
    registerViews() {
        // Registrar vistas principales
        this.registerView('dashboard', {
            title: 'Dashboard',
            component: 'DashboardView',
            template: this.getDashboardTemplate(),
            requiredModules: ['dashboard']
        });

        this.registerView('proprietarios', {
            title: 'Gestão de Proprietários',
            component: 'ProprietariosView',
            template: this.getProprietariosTemplate(),
            requiredModules: ['proprietarios']
        });

        this.registerView('imoveis', {
            title: 'Gestão de Imóveis',
            component: 'ImoveisView',
            template: this.getImoveisTemplate(),
            requiredModules: ['imoveis']
        });

        this.registerView('participacoes', {
            title: 'Gestão de Participações',
            component: 'ParticipacoesView',
            template: this.getParticipacoesTemplate(),
            requiredModules: ['participacoes']
        });

        this.registerView('alugueis', {
            title: 'Matriz de Aluguéis',
            component: 'AlugueisView',
            template: this.getAlugueisTemplate(),
            requiredModules: ['alugueis']
        });

        this.registerView('relatorios', {
            title: 'Relatórios Financeiros',
            component: 'RelatoriosView',
            template: this.getRelatoriosTemplate(),
            requiredModules: ['relatorios']
        });

        this.registerView('extras', {
            title: 'Sistema de Extras',
            component: 'ExtrasView',
            template: this.getExtrasTemplate(),
            requiredModules: ['extras'],
            permission: 'admin'
        });

        this.registerView('importar', {
            title: 'Importar Dados',
            component: 'ImportarView',
            template: this.getImportarTemplate(),
            requiredModules: ['importacao', 'usuarioManager']
        });
    }

    /**
     * Registrar una vista
     */
    registerView(id, config) {
        this.views.set(id, {
            id,
            ...config,
            isLoaded: false,
            instance: null
        });
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Escuchar eventos de navegación
        window.addEventListener('navigate', (e) => {
            this.showView(e.detail.view);
        });

        // Escuchar cambios de dispositivo
        window.addEventListener('deviceChange', (e) => {
            // Reactualizar vista actual si es necesario
            if (this.currentView) {
                this.refreshCurrentView();
            }
        });
    }

    /**
     * Mostrar una vista
     */
    async showView(viewId) {
        console.log(`📄 Mostrando vista: ${viewId}`);
        
        const view = this.views.get(viewId);
        if (!view) {
            console.error(`❌ Vista no encontrada: ${viewId}`);
            return;
        }

        // Verificar permisos
        if (!this.checkViewPermission(view)) {
            console.warn(`⚠️ Sin permisos para vista: ${viewId}`);
            this.showView('dashboard');
            return;
        }

        try {
            // Ocultar vista actual
            if (this.currentView) {
                this.hideCurrentView();
            }

            // Mostrar loading
            this.showLoading();

            // Cargar vista si no está cargada
            if (!view.isLoaded) {
                await this.loadView(view);
            }

            // Actualizar contenido
            this.updateContent(view);
            
            // Actualizar título
            this.updateTitle(view.title);
            
            // Activar vista
            this.currentView = viewId;
            
            // Inicializar módulos requeridos
            await this.initializeRequiredModules(view);
            
            // Ocultar loading
            this.hideLoading();
            
            console.log(`✅ Vista cargada: ${viewId}`);
            
        } catch (error) {
            console.error(`❌ Error cargando vista ${viewId}:`, error);
            this.showError('Error al cargar la vista');
        }
    }

    /**
     * Cargar una vista
     */
    async loadView(view) {
        // Marcar como cargada
        view.isLoaded = true;
        
        // Aquí podrían cargarse componentes dinámicamente si fuera necesario
        console.log(`📄 Vista ${view.id} cargada`);
    }

    /**
     * Actualizar contenido de la vista
     */
    updateContent(view) {
        if (!this.contentContainer) return;
        
        // Obtener template responsivo
        const template = this.getResponsiveTemplate(view);
        
        // Actualizar contenido de forma segura
        SecurityUtils.setSafeHTML(this.contentContainer, template);
        
        // Aplicar configuraciones específicas del dispositivo
        this.applyDeviceSpecificConfig(view);
    }

    /**
     * Obtener template responsivo
     */
    getResponsiveTemplate(view) {
        const deviceType = window.deviceManager.deviceType;
        const template = view.template;
        
        // Aplicar clases responsivas
        return template.replace(/class="([^"]*)"/g, (match, classes) => {
            return `class="${classes} device-${deviceType}"`;
        });
    }

    /**
     * Aplicar configuración específica del dispositivo
     */
    applyDeviceSpecificConfig(view) {
        const deviceType = window.deviceManager.deviceType;
        const tableConfig = window.deviceManager.getTableConfig();
        
        // Configurar tablas según dispositivo
        if (tableConfig.responsive) {
            this.setupResponsiveTables();
        }
        
        if (tableConfig.compactMode && deviceType === 'mobile') {
            this.enableCompactMode();
        }
    }

    /**
     * Configurar tablas responsivas
     */
    setupResponsiveTables() {
        const tables = this.contentContainer.querySelectorAll('.table');
        tables.forEach(table => {
            if (!table.closest('.table-responsive-custom')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-responsive-custom';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
            
            // Añadir clases responsivas
            table.classList.add('table-custom');
        });
    }

    /**
     * Habilitar modo compacto
     */
    enableCompactMode() {
        document.body.classList.add('compact-mode');
        
        // Añadir data-labels para tablas en móvil
        const tables = this.contentContainer.querySelectorAll('.table-custom');
        tables.forEach(table => {
            const headers = table.querySelectorAll('thead th');
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell, index) => {
                    if (headers[index]) {
                        cell.setAttribute('data-label', headers[index].textContent.trim());
                    }
                });
            });
        });
    }

    /**
     * Verificar permisos de vista
     */
    checkViewPermission(view) {
        if (!view.permission) return true;
        
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userType = userData.tipo || 'usuario';
        
        return view.permission === 'all' || 
               (view.permission === 'admin' && userType === 'administrador');
    }

    /**
     * Inicializar módulos requeridos
     */
    async initializeRequiredModules(view) {
        console.log('🔧 Inicializando módulos requeridos para vista:', view.id, view.requiredModules);
        
        if (!view.requiredModules) {
            console.log('⚠️ Nenhum módulo requerido para esta vista');
            return;
        }
        
        for (const moduleName of view.requiredModules) {
            try {
                console.log(`🔧 Tentando inicializar módulo: ${moduleName}`);
                
                const moduleInstance = window[`${moduleName}Module`];
                console.log(`� Instância do módulo encontrada:`, !!moduleInstance);
                
                if (moduleInstance) {
                    console.log(`🔧 Métodos disponíveis no módulo:`, Object.getOwnPropertyNames(Object.getPrototypeOf(moduleInstance)));
                    
                    if (typeof moduleInstance.load === 'function') {
                        console.log(`🔧 Chamando load() do módulo ${moduleName}...`);
                        await moduleInstance.load();
                        console.log(`✅ Módulo ${moduleName} carregado com sucesso`);
                    } else {
                        console.warn(`⚠️ Módulo ${moduleName} não tem método load()`);
                    }
                } else {
                    console.error(`❌ Módulo ${moduleName} não encontrado em window.${moduleName}Module`);
                }
            } catch (error) {
                console.error(`❌ Erro inicializando módulo ${moduleName}:`, error);
            }
        }
    }

    /**
     * Ocultar vista actual
     */
    hideCurrentView() {
        // Limpiar cualquier estado específico de la vista actual
        document.body.classList.remove('compact-mode');
    }

    /**
     * Actualizar título
     */
    updateTitle(title) {
        document.title = `${title} - Sistema de Aluguéis`;
        
        const headerTitle = document.getElementById('page-title');
        if (headerTitle) {
            SecurityUtils.setSafeHTML(headerTitle, title);
        }
    }

    /**
     * Mostrar loading
     */
    showLoading() {
        const loadingHTML = `
            <div class="d-flex justify-content-center align-items-center" style="min-height: 400px;">
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <div class="mt-3">Carregando...</div>
                </div>
            </div>
        `;
        
        if (this.contentContainer) {
            SecurityUtils.setSafeHTML(this.contentContainer, loadingHTML);
        }
    }

    /**
     * Ocultar loading
     */
    hideLoading() {
        // El loading se oculta automáticamente al actualizar el contenido
    }

    /**
     * Mostrar error
     */
    showError(message) {
        const errorHTML = `
            <div class="alert alert-danger text-center" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${SecurityUtils.escapeHtml(message)}
            </div>
        `;
        
        if (this.contentContainer) {
            SecurityUtils.setSafeHTML(this.contentContainer, errorHTML);
        }
    }

    /**
     * Refrescar vista actual
     */
    refreshCurrentView() {
        if (this.currentView) {
            this.showView(this.currentView);
        }
    }

    /**
     * Obtener vista actual
     */
    getCurrentView() {
        return this.currentView;
    }

    // TEMPLATES DE VISTAS (métodos que retornan HTML)
    
    getDashboardTemplate() {
        return `
            <div class="dashboard-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Dashboard</h1>
                </div>
                <div class="container-fluid">
                    <div class="row mb-4">
                        <div class="col-12 col-sm-6 col-md-3">
                            <div class="card-responsive stats-card shadow-sm h-100">
                                <div class="card-body-responsive text-center">
                                    <i class="fas fa-users fa-2x text-primary mb-3"></i>
                                    <h4 id="dashboard-total-proprietarios" class="counter" style="font-size:1.5rem;">-</h4>
                                    <p class="text-muted">Proprietários</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-sm-6 col-md-3">
                            <div class="card-responsive stats-card shadow-sm h-100">
                                <div class="card-body-responsive text-center">
                                    <i class="fas fa-building fa-2x text-success mb-3"></i>
                                    <h4 id="dashboard-total-inmuebles" class="counter" style="font-size:1.5rem;">-</h4>
                                    <p class="text-muted">Imóveis</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-sm-6 col-md-3">
                            <div class="card-responsive stats-card shadow-sm h-100">
                                <div class="card-body-responsive text-center">
                                    <i class="fas fa-handshake fa-2x text-warning mb-3"></i>
                                    <h4 id="dashboard-alugueis-ano-corrente" class="counter" style="font-size:1.5rem;">-</h4>
                                    <p class="text-muted">Aluguéis no Ano</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-sm-6 col-md-3">
                            <div class="card-responsive stats-card shadow-sm h-100">
                                <div class="card-body-responsive text-center">
                                    <i class="fas fa-dollar-sign fa-2x text-info mb-3"></i>
                                    <h4 id="dashboard-ingresos-mensuales" class="counter" style="font-size:1.5rem;">-</h4>
                                    <p class="text-muted">Receita/Mês</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row d-desktop-block d-tablet-block d-mobile-none">
                        <div class="col-md-8">
                            <div class="card-responsive">
                                <div class="card-header-responsive">
                                    <h5><i class="fas fa-chart-line me-2"></i>Evolução de Receitas</h5>
                                </div>
                                <div class="card-body-responsive">
                                    <div class="chart-container">
                                        <canvas id="ingresosChart" height="300"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card-responsive">
                                <div class="card-header-responsive">
                                    <h5><i class="fas fa-chart-pie me-2"></i>Distribuição por Tipo</h5>
                                </div>
                                <div class="card-body-responsive">
                                    <div class="chart-container">
                                        <canvas id="distribucionChart" height="300"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getProprietariosTemplate() {
        return `
            <div class="proprietarios-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-users me-2"></i>Gestão de Proprietários</h1>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" class="form-control" id="search-proprietarios" placeholder="Buscar por nome, sobrenome, documento ou email...">
                        </div>
                    </div>
                </div>
                <div class="card-responsive">
                    <div class="card-header-responsive">
                        <h5 class="card-title mb-0"><i class="fas fa-table me-2"></i>Lista de Proprietários</h5>
                    </div>
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Proprietário</th>
                                        <th>Contato</th>
                                        <th>Endereço</th>
                                        <th>Dados Bancários</th>
                                        <th>Data</th>
                                        <th width="120">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="proprietarios-table-body">
                                    <tr>
                                        <td colspan="6" class="text-center text-muted py-4">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Carregando...</span>
                                            </div>
                                            <br>Carregando proprietários...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getImoveisTemplate() {
        return `
            <div class="imoveis-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Gestão de Imóveis</h1>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <input type="text" class="form-control" id="imoveis-search" placeholder="Buscar imóveis...">
                    </div>
                </div>
                <div class="card-responsive">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom" id="imoveis-table">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Nome</th>
                                        <th>Endereço</th>
                                        <th>Tipo</th>
                                        <th>Área Total</th>
                                        <th>Área Construída</th>
                                        <th>Valor Cadastral</th>
                                        <th>Valor Mercado</th>
                                        <th>IPTU Anual</th>
                                        <th>Condomínio Mensal</th>
                                        <th>Alugado</th>
                                        <th>Data Cadastro</th>
                                        <th width="120">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="imoveis-table-body">
                                    <tr>
                                        <td colspan="12" class="text-center text-muted py-4">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Carregando...</span>
                                            </div>
                                            <br>Carregando imóveis...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getParticipacoesTemplate() {
        return `
            <div class="participacoes-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-chart-pie me-2"></i>Gestão de Participações</h1>
                </div>
                <div id="participacoes-data-selector" class="mb-3"></div>
                <div class="row" id="participacoes-container"></div>
                <div id="participacoes-table-container" style="display: none;">
                    <div class="card-responsive">
                        <div class="card-body-responsive">
                            <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto; overflow-x: auto;">
                                <table class="table table-striped table-hover matriz-table table-custom" id="participacoes-matrix-table">
                                    <thead class="table-dark" id="participacoes-matrix-head" style="white-space: nowrap;">
                                        <tr>
                                            <th width="120">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="participacoes-matrix-body" style="white-space: nowrap;">
                                        <tr>
                                            <td colspan="1" class="text-center text-muted py-4">
                                                <div class="spinner-border" role="status">
                                                    <span class="visually-hidden">Carregando...</span>
                                                </div>
                                                <br>Carregando participações...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getAlugueisTemplate() {
        return `
            <div class="alugueis-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2">Matriz de Aluguéis</h1>
                </div>
                <div class="row mb-3">
                    <div class="col-md-3">
                        <label for="alugueis-ano-select" class="form-label mb-1">Ano</label>
                        <select id="alugueis-ano-select" class="form-select">
                            <option value="">Selecione o ano</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label for="alugueis-mes-select" class="form-label mb-1">Mês</label>
                        <select id="alugueis-mes-select" class="form-select" disabled>
                            <option value="">Selecione o mês</option>
                            <option value="1">Janeiro</option>
                            <option value="2">Fevereiro</option>
                            <option value="3">Março</option>
                            <option value="4">Abril</option>
                            <option value="5">Maio</option>
                            <option value="6">Junho</option>
                            <option value="7">Julho</option>
                            <option value="8">Agosto</option>
                            <option value="9">Setembro</option>
                            <option value="10">Outubro</option>
                            <option value="11">Novembro</option>
                            <option value="12">Dezembro</option>
                        </select>
                    </div>
                </div>
                <div id="alugueis-table-container" style="display: none;">
                    <div class="card-responsive">
                        <div class="card-body-responsive">
                            <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto;">
                                <table class="table table-striped table-hover matriz-table table-custom" id="alugueis-matrix-table">
                                    <thead class="table-dark" id="alugueis-matrix-head">
                                    </thead>
                                    <tbody id="alugueis-matrix-body">
                                        <tr>
                                            <td colspan="1" class="text-center text-muted py-4">
                                                <div class="spinner-border" role="status">
                                                    <span class="visually-hidden">Carregando...</span>
                                                </div>
                                                <br>Carregando aluguéis...
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getRelatoriosTemplate() {
        return `
            <div class="relatorios-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-chart-bar me-2"></i>Relatórios Financeiros</h1>
                </div>
                <div id="relatorios-alerts"></div>
                <div class="card-responsive mb-4">
                    <div class="card-header-responsive">
                        <h5 class="card-title mb-0"><i class="fas fa-filter me-2"></i>Filtros</h5>
                    </div>
                    <div class="card-body-responsive">
                        <div class="row">
                            <div class="col-md-3">
                                <label for="relatorios-ano-select" class="form-label mb-1">Ano</label>
                                <select id="relatorios-ano-select" class="form-select">
                                    <option value="">Carregando...</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="relatorios-mes-select" class="form-label mb-1">Mês</label>
                                <select id="relatorios-mes-select" class="form-select">
                                    <option value="">Todos os meses</option>
                                    <option value="1">Janeiro</option>
                                    <option value="2">Fevereiro</option>
                                    <option value="3">Março</option>
                                    <option value="4">Abril</option>
                                    <option value="5">Maio</option>
                                    <option value="6">Junho</option>
                                    <option value="7">Julho</option>
                                    <option value="8">Agosto</option>
                                    <option value="9">Setembro</option>
                                    <option value="10">Outubro</option>
                                    <option value="11">Novembro</option>
                                    <option value="12">Dezembro</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label for="relatorios-proprietario-select" class="form-label mb-1">Proprietário</label>
                                <select id="relatorios-proprietario-select" class="form-select">
                                    <option value="">Carregando...</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label mb-1">&nbsp;</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="relatorios-transferencias-check">
                                    <label class="form-check-label" for="relatorios-transferencias-check">
                                        <i class="fas fa-exchange-alt me-1"></i>Transferências
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-responsive">
                    <div class="card-header-responsive">
                        <h5 class="card-title mb-0"><i class="fas fa-table me-2"></i>Relatório de Aluguéis por Proprietário</h5>
                    </div>
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom">
                                <thead class="table-dark">
                                    <tr>
                                        <th width="50">Nº</th>
                                        <th>Nome do Proprietário</th>
                                        <th width="120" class="text-center">Período</th>
                                        <th width="150" class="text-end">Soma dos Aluguéis</th>
                                        <th width="150" class="text-end">Soma das Taxas de Administração</th>
                                        <th width="150" class="text-center">Imóveis</th>
                                    </tr>
                                </thead>
                                <tbody id="relatorios-table-body">
                                    <tr>
                                        <td colspan="6" class="text-center text-muted py-4">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Carregando...</span>
                                            </div>
                                            <br>Carregando relatórios...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card-footer">
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Use os filtros acima para refinar os dados. 
                            Os valores são calculados automaticamente com base nos aluguéis registrados e participações.
                        </small>
                    </div>
                </div>
            </div>
        `;
    }

    getExtrasTemplate() {
        return `
            <div class="extras-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-cogs me-2"></i>Sistema de Extras</h1>
                    <div class="btn-group">
                        <button id="btn-novo-alias" class="btn btn-primary">
                            <i class="fas fa-plus me-2"></i>Novo Alias
                        </button>
                        <button id="btn-novas-transferencias" class="btn btn-primary">
                            <i class="fas fa-exchange-alt me-2"></i>Novas Transferências
                        </button>
                    </div>
                </div>
                <div class="card-responsive">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Alias</th>
                                        <th>Proprietários Pertenecentes</th>
                                        <th width="100" class="text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="extras-table-body">
                                    <tr>
                                        <td colspan="3" class="text-center text-muted py-4">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Carregando...</span>
                                            </div>
                                            <br>Carregando aliases...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="card-responsive mt-4">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 60vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Alias</th>
                                        <th>Nome da Transferência</th>
                                        <th width="130" class="text-center">Data Criação</th>
                                        <th width="130" class="text-center">Data Fim</th>
                                        <th width="100" class="text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="transferencias-table-body">
                                    <tr>
                                        <td colspan="5" class="text-center text-muted py-4">
                                            <div class="spinner-border" role="status">
                                                <span class="visually-hidden">Carregando...</span>
                                            </div>
                                            <br>Carregando transferências...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getImportarTemplate() {
        return `
            <div class="importar-container">
                <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                    <h1 class="h2"><i class="fas fa-file-import me-2"></i>Importar Dados</h1>
                </div>
                <div class="row mb-4 justify-content-center">
                    <div class="col-12">
                        <div class="card-responsive">
                            <div class="card-header-responsive">
                                <h5 class="card-title mb-0"><i class="fas fa-upload me-2"></i>Importar Arquivos Excel</h5>
                            </div>
                            <div class="card-body-responsive">
                                <div class="mb-4 text-end">
                                    <div class="d-flex flex-wrap justify-content-center gap-2">
                                        <button class="btn btn-primary" style="width:150px" id="btn-novo-proprietario"><i class="fas fa-user-plus me-2"></i> Novo Proprietário</button>
                                        <button class="btn btn-primary" style="width:150px" id="btn-novo-imovel-importar" data-bs-toggle="modal" data-bs-target="#novo-imovel-importar-modal"><i class="fas fa-building me-2"></i> Novo Imóvel</button>
                                        <button class="btn btn-primary" style="width:150px" id="btn-alterar-usuario" data-bs-toggle="modal" data-bs-target="#modal-alterar-usuario"><i class="fas fa-user-edit me-2"></i> Alterar Usuário</button>
                                        <button class="btn btn-primary" style="width:150px" id="btn-cadastrar-usuario" data-bs-toggle="modal" data-bs-target="#modal-cadastrar-usuario"><i class="fas fa-user-plus me-2"></i> Cadastrar Novo Usuário</button>
                                    </div>
                                </div>
                                <form id="importar-form-proprietarios" class="mb-3" enctype="multipart/form-data">
                                    <div class="input-group">
                                        <input type="file" class="form-control" id="arquivo-proprietarios" accept=".xlsx,.xls" required>
                                        <button class="btn btn-primary" type="submit" style="width: 260px;"><i class="fas fa-users me-2"></i> Importar Proprietários</button>
                                    </div>
                                </form>
                                <form id="importar-form-imoveis" class="mb-3" enctype="multipart/form-data">
                                    <div class="input-group">
                                        <input type="file" class="form-control" id="arquivo-imoveis" accept=".xlsx,.xls" required>
                                        <button class="btn btn-primary" type="submit" style="width: 260px;"><i class="fas fa-building me-2"></i> Importar Imóveis</button>
                                    </div>
                                </form>
                                <form id="importar-form-participacoes" class="mb-3" enctype="multipart/form-data">
                                    <div class="input-group">
                                        <input type="file" class="form-control" id="arquivo-participacoes" accept=".xlsx,.xls" required>
                                        <button class="btn btn-primary" type="submit" style="width: 260px;"><i class="fas fa-chart-pie me-2"></i> Importar Participações</button>
                                    </div>
                                </form>
                                <form id="importar-form-alugueis" class="mb-3" enctype="multipart/form-data">
                                    <div class="input-group">
                                        <input type="file" class="form-control" id="arquivo-alugueis" accept=".xlsx,.xls" required>
                                        <button class="btn btn-primary" type="submit" style="width: 260px;"><i class="fas fa-calendar-alt me-2"></i> Importar Aluguéis</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Crear instancia global
window.viewManager = new ViewManager();
