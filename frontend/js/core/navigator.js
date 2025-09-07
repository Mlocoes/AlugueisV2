/**
 * Navegador Unificado Responsivo
 * Adapta la navegación según el tipo de dispositivo
 */

class UnifiedNavigator {
    constructor() {
        this.currentView = 'dashboard';
        this.isInitialized = false;
        this.navigationConfig = null;
        this.sidebarVisible = false;
    }

    /**
     * Inicializar navegación
     */
    init() {
        if (this.isInitialized) return;
        
        this.navigationConfig = window.deviceManager.getNavigationConfig();
        this.setupNavigation();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log(`📱 Navegación inicializada: ${this.navigationConfig.type}`);
    }

    /**
     * Configurar navegación según dispositivo
     */
    setupNavigation() {
        const container = document.getElementById('navigation-container');
        if (!container) return;

        switch (this.navigationConfig.type) {
            case 'bottom-nav':
                this.createBottomNavigation(container);
                break;
            case 'side-nav':
                this.createSideNavigation(container);
                break;
            default:
                this.createSideNavigation(container);
        }
    }

    /**
     * Crear navegación lateral
     */
    createSideNavigation(container) {
        const navItems = this.getNavigationItems();
        
        const sidebarHTML = `
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h5 class="mb-0">
                        <i class="fas fa-home me-2"></i>
                        Sistema Aluguéis
                    </h5>
                    <div class="d-mobile-none">
                        <small class="text-light opacity-75">Gestão Imobiliária</small>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    ${navItems.map(item => this.createNavItem(item)).join('')}
                </nav>
                <div class="sidebar-footer d-mobile-none">
                    <div class="user-info p-3 border-top border-light border-opacity-25">
                        <small class="text-light opacity-75" id="user-display">
                            <i class="fas fa-user me-1"></i>
                            Carregando...
                        </small>
                    </div>
                </div>
            </div>
            <div class="mobile-overlay" id="mobile-overlay"></div>
        `;
        
        container.innerHTML = sidebarHTML;
    }

    /**
     * Criar navegação inferior (móvil)
     */
    createBottomNavigation(container) {
        const navItems = this.getNavigationItems().slice(0, this.navigationConfig.maxItems);
        
        const bottomNavHTML = `
            <div class="bottom-nav" id="bottom-nav">
                <div class="bottom-nav-items">
                    ${navItems.map(item => this.createBottomNavItem(item)).join('')}
                </div>
            </div>
        `;
        
        // Para móvil, también creamos un sidebar colapsable
        const sidebarHTML = `
            <div class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">
                            <i class="fas fa-home me-2"></i>
                            Sistema Aluguéis
                        </h5>
                        <button class="btn btn-link text-white p-0" id="close-sidebar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <nav class="sidebar-nav">
                    ${this.getNavigationItems().map(item => this.createNavItem(item)).join('')}
                </nav>
            </div>
            <div class="mobile-overlay" id="mobile-overlay"></div>
        `;
        
        container.innerHTML = sidebarHTML + bottomNavHTML;
    }

    /**
     * Obtener elementos de navegación
     */
    getNavigationItems() {
        const allItems = [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: 'fas fa-tachometer-alt',
                permission: 'all'
            },
            {
                id: 'proprietarios',
                label: 'Proprietários',
                icon: 'fas fa-users',
                permission: 'all'
            },
            {
                id: 'imoveis',
                label: 'Imóveis',
                icon: 'fas fa-building',
                permission: 'all'
            },
            {
                id: 'participacoes',
                label: 'Participações',
                icon: 'fas fa-percentage',
                permission: 'all'
            },
            {
                id: 'alugueis',
                label: 'Aluguéis',
                icon: 'fas fa-handshake',
                permission: 'all'
            },
            {
                id: 'relatorios',
                label: 'Relatórios',
                icon: 'fas fa-chart-bar',
                permission: 'all'
            },
            {
                id: 'extras',
                label: 'Extras',
                icon: 'fas fa-cogs',
                permission: 'admin'
            },
            {
                id: 'importar',
                label: 'Importar',
                icon: 'fas fa-file-import',
                permission: 'all'
            }
        ];

