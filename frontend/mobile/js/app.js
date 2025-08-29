/**
 * Aplicação Principal - Versão Móvil
 * Sistema de Alquileres V2
 */

// Elementos da interface
const elements = {
    loadingScreen: document.getElementById('loadingScreen'),
    loginScreen: document.getElementById('loginScreen'),
    appScreen: document.getElementById('appScreen'),
    loginForm: document.getElementById('loginForm'),
    loginAlert: document.getElementById('loginAlert'),
    userNameDisplay: document.getElementById('userNameDisplay'),
    alertContainer: document.getElementById('alertContainer')
};

// Estado da aplicação
let currentView = 'dashboard';

/**
 * Inicializar aplicação
 */
async function initApp() {
    console.log('📱 Iniciando aplicação móvil...');

    try {
        // Verificar se há dados salvos
        if (window.mobileAuth.loadFromStorage()) {
            console.log('📱 Dados encontrados no storage');

            // Validar token
            const isValid = await window.mobileAuth.validateToken();
            if (isValid) {
                console.log('📱 Token válido, entrando na aplicação');
                showApp();
                return;
            }
        }

        console.log('📱 Nenhum dado válido encontrado, mostrando login');
        showLogin();

    } catch (error) {
        console.error('Erro ao inicializar:', error);
        showAlert('Erro ao inicializar aplicação', 'error');
        showLogin();
    }
}

/**
 * Mostrar tela de login
 */
function showLogin() {
    elements.loadingScreen.style.display = 'none';
    elements.appScreen.style.display = 'none';
    elements.loginScreen.style.display = 'flex';
}

/**
 * Mostrar aplicação principal
 */
function showApp() {
    elements.loadingScreen.style.display = 'none';
    elements.loginScreen.style.display = 'none';
    elements.appScreen.style.display = 'block';

    // Atualizar nome do usuário
    const userData = window.mobileAuth.getUserData();
    elements.userNameDisplay.textContent = userData.usuario || 'Usuário';


    // Mostrar dashboard
    showView('dashboard');
}

/**
 * Mostrar loading
 */
function showLoading(show = true) {
    if (show) {
        elements.loadingScreen.style.display = 'flex';
    } else {
        elements.loadingScreen.style.display = 'none';
    }
}

/**
 * Mostrar alert
 */
function showAlert(message, type = 'info', duration = 5000) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${getBootstrapAlertClass(type)} alert-mobile`;
    alertElement.innerHTML = `
        <i class="bi ${getAlertIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;

    elements.alertContainer.appendChild(alertElement);

    // Auto-remover após duração especificada
    setTimeout(() => {
        if (alertElement.parentElement) {
            alertElement.remove();
        }
    }, duration);
}

/**
 * Obter classe Bootstrap para alert
 */
function getBootstrapAlertClass(type) {
    const classes = {
        success: 'success',
        error: 'danger',
        warning: 'warning',
        info: 'info'
    };
    return classes[type] || 'info';
}

/**
 * Obter ícone para alert
 */
function getAlertIcon(type) {
    const icons = {
        success: 'bi-check-circle',
        error: 'bi-exclamation-triangle',
        warning: 'bi-exclamation-diamond',
        info: 'bi-info-circle'
    };
    return icons[type] || 'bi-info-circle';
}

/**
 * Processar login
 */
async function handleLogin(event) {
    event.preventDefault();
    console.log('[LOGIN] handleLogin called, event:', event);

    // Obtener los campos justo antes de acceder a .value
    const usuarioInput = document.getElementById('username');
    const senhaInput = document.getElementById('password');
    console.log('[LOGIN] usuarioInput:', usuarioInput);
    console.log('[LOGIN] senhaInput:', senhaInput);
    let usuario = '';
    let senha = '';

    if (!usuarioInput || !senhaInput) {
        console.error('[LOGIN] Algún campo es null:', { usuarioInput, senhaInput });
        showLoginAlert('Campos de login não encontrados', 'error');
        return;
    }

    console.log('[LOGIN] usuarioInput.value:', usuarioInput.value);
    console.log('[LOGIN] senhaInput.value:', senhaInput.value);
    usuario = usuarioInput.value ? usuarioInput.value.trim() : '';
    senha = senhaInput.value ? senhaInput.value : '';

    if (!usuario || !senha) {
        showLoginAlert('Por favor, preencha todos os campos', 'error');
        return;
    }

    try {
        const result = await window.mobileAuth.login(usuario, senha);

        if (result.success) {
            showLoginAlert('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                showApp();
            }, 1000);
        } else {
            showLoginAlert(result.error || 'Erro no login', 'error');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showLoginAlert('Erro de conexão', 'error');
    }
}

/**
 * Mostrar alert no login
 */
function showLoginAlert(message, type) {
    elements.loginAlert.className = `alert alert-${getBootstrapAlertClass(type)}`;
    elements.loginAlert.innerHTML = `
        <i class="bi ${getAlertIcon(type)} me-2"></i>
        ${message}
    `;
    elements.loginAlert.style.display = 'block';

    setTimeout(() => {
        elements.loginAlert.style.display = 'none';
    }, 5000);
}

/**
 * Fazer logout
 */
function logout() {
    if (confirm('Deseja realmente sair?')) {
        window.mobileAuth.logout();
    }
}

