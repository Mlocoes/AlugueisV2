/**
 * Mobile UI Manager
 * Handles the creation and management of the mobile-specific user interface.
 */
class MobileUIManager {
    constructor() {
        this.isMobile = window.deviceManager && window.deviceManager.deviceType === 'mobile';
    }

    init() {
        if (!this.isMobile) {
            return;
        }
        console.log("Mobile device detected, initializing Mobile UI Manager.");
    }

    /**
     * Returns the HTML for the mobile dashboard.
     */
    getMobileDashboardHTML() {
        if (!this.isMobile) return '';

        const navItems = window.unifiedNavigator ? window.unifiedNavigator.getNavigationItems() : [];
        const dashboardNavItems = navItems.filter(item => item.id !== 'dashboard');

        const navGridHTML = dashboardNavItems.map(item => `
            <a href="#" class="nav-grid-item" data-view="${item.id}">
                <div class="nav-grid-item-icon">
                    <i class="${item.icon} fa-2x"></i>
                </div>
                <div class="nav-grid-item-label">${item.label}</div>
            </a>
        `).join('');

        const statsHTML = `
            <div class="stats-container">
                <div class="stat-item">
                    <span class="stat-value" id="mobile-stats-proprietarios">-</span>
                    <span class="stat-label">Proprietários</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="mobile-stats-imoveis">-</span>
                    <span class="stat-label">Imóveis</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value" id="mobile-stats-receita">-</span>
                    <span class="stat-label">Receita/Mês</span>
                </div>
            </div>
        `;

        return `
            <div class="mobile-dashboard">
                ${statsHTML}
                <div class="nav-grid">
                    ${navGridHTML}
                </div>
            </div>
        `;
    }

    /**
     * Loads and displays the data for the mobile dashboard stats by calling the API.
     */
    async loadDashboardData() {
        if (!this.isMobile) return;

        const proprietariosEl = document.getElementById('mobile-stats-proprietarios');
        const imoveisEl = document.getElementById('mobile-stats-imoveis');
        const receitaEl = document.getElementById('mobile-stats-receita');

        // Set loading indicators
        if (proprietariosEl) proprietariosEl.textContent = '...';
        if (imoveisEl) imoveisEl.textContent = '...';
        if (receitaEl) receitaEl.textContent = '...';

        try {
            // Use the global apiService to fetch data
            const data = await window.apiService.get('/dashboard/summary');

            if (proprietariosEl) proprietariosEl.textContent = data.total_proprietarios;
            if (imoveisEl) imoveisEl.textContent = data.total_imoveis;
            if (receitaEl) {
                // Format the currency
                receitaEl.textContent = `R$ ${data.receitas_ultimo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        } catch (error) {
            console.error("Error loading mobile dashboard data:", error);
            if (proprietariosEl) proprietariosEl.textContent = 'Erro';
            if (imoveisEl) imoveisEl.textContent = 'Erro';
            if (receitaEl) receitaEl.textContent = 'Erro';
        }
    }
}

// Instantiate the manager
window.mobileUIManager = new MobileUIManager();