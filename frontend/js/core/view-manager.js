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
            requiredModules: ['importacao', 'usuarioManager', 'proprietarios', 'imoveis']
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

        // Eliminado bloqueo a dashboard: permitir acceso siempre que se solicite

        // Verificar permisos
        if (!this.checkViewPermission(view)) {
            console.warn(`⚠️ Sin permisos para vista: ${viewId}`);
            // No navegar automáticamente a dashboard, solo mostrar advertencia
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
        window.SecurityUtils.setSafeHTML(this.contentContainer, template);
        
        // Aplicar configuraciones específicas del dispositivo
        this.applyDeviceSpecificConfig(view);

        // Registrar evento para el botón Novo Alias si estamos en la vista importar
        if (view.id === 'importar') {
            const btnNovoAlias = document.getElementById('btn-novo-alias');
            if (btnNovoAlias) {
                btnNovoAlias.addEventListener('click', async function() {
                    console.log('[DEBUG] Botón Novo Alias clicado (view-manager.js)');
                    if (window.extrasModule && typeof window.extrasModule.loadProprietarios === 'function') {
                        await window.extrasModule.loadProprietarios();
                        console.log('[DEBUG] loadProprietarios ejecutado antes de abrir el modal (view-manager.js)');
                        window.extrasModule.showAliasModal(null);
                    } else if (window.extrasModule && typeof window.extrasModule.showAliasModal === 'function') {
                        window.extrasModule.showAliasModal(null);
                    } else {
                        const form = document.getElementById('form-alias');
                        if (form) form.reset();
                        const modalTitle = document.getElementById('modalAliasLabel');
                        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-plus me-2"></i>Novo Alias';
                        const modal = document.getElementById('modal-alias');
                        if (modal) {
                            bootstrap.Modal.getOrCreateInstance(modal).show();
                        }
                    }
                });
            }
            // Registrar evento para Novas Transferências
            const btnNovasTransferencias = document.getElementById('btn-novas-transferencias');
            if (btnNovasTransferencias) {
                btnNovasTransferencias.addEventListener('click', function() {
                    // Forzar modo de nova transferência
                    if (window.extrasModule && typeof window.extrasModule.showTransferenciasModal === 'function') {
                        window.extrasModule.currentTransferencia = null;
                        window.extrasModule.showTransferenciasModal();
                    } else {
                        // Fallback: limpiar y mostrar modal diretamente
                        const form = document.getElementById('form-transferencias');
                        if (form) form.reset();
                        const modal = document.getElementById('modal-transferencias');
                        if (modal) {
                            bootstrap.Modal.getOrCreateInstance(modal).show();
                        }
                    }
                });
            }
            // Registrar evento para el select de alias en transferencias
            setTimeout(() => {
                const aliasSelect = document.getElementById('transferencia-alias');
                if (aliasSelect) {
                    aliasSelect.addEventListener('change', function(e) {
                        if (window.extrasModule && typeof window.extrasModule.carregarProprietariosAlias === 'function') {
                            window.extrasModule.carregarProprietariosAlias(e.target.value);
                        }
                    });
                }
            }, 400);
        }

        // Forzar la recarga de alias al cargar la vista extras para asegurar que allExtras siempre esté actualizado
        if (view.id === 'extras') {
            if (window.extrasModule && typeof window.extrasModule.loadExtras === 'function') {
                window.extrasModule.loadExtras();
                console.log('[DEBUG] loadExtras ejecutado al cargar la vista extras');
            }
        }
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
     // Usar solo memoria: authService
     let userType = 'usuario';
     if (window.authService && typeof window.authService.getUserData === 'function') {
         const userData = window.authService.getUserData();
         if (userData && userData.tipo) userType = userData.tipo;
     }
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
            let retries = 0;
            let moduleInstance = window[`${moduleName}Module`];
            while (!moduleInstance && retries < 5) {
                // Esperar 100ms y reintentar
                await new Promise(res => setTimeout(res, 100));
                moduleInstance = window[`${moduleName}Module`];
                retries++;
            }
            try {
                console.log(`🔧 Tentando inicializar módulo: ${moduleName}`);
                console.log(` Instância do módulo encontrada:`, !!moduleInstance);
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
                    console.error(`❌ Módulo ${moduleName} não encontrado em window.${moduleName}Module após ${retries} tentativas.`);
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
            window.SecurityUtils.setSafeHTML(headerTitle, title);
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
            window.SecurityUtils.setSafeHTML(this.contentContainer, loadingHTML);
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
                ${window.SecurityUtils.escapeHtml(message)}
            </div>
        `;
        
        if (this.contentContainer) {
            window.SecurityUtils.setSafeHTML(this.contentContainer, errorHTML);
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
                <!-- Encabezado eliminado -->
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
                    </div>
                </div>
            </div>
        `;
    }

    getProprietariosTemplate() {
        return `
            <div class="proprietarios-container">
                <div class="d-flex justify-content-end mb-3">
                    <button class="btn btn-primary" id="btn-novo-proprietario"><i class="fas fa-plus me-2"></i>Novo Proprietário</button>
                </div>
                <div class="card-responsive">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 75vh; min-height: 55vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom" style="font-size: 0.8rem;">
                                <thead class="table-dark">
                                    <tr>
                                        <th>ID</th>
                                        <th>Nome Completo</th>
                                        <th>Documento</th>
                                        <th>Telefone</th>
                                        <th>Email</th>
                                        <th class="text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="proprietarios-table-body">
                                    <!-- Rows serão inseridas aqui -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Genérico para Proprietário -->
            <div class="modal fade" id="proprietario-modal" tabindex="-1" aria-labelledby="proprietarioModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="proprietario-modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="font-size: 0.8rem; padding: 1rem;">
                            <form id="form-proprietario">
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-nome" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Nome *</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-nome" name="nome" required style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-sobrenome" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Sobrenome</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-sobrenome" name="sobrenome" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-tipo_documento" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Tipo de Documento</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-tipo_documento" name="tipo_documento" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-documento" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Documento</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-documento" name="documento" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="mb-1">
                                    <label for="proprietario-endereco" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Endereço</label>
                                    <input type="text" class="form-control form-control-sm" id="proprietario-endereco" name="endereco" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                </div>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-telefone" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Telefone</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-telefone" name="telefone" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-email" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Email</label>
                                        <input type="email" class="form-control form-control-sm" id="proprietario-email" name="email" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <hr style="margin: 0.5rem 0;">
                                <h6 style="font-size: 0.9rem; margin-bottom: 0.25rem;">Dados Bancários</h6>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-banco" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Banco</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-banco" name="banco" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-agencia" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Agência</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-agencia" name="agencia" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="row" style="margin-bottom: 0.25rem;">
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-conta" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Conta</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-conta" name="conta" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                    <div class="col-md-6 mb-1">
                                        <label for="proprietario-tipo_conta" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Tipo de Conta</label>
                                        <input type="text" class="form-control form-control-sm" id="proprietario-tipo_conta" name="tipo_conta" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
                                    </div>
                                </div>
                                <div class="mb-1">
                                    <label for="proprietario-observacoes" class="form-label" style="font-size: 0.85rem; margin-bottom: 0.1rem;">Observações</label>
                                    <textarea class="form-control form-control-sm" id="proprietario-observacoes" name="observacoes" rows="2" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;"></textarea>
                                </div>
                                <div class="modal-footer" style="padding: 0.25rem;">
                                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary btn-sm" id="btn-salvar-proprietario">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getImoveisTemplate() {
        return `
            <div class="imoveis-container">
                <div class="d-flex justify-content-end mb-3">
                    <button class="btn btn-primary" id="btn-novo-imovel" onclick="console.log('[TESTE] Botão clicado inline'); if(window.imoveisModule) window.imoveisModule.showNewModal();"><i class="fas fa-plus me-2"></i>Novo Imóvel</button>
                </div>
                <div class="card-responsive">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 70vh; min-height: 50vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom" id="imoveis-table" style="font-size: 0.8rem;">
                                <thead class="table-dark">
                                    <tr>
                                        <th>Nome<br><span style="font-weight: normal; color: inherit; font-size: inherit;">Tipo</span></th>
                                        <th>Endereço</th>
                                        <th>Área Total<br><span style="font-weight: normal; color: inherit; font-size: inherit;">Construída</span></th>
                                        <th>Valor Cadastral<br><span style="font-weight: normal; color: inherit; font-size: inherit;">Mercado</span></th>
                                        <th>IPTU<br><span style="font-weight: normal; color: inherit; font-size: inherit;">Condomínio</span></th>
                                        <th>Alugado</th>
                                        <th>Data Cadastro</th>
                                        <th width="120">Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="imoveis-table-body">
                                    <tr>
                                        <td colspan="8" class="text-center text-muted py-4">
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

                <!-- Modal de Novo Imóvel -->
                <div class="modal fade" id="novo-imovel-modal" tabindex="-1" aria-labelledby="novoImovelModalLabel">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="novoImovelModalLabel"><i class="fas fa-building me-2"></i>Novo Imóvel</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <form id="form-novo-imovel">
                                <div class="modal-body p-1" style="font-size: 0.80rem; max-height: 70vh; overflow-y: auto;">
                                    <div class="mb-1"><label class="form-label">Nome</label><input type="text" class="form-control" name="nome" required style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Endereço</label><input type="text" class="form-control" name="endereco" required style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Tipo</label><input type="text" class="form-control" name="tipo_imovel" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Área Total</label><input type="number" class="form-control" name="area_total" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Área Construída</label><input type="number" class="form-control" name="area_construida" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Valor Cadastral</label><input type="number" class="form-control" name="valor_cadastral" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Valor Mercado</label><input type="number" class="form-control" name="valor_mercado" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">IPTU Mensal</label><input type="number" class="form-control" name="iptu_mensal" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Condomínio Mensal</label><input type="number" class="form-control" name="condominio_mensal" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Quartos</label><input type="number" class="form-control" name="numero_quartos" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Banheiros</label><input type="number" class="form-control" name="numero_banheiros" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Vagas Garagem</label><input type="number" class="form-control" name="numero_vagas_garagem" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><div class="form-check"><input class="form-check-input" type="checkbox" name="alugado" id="alugado-novo" value="true"><label class="form-check-label" for="alugado-novo">Alugado</label></div></div>
                                    <div class="mb-3"><label class="form-label">Data Cadastro</label><input type="date" class="form-control" name="data_cadastro" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Observações</label><textarea class="form-control" name="observacoes" style="font-size:0.85em;"></textarea></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal de Edición de Imóvel -->
                <div class="modal fade" id="edit-imovel-modal" tabindex="-1" aria-labelledby="editImovelModalLabel">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="editImovelModalLabel"><i class="fas fa-building me-2"></i>Editar Imóvel</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <form id="edit-imovel-form">
                                <div class="modal-body p-1" style="font-size: 0.80rem; max-height: 70vh; overflow-y: auto;">
                                    <div class="mb-1"><label class="form-label">Nome</label><input type="text" class="form-control" name="nome" required style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Endereço</label><input type="text" class="form-control" name="endereco" required style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Tipo</label><input type="text" class="form-control" name="tipo_imovel" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Área Total</label><input type="number" class="form-control" name="area_total" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Área Construída</label><input type="number" class="form-control" name="area_construida" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Valor Cadastral</label><input type="number" class="form-control" name="valor_cadastral" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Valor Mercado</label><input type="number" class="form-control" name="valor_mercado" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">IPTU Mensal</label><input type="number" class="form-control" name="iptu_mensal" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Condomínio Mensal</label><input type="number" class="form-control" name="condominio_mensal" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Quartos</label><input type="number" class="form-control" name="numero_quartos" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Banheiros</label><input type="number" class="form-control" name="numero_banheiros" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Vagas Garagem</label><input type="number" class="form-control" name="numero_vagas_garagem" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><div class="form-check"><input class="form-check-input" type="checkbox" name="alugado" id="alugado-edit" value="true"><label class="form-check-label" for="alugado-edit">Alugado</label></div></div>
                                    <div class="mb-3"><label class="form-label">Data Cadastro</label><input type="date" class="form-control" name="data_cadastro" style="font-size:0.85em;"></div>
                                    <div class="mb-3"><label class="form-label">Observações</label><textarea class="form-control" name="observacoes" style="font-size:0.85em;"></textarea></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal de Confirmação de Exclusão -->
                <div class="modal fade" id="modal-confirmar-exclusao-imovel" tabindex="-1" aria-labelledby="modalConfirmarExclusaoLabel">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-danger text-white">
                                <h5 class="modal-title" id="modalConfirmarExclusaoLabel"><i class="fas fa-exclamation-triangle me-2"></i>Confirmar Exclusão</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <p>Tem certeza de que deseja excluir este imóvel?</p>
                                <p class="text-danger"><strong>Esta ação não pode ser desfeita.</strong></p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-danger" id="btn-confirmar-exclusao-imovel">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getParticipacoesTemplate() {
        return `
            <div class="participacoes-container">
                <!-- Encabezado eliminado -->
                <div id="participacoes-data-selector" class="mb-3"></div>
                <div class="row" id="participacoes-container"></div>
                <div id="participacoes-table-container" style="display: none;">
                    <div class="card-responsive">
                        <div class="card-body-responsive">
                            <div class="table-responsive-custom" style="max-height: 70vh; min-height: 50vh; overflow-y: auto; overflow-x: auto;">
                                <table class="table table-striped table-hover matriz-table table-custom" id="participacoes-matrix-table" style="font-size: 0.76rem;">
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
                <!-- Encabezado eliminado -->
                <div class="row mb-3 align-items-center">
                        <div class="col-md-3 d-flex align-items-center">
                            <label for="alugueis-ano-select" class="form-label mb-0 me-4" style="min-width: 60px;">Ano</label>
                            <select id="alugueis-ano-select" class="form-select">
                                <option value="">Selecione o ano</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-flex align-items-center">
                            <label for="alugueis-mes-select" class="form-label mb-0 me-4" style="min-width: 80px;">Mês</label>
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
                            <div class="table-responsive-custom" style="max-height: 70vh; min-height: 50vh; overflow-y: auto;">
                                <table class="table table-striped table-hover matriz-table table-custom" id="alugueis-matrix-table" style="font-size: 0.76rem;">
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
                <!-- Encabezado eliminado -->
                <div id="relatorios-alerts"></div>
                <!-- Filtros sin rectángulo, estilo Participação -->
                        <div class="d-flex align-items-center mb-4" style="gap: 24px; flex-wrap: wrap;">
                            <div class="d-flex align-items-center me-3">
                                <label for="relatorios-ano-select" class="form-label mb-0 me-2" style="min-width: 50px;">Ano</label>
                                <select id="relatorios-ano-select" class="form-select" style="width: 160px; min-width: 140px;">
                                    <option value="">Carregando...</option>
                                </select>
                            </div>
                            <div class="d-flex align-items-center me-3">
                                <label for="relatorios-mes-select" class="form-label mb-0 me-2" style="min-width: 50px;">Mês</label>
                                <select id="relatorios-mes-select" class="form-select" style="width: 160px; min-width: 140px;">
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
                            <div class="d-flex align-items-center me-3">
                                <label for="relatorios-proprietario-select" class="form-label mb-0 me-2" style="min-width: 80px;">Proprietário</label>
                                <select id="relatorios-proprietario-select" class="form-select" style="width: 200px; min-width: 160px;">
                                    <option value="">Carregando...</option>
                                </select>
                            </div>
                            <div class="d-flex align-items-center">
                                <input class="form-check-input me-2" type="checkbox" id="relatorios-transferencias-check">
                                <label class="form-check-label" for="relatorios-transferencias-check">
                                    <i class="fas fa-exchange-alt me-1"></i>Transferências
                                </label>
                            </div>
                        </div>
                
                <div class="card-responsive">
                    <!-- Título eliminado por solicitud del usuario -->
                    <div class="card-body-responsive">
                            <div class="table-responsive-custom" style="max-height: 70vh; min-height: 50vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom" style="font-size: 0.76rem;">
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
                </div>
            </div>
        `;
    }

    getExtrasTemplate() {
        return `
            <div class="extras-container">
                <!-- Encabezado eliminado -->
                <div class="card-responsive">
                    <div class="card-body-responsive">
                        <div class="table-responsive-custom" style="max-height: 10.2rem; min-height: 2.6rem; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom" style="font-size: 0.80rem;">
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
                        <div class="table-responsive-custom" style="max-height: 80vh; min-height: 50vh; overflow-y: auto;">
                            <table class="table table-striped table-hover table-custom" style="font-size: 0.80rem;">
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
                                        <button class="btn btn-primary" style="width:150px" id="btn-alterar-usuario" onclick="window.usuarioManagerModule.showAlterarModal()"><i class="fas fa-user-edit me-2"></i> Alterar Usuário</button>
                                        <button class="btn btn-primary" style="width:150px" id="btn-cadastrar-usuario" data-bs-toggle="modal" data-bs-target="#modal-cadastrar-usuario"><i class="fas fa-user-plus me-2"></i> Cadastrar Novo Usuário</button>
                                        <button class="btn btn-primary" style="width:150px" id="btn-novo-alias" type="button"><i class="fas fa-user-tag me-2"></i> Novo Alias</button>
                                        <button class="btn btn-primary" style="width:150px" id="btn-novas-transferencias" type="button"><i class="fas fa-exchange-alt me-2"></i> Nova Transferência</button>
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

                <!-- Modales de Usuário -->
                <!-- Modal Cadastrar Usuário -->
                <div class="modal fade" id="modal-cadastrar-usuario" tabindex="-1" aria-labelledby="modalCadastrarUsuarioLabel">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="modalCadastrarUsuarioLabel"><i class="fas fa-user-plus me-2"></i>Cadastrar Novo Usuário</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <form id="form-cadastrar-usuario">
                                <div class="modal-body p-1" style="font-size: 0.80rem; max-height: 50vh; overflow-y: auto;">
                                    <div class="mb-3">
                                        <label for="novo-usuario" class="form-label">Nome de Usuário *</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-user"></i></span>
                                            <input type="text" class="form-control" id="novo-usuario" name="usuario" required placeholder="Digite o nome de usuário" autocomplete="off">
                                        </div>
                                        <div class="form-text">Mínimo 3 caracteres, apenas letras, números e underscore</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="nova-senha" class="form-label">Senha *</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                            <input type="password" class="form-control" id="nova-senha" name="senha" required placeholder="Digite a senha" autocomplete="off">
                                            <button class="btn btn-outline-secondary" type="button" id="toggle-senha"><i class="fas fa-eye"></i></button>
                                        </div>
                                        <div class="form-text">Mínimo 6 caracteres</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="confirmar-senha" class="form-label">Confirmar Senha *</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                            <input type="password" class="form-control" id="confirmar-senha" name="confirmar_senha" required placeholder="Confirme a senha" autocomplete="off">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="tipo-usuario" class="form-label">Tipo de Usuário *</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-user-tag"></i></span>
                                            <select class="form-select" id="tipo-usuario" name="tipo_de_usuario" required>
                                                <option value="">Selecione o tipo</option>
                                                <option value="administrador">Administrador</option>
                                                <option value="usuario">Usuário Comum</option>
                                                <option value="visualizador">Visualizador</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div id="erro-cadastro-usuario" class="alert alert-danger d-none"></div>
                                    <div id="sucesso-cadastro-usuario" class="alert alert-success d-none"></div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                    <button type="submit" class="btn btn-primary" id="btn-confirmar-cadastro">
                                        <span class="spinner-border spinner-border-sm d-none me-2" id="spinner-cadastro"></span>
                                        Cadastrar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal Alterar Usuário -->
                <div class="modal fade" id="modal-alterar-usuario" tabindex="-1" aria-labelledby="modalAlterarUsuarioLabel">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="modalAlterarUsuarioLabel"><i class="fas fa-user-edit me-2"></i>Alterar Usuário</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="selecionar-usuario" class="form-label">Selecionar Usuário *</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-users"></i></span>
                                        <select class="form-select" id="selecionar-usuario" required>
                                            <option value="">Carregando usuários...</option>
                                        </select>
                                    </div>
                                </div>
                                <form id="form-alterar-usuario" style="display: none;">
                                    <div class="mb-3">
                                        <label for="alterar-nova-senha" class="form-label">Nova Senha (deixe vazio para não alterar)</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                            <input type="password" class="form-control" id="alterar-nova-senha" name="nova_senha" placeholder="Digite a nova senha" autocomplete="off">
                                            <button class="btn btn-outline-secondary" type="button" id="toggle-alterar-senha"><i class="fas fa-eye"></i></button>
                                        </div>
                                        <div class="form-text">Mínimo 6 caracteres (opcional)</div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="alterar-confirmar-senha" class="form-label">Confirmar Nova Senha</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-lock"></i></span>
                                            <input type="password" class="form-control" id="alterar-confirmar-senha" name="confirmar_nova_senha" placeholder="Confirme a nova senha" autocomplete="off">
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label for="alterar-tipo-usuario" class="form-label">Tipo de Usuário</label>
                                        <div class="input-group">
                                            <span class="input-group-text"><i class="fas fa-user-tag"></i></span>
                                            <select class="form-select" id="alterar-tipo-usuario" name="novo_tipo_usuario">
                                                <option value="">Não alterar</option>
                                                <option value="administrador">Administrador</option>
                                                <option value="usuario">Usuário Comum</option>
                                                <option value="visualizador">Visualizador</option>
                                            </select>
                                        </div>
                                    </div>`
    }