/**
 * Mostrar view específica
 */
function showView(viewName) {
    // Esconder todas as views
    const views = ['dashboardView', 'proprietariosView', 'imoveisView', 'alugueisView', 'participacoesView'];
    views.forEach(view => {
        const element = document.getElementById(view);
        if (element) {
            element.style.display = 'none';
        }
    });

    // Mostrar view solicitada
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) {
        targetView.style.display = 'block';
    }

    // Atualizar navegação inferior
    updateBottomNav(viewName);

    // Atualizar view atual
    currentView = viewName;

    // Carregar dados se necessário
    loadViewData(viewName);
}/**
 * Atualizar navegação inferior
 */
function updateBottomNav(activeView) {
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    // Mapear views para navegação
    const viewToNav = {
        dashboard: 0,
        proprietarios: 1,
        imoveis: 2,
        alugueis: 3,
        participacoes: 4
    };

    const activeIndex = viewToNav[activeView];
    if (activeIndex !== undefined && navItems[activeIndex]) {
        navItems[activeIndex].classList.add('active');
    }
}

/**
 * Carregar dados da view
 */
async function loadViewData(viewName) {
    try {
        switch (viewName) {
            case 'dashboard':
                await loadDashboardSummary();
                break;
            case 'proprietarios':
                await loadProprietarios();
                break;
            case 'imoveis':
                await loadImoveis();
                break;
            case 'alugueis':
                await loadAlugueis();
                break;
            case 'participacoes':
                await loadParticipacoes();
                break;
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
}
// Função para carregar e mostrar os dados do Dashboard
async function loadDashboardSummary() {
    try {
        showLoading(true);
        // Buscar dados agregados das APIs
        const [proprietariosResp, imoveisResp, alugueisResp] = await Promise.all([
            window.mobileApi.getProprietarios(),
            window.mobileApi.getImoveis(),
            window.mobileApi.getAlugueis()
        ]);

        // Proprietários
        let proprietarios = Array.isArray(proprietariosResp) ? proprietariosResp : (proprietariosResp?.data || []);
        document.getElementById('dashboardProprietarios').textContent = proprietarios.length;

        // Imóveis
        let imoveis = Array.isArray(imoveisResp) ? imoveisResp : (imoveisResp?.data || []);
        document.getElementById('dashboardImoveis').textContent = imoveis.length;

        // Aluguel total do último mês disponível
        let alugueis = Array.isArray(alugueisResp) ? alugueisResp : (alugueisResp?.data || []);
        // Normalizar mes/ano para número
        alugueis.forEach(a => {
            a.mes = Number(a.mes);
            a.ano = Number(a.ano);
            a.valor_aluguel_proprietario = Number(a.valor_aluguel_proprietario || 0);
        });
        // Encontrar todos los meses/años únicos presentes
        let mesesAnosUnicos = [];
        alugueis.forEach(a => {
            if (!mesesAnosUnicos.some(m => m.mes === a.mes && m.ano === a.ano)) {
                mesesAnosUnicos.push({ mes: a.mes, ano: a.ano });
            }
        });
        // Ordenar de más reciente a más antiguo
        mesesAnosUnicos.sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);
        let ultimo = mesesAnosUnicos.length > 0 ? mesesAnosUnicos[0] : { mes: null, ano: null };
        let penultimo = mesesAnosUnicos.length > 1 ? mesesAnosUnicos[1] : { mes: null, ano: null };

        // Total do último mês
        let totalUltimo = alugueis.filter(a => a.mes === ultimo.mes && a.ano === ultimo.ano)
            .reduce((sum, a) => sum + a.valor_aluguel_proprietario, 0);
        document.getElementById('dashboardAluguelTotal').textContent = formatMoney(totalUltimo);

        // Total do mês anterior
        let totalPenultimo = alugueis.filter(a => a.mes === penultimo.mes && a.ano === penultimo.ano)
            .reduce((sum, a) => sum + a.valor_aluguel_proprietario, 0);

        // Variação
        let variacao = 0;
        if (totalPenultimo > 0) {
            variacao = ((totalUltimo - totalPenultimo) / totalPenultimo) * 100;
        }
        document.getElementById('dashboardVariacao').textContent = `${variacao.toFixed(2)}%`;
    } catch (error) {
        showAlert('Erro ao carregar dados do dashboard', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    // Configurar form de login y campos de forma robusta
    const loginForm = document.getElementById('loginForm');
    const usuarioInput = document.getElementById('username');
    const senhaInput = document.getElementById('password');
    if (loginForm && usuarioInput && senhaInput) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.warn('⚠️ Formulário de login o campos não encontrados no DOM.');
    }

    // Configurar navegação inferior
    const navItems = document.querySelectorAll('.bottom-nav-item');
    navItems.forEach((item, index) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const views = ['dashboard', 'proprietarios', 'imoveis', 'alugueis', 'participacoes'];
            if (views[index]) {
                showView(views[index]);
            }
        });
    });

    // Inicializar aplicação
    initApp();
});

/**
 * Funções de utilidade para PWA
 */
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('📱 PWA install prompt available');
});

// Registrar service worker se disponível
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('📱 SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('📱 SW registration failed: ', registrationError);
            });
    });
}