        // Filtrar según permisos del usuario
        const userType = this.getUserType();
        return allItems.filter(item => 
            item.permission === 'all' || 
            (item.permission === 'admin' && userType === 'administrador')
        );
    }

    /**
     * Crear item de navegación lateral
     */
    createNavItem(item) {
        return `
            <button class="nav-item" data-view="${item.id}" id="nav-${item.id}">
                <i class="${item.icon}"></i>
                <span class="nav-label">${item.label}</span>
            </button>
        `;
    }

    /**
     * Crear item de navegación inferior
     */
    createBottomNavItem(item) {
        const showLabel = this.navigationConfig.showLabels;
        return `
            <button class="bottom-nav-item" data-view="${item.id}" id="bottom-nav-${item.id}">
                <i class="${item.icon}"></i>
                ${showLabel ? `<span>${item.label}</span>` : ''}
            </button>
        `;
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Navegación
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('[data-view]');
            if (navItem) {
                const view = navItem.dataset.view;
                this.navigateTo(view);
            }

            // Cerrar sidebar en móvil
            const closeSidebar = e.target.closest('#close-sidebar');
            if (closeSidebar) {
                this.hideSidebar();
            }

            // Overlay click
            const overlay = e.target.closest('#mobile-overlay');
            if (overlay) {
                this.hideSidebar();
            }
        });

        // Botón de menú hamburguesa
        const menuButton = document.getElementById('menu-toggle');
        if (menuButton) {
            menuButton.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Escape key para cerrar sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebarVisible) {
                this.hideSidebar();
            }
        });

        // Cambio de dispositivo
        window.addEventListener('deviceChange', (e) => {
            console.log('📱 Dispositivo cambió, reconfigurangi navegación...');
            this.navigationConfig = window.deviceManager.getNavigationConfig();
            this.setupNavigation();
        });
    }

    /**
     * Navegar a una vista
     */
    navigateTo(view) {
        console.log(`📱 Navegando a: ${view}`);
        
        // Actualizar estado actual
        this.currentView = view;
        
        // Actualizar elementos activos
        this.updateActiveStates(view);
        
        // Ocultar sidebar en móvil después de navegar
        if (window.deviceManager.deviceType === 'mobile') {
            this.hideSidebar();
        }
        
        // Disparar evento de navegación
        window.dispatchEvent(new CustomEvent('navigate', {
            detail: { view, previousView: this.currentView }
        }));
        
        // Actualizar URL sin recargar página
        this.updateURL(view);
    }

    /**
     * Actualizar estados activos de navegación
     */
    updateActiveStates(activeView) {
        // Limpiar estados activos
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Activar elementos correspondientes
        const sideNavItem = document.getElementById(`nav-${activeView}`);
        const bottomNavItem = document.getElementById(`bottom-nav-${activeView}`);
        
        if (sideNavItem) sideNavItem.classList.add('active');
        if (bottomNavItem) bottomNavItem.classList.add('active');
    }

    /**
     * Mostrar/ocultar sidebar
     */
    toggleSidebar() {
        if (this.sidebarVisible) {
            this.hideSidebar();
        } else {
            this.showSidebar();
        }
    }

    /**
     * Mostrar sidebar
     */
    showSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        
        if (sidebar) {
            sidebar.classList.add('show');
            this.sidebarVisible = true;
        }
        
        if (overlay) {
            overlay.classList.add('show');
        }
        
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
    }

    /**
     * Ocultar sidebar
     */
    hideSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        
        if (sidebar) {
            sidebar.classList.remove('show');
            this.sidebarVisible = false;
        }
        
        if (overlay) {
            overlay.classList.remove('show');
        }
        
        // Restaurar scroll del body
        document.body.style.overflow = '';
    }

    /**
     * Actualizar URL
     */
    updateURL(view) {
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.pushState({ view }, '', url);
    }

    /**
     * Obtener vista desde URL
     */
    getViewFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('view') || 'dashboard';
    }

    /**
     * Obtener tipo de usuario
     */
    getUserType() {
        try {
            const userDataString = localStorage.getItem('userData');
            if (!userDataString || userDataString === 'undefined' || userDataString === 'null') {
                return 'usuario';
            }
            const userData = JSON.parse(userDataString);
            return userData.tipo || 'usuario';
        } catch (error) {
            console.warn('⚠️ Error parsing userData from localStorage:', error);
            return 'usuario';
        }
    }

    /**
     * Actualizar información del usuario en la navegación
     */
    updateUserInfo(userData) {
        const userDisplay = document.getElementById('user-display');
        if (userDisplay && userData) {
            userDisplay.innerHTML = `
                <i class="fas fa-user me-1"></i>
                ${SecurityUtils.escapeHtml(userData.usuario)} (${SecurityUtils.escapeHtml(userData.tipo)})
            `;
        }
    }

    /**
     * Obtener vista actual
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Verificar si está en móvil
     */
    isMobile() {
        return window.deviceManager.deviceType === 'mobile';
    }
}

// Crear instancia global
window.unifiedNavigator = new UnifiedNavigator();
