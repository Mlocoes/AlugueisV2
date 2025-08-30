/**
 * Gerenciamento de Views - Versão Móvil
 * Sistema de Alquileres V2
 */

/**
 * Carregar e mostrar proprietários
 */
async function loadProprietarios() {
    try {
        showLoading(true);
        const response = await window.mobileApi.getProprietarios();

        console.log('📊 Resposta da API proprietários:', response);

        // Verificar se a resposta tem a estrutura esperada
        let proprietarios;
        if (Array.isArray(response)) {
            proprietarios = response;
        } else if (response && Array.isArray(response.data)) {
            proprietarios = response.data;
        } else if (response && response.proprietarios && Array.isArray(response.proprietarios)) {
            proprietarios = response.proprietarios;
        } else {
            console.warn('Resposta da API não é um array:', response);
            proprietarios = [];
        }

        displayProprietarios(proprietarios);
    } catch (error) {
        console.error('Erro ao carregar proprietários:', error);
        showAlert('Erro ao carregar proprietários', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Mostrar lista de proprietários
 */
function displayProprietarios(proprietarios) {
    const container = document.getElementById('proprietariosList');
    const userData = window.mobileAuth.getUserData();
    const isAdmin = userData.tipo === 'admin';

    // Verificar se proprietarios é um array válido
    if (!Array.isArray(proprietarios) || proprietarios.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-people display-4"></i>
                <p class="mt-2">Nenhum proprietário encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = proprietarios.map(prop => `
        <div class="table-mobile-row">
            <div class="row-header">
                <i class="bi bi-person me-2"></i>${prop.nome_completo || prop.nome || 'Nome não informado'}
            </div>
            <div class="row-data">
                <strong>Email:</strong> ${prop.email || 'Não informado'}
            </div>
            <div class="row-data">
                <strong>Telefone:</strong> ${prop.telefone || 'Não informado'}
            </div>
            <div class="row-data">
                <strong>Documento:</strong> ${prop.documento || 'Não informado'}
            </div>
            <div class="row-data">
                <strong>Banco:</strong> ${prop.banco || 'Não informado'} 
                ${prop.agencia ? `- Ag: ${prop.agencia}` : ''}
            </div>
            <div class="mt-2">
                ${isAdmin ? `
                <button class="btn btn-sm btn-primary me-2" onclick="editProprietario(${prop.id})">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProprietario(${prop.id}, '${prop.nome}')">
                    <i class="bi bi-trash"></i> Excluir
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Carregar e mostrar imóveis
 */
async function loadImoveis() {
    try {
        showLoading(true);
        const response = await window.mobileApi.getImoveis();

        console.log('📊 Resposta da API imóveis:', response);

        // Verificar se a resposta tem a estrutura esperada
        let imoveis;
        if (Array.isArray(response)) {
            imoveis = response;
        } else if (response && Array.isArray(response.data)) {
            imoveis = response.data;
        } else if (response && response.imoveis && Array.isArray(response.imoveis)) {
            imoveis = response.imoveis;
        } else {
            console.warn('Resposta da API não é um array:', response);
            imoveis = [];
        }

        displayImoveis(imoveis);
    } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        showAlert('Erro ao carregar imóveis', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Mostrar lista de imóveis
 */
function displayImoveis(imoveis) {
    const container = document.getElementById('imoveisList');
    const userData = window.mobileAuth.getUserData();
    const isAdmin = userData.tipo === 'admin';

    // Verificar se imoveis é um array válido
    if (!Array.isArray(imoveis) || imoveis.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-buildings display-4"></i>
                <p class="mt-2">Nenhum imóvel encontrado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = imoveis.map(imovel => `
        <div class="table-mobile-row">
            <div class="row-header">
                <i class="bi bi-building me-2"></i>${imovel.nome || 'Nome não informado'}
            </div>
            <div class="row-data">
                <strong>Endereço:</strong> ${imovel.endereco || 'Não informado'}
            </div>
            <div class="row-data">
                <strong>Tipo:</strong> ${imovel.tipo_imovel || 'Não informado'}
            </div>
            <div class="row-data">
                <strong>Valor Cadastral:</strong> ${formatMoney(imovel.valor_cadastral || 0)}
            </div>
            <div class="row-data">
                <strong>Alugado:</strong> 
                <span class="badge ${(imovel.ativo === true ? 'bg-success' : 'bg-secondary')}">
                    ${(imovel.ativo === true ? 'Sim' : 'Não')}
                </span>
            </div>
            <div class="mt-2">
                ${isAdmin ? `
                <button class="btn btn-sm btn-primary me-2" onclick="editImovel(${imovel.id})">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteImovel(${imovel.id}, '${imovel.endereco}')">
                    <i class="bi bi-trash"></i> Excluir
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Carregar e mostrar aluguéis
 */
async function loadAlugueis() {
    try {
        showLoading(true);
        const response = await window.mobileApi.getAlugueis();

        console.log('📊 Resposta da API aluguéis:', response);

        // Verificar se a resposta tem a estrutura esperada
        let alugueis;
        if (Array.isArray(response)) {
            alugueis = response;
        } else if (response && Array.isArray(response.data)) {
            alugueis = response.data;
        } else if (response && response.alugueis && Array.isArray(response.alugueis)) {
            alugueis = response.alugueis;
        } else {
            console.warn('Resposta da API não é um array:', response);
            alugueis = [];
        }

        displayAlugueis(alugueis);
    } catch (error) {
        console.error('Erro ao carregar aluguéis:', error);
        showAlert('Erro ao carregar aluguéis', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Mostrar lista de aluguéis
 */
function displayAlugueis(alugueis) {
    const container = document.getElementById('alugueisList');
    const userData = window.mobileAuth.getUserData();
    const isAdmin = userData.tipo === 'admin';

    // Guardar todos los datos en variable global para filtros
    window.alugueisRaw = alugueis;

    // Obtener años y meses únicos
    const filtroAno = document.getElementById('filtroAno');
    const filtroMes = document.getElementById('filtroMes');
    let anos = [];
    let meses = [];
    if (window.alugueisRaw && window.alugueisRaw.length) {
        anos = [...new Set(window.alugueisRaw.map(a => Number(a.ano)).filter(Boolean))].sort((a, b) => b - a);
        meses = [...new Set(window.alugueisRaw.map(a => Number(a.mes)).filter(Boolean))].sort((a, b) => b - a);
    }

    // Poblar combos solo si están vacíos
    if (filtroAno && filtroAno.options.length <= 1) {
        filtroAno.innerHTML = anos.map(ano => `<option value="${ano}">${ano}</option>`).join('');
        if (anos.length) filtroAno.value = anos[0];
    }
    if (filtroMes && filtroMes.options.length <= 1) {
        filtroMes.innerHTML = meses.map(mes => `<option value="${mes}">${mes}</option>`).join('');
        if (meses.length) filtroMes.value = meses[0];
    }

    // Asignar eventos solo una vez
    if (filtroAno && !filtroAno.dataset.listener) {
        filtroAno.addEventListener('change', () => renderAlugueisFiltrados());
        filtroAno.dataset.listener = 'true';
    }
    if (filtroMes && !filtroMes.dataset.listener) {
        filtroMes.addEventListener('change', () => renderAlugueisFiltrados());
        filtroMes.dataset.listener = 'true';
    }

    // Renderizar lista filtrada
    function renderAlugueisFiltrados() {
        let anoSel = filtroAno ? Number(filtroAno.value) : null;
        let mesSel = filtroMes ? Number(filtroMes.value) : null;
        let filtrados = window.alugueisRaw.filter(a => {
            return (!anoSel || Number(a.ano) === anoSel) && (!mesSel || Number(a.mes) === mesSel);
        });

        if (!filtrados || !Array.isArray(filtrados) || filtrados.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-receipt display-4"></i>
                    <p class="mt-2">Nenhum aluguel encontrado</p>
                </div>
            `;
            return;
        }

        // Agrupar por proprietário, mes y ano
        const agrupado = {};
        filtrados.forEach(a => {
            if (!a.nome_proprietario) return;
            const key = `${a.nome_proprietario}|${a.mes}|${a.ano}`;
            if (!agrupado[key]) {
                agrupado[key] = {
                    nome_proprietario: a.nome_proprietario,
                    mes: a.mes,
                    ano: a.ano,
                    total: 0,
                    imoveis: []
                };
            }
            agrupado[key].total += Number(a.valor_liquido_proprietario);
            agrupado[key].imoveis.push({
                nome_imovel: a.nome_imovel,
                valor: a.valor_liquido_proprietario
            });
        });

        // Renderizar agrupado por propietario
        container.innerHTML = Object.values(agrupado).map(grupo => `
            <div class="table-mobile-row mb-4">
                <div class="row-header d-flex align-items-center">
                    <i class="bi bi-person me-2"></i>
                    <span class="fw-bold">${grupo.nome_proprietario}</span>
                </div>
                <div class="row-data">
                    <strong>Total Mensal:</strong> <span class="text-success">${formatMoney(grupo.total)}</span>
                </div>
                <div class="row-data">
                    <strong>Período:</strong> ${grupo.mes || 'N/A'}/${grupo.ano || 'N/A'}
                </div>
                <div class="row-data">
                    <strong>Imóveis:</strong>
                    <ul class="list-unstyled mb-0 ms-3">
                        ${grupo.imoveis.map(imovel => `
                            <li class="mb-1">
                                <i class="bi bi-building me-1"></i>
                                <span class="fw-normal">${imovel.nome_imovel}</span>: 
                                <span class="text-primary">${formatMoney(imovel.valor)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
    }

    // Render inicial
    renderAlugueisFiltrados();
}

/**
 * Carregar e mostrar participações
 */
async function loadParticipacoes() {
    try {
        showLoading(true);

        // Carregar participações, proprietários e imóveis em paralelo
        const [participacoesResponse, proprietariosResponse, imoveisResponse] = await Promise.all([
            window.mobileApi.getParticipacoes(),
            window.mobileApi.getProprietarios(),
            window.mobileApi.getImoveis()
        ]);

        console.log('📊 Resposta da API participações:', participacoesResponse);

        // Processar participações
        let participacoes;
        if (Array.isArray(participacoesResponse)) {
            participacoes = participacoesResponse;
        } else if (participacoesResponse && Array.isArray(participacoesResponse.data)) {
            participacoes = participacoesResponse.data;
        } else {
            console.warn('Resposta da API não é um array:', participacoesResponse);
            participacoes = [];
        }

        // Processar proprietários
        let proprietarios;
        if (Array.isArray(proprietariosResponse)) {
            proprietarios = proprietariosResponse;
        } else if (proprietariosResponse && Array.isArray(proprietariosResponse.data)) {
            proprietarios = proprietariosResponse.data;
        } else {
            proprietarios = [];
        }

        // Processar imóveis  
        let imoveis;
        if (Array.isArray(imoveisResponse)) {
            imoveis = imoveisResponse;
        } else if (imoveisResponse && Array.isArray(imoveisResponse.data)) {
            imoveis = imoveisResponse.data;
        } else {
            imoveis = [];
        }

        // Criar mapas para facilitar lookup
        const proprietariosMap = new Map();
        proprietarios.forEach(prop => {
            proprietariosMap.set(prop.id, prop);
        });

        const imoveisMap = new Map();
        imoveis.forEach(imovel => {
            imoveisMap.set(imovel.id, imovel);
        });

        displayParticipacoes(participacoes, proprietariosMap, imoveisMap);
    } catch (error) {
        console.error('Erro ao carregar participações:', error);
        showAlert('Erro ao carregar participações', 'error');
    } finally {
        showLoading(false);
    }
}/**
 * Mostrar lista de participações
 */
function displayParticipacoes(participacoes, proprietariosMap, imoveisMap) {
    const container = document.getElementById('participacoesList');

    if (!participacoes || !Array.isArray(participacoes) || participacoes.length === 0) {
        console.warn('Dados de participações inválidos ou vazios:', participacoes);
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-pie-chart display-4"></i>
                <p class="mt-2">Nenhuma participação encontrada</p>
            </div>
        `;
        return;
    }

    // Agrupar participações por imóvel
    const participacoesPorImovel = {};
    participacoes.forEach(participacao => {
        const imovelId = participacao.imovel_id;
        if (!participacoesPorImovel[imovelId]) {
            participacoesPorImovel[imovelId] = [];
        }
        participacoesPorImovel[imovelId].push(participacao);
    });

    const userData = window.mobileAuth.getUserData();
    const isAdmin = userData.tipo === 'admin';

    // Crear combo de filtro de imóveis
    let imoveisOptions = '<option value="">Todos os imóveis</option>';
    imoveisMap.forEach((imovel, id) => {
        imoveisOptions += `<option value="${id}">${imovel.endereco}</option>`;
    });

    // Insertar combo si no existe
    let filtroImovel = document.getElementById('filtroImovel');
    if (!filtroImovel) {
        filtroImovel = document.createElement('select');
        filtroImovel.id = 'filtroImovel';
        filtroImovel.className = 'form-select mb-3';
        filtroImovel.innerHTML = imoveisOptions;
        container.parentNode.insertBefore(filtroImovel, container);
    } else {
        filtroImovel.innerHTML = imoveisOptions;
    }

    // Evento de filtro
    filtroImovel.onchange = function () {
        renderParticipacoesFiltradas();
    };

    function renderParticipacoesFiltradas() {
        const imovelFiltrado = filtroImovel.value;
        let imovelIds = Object.keys(participacoesPorImovel);
        if (imovelFiltrado) {
            imovelIds = [imovelFiltrado];
        }
        container.innerHTML = imovelIds.map(imovelId => {
            const participacoesImovel = participacoesPorImovel[imovelId];
            const totalPorcentagem = participacoesImovel.reduce((sum, p) => sum + p.porcentagem, 0);
            const imovel = imoveisMap && imoveisMap.get(parseInt(imovelId));
            const nomeImovel = imovel ? imovel.endereco : `Imóvel ID: ${imovelId}`;
            return `
                <div class="table-mobile-row mb-2">
                    <div class="row-header">
                        <i class="bi bi-building me-2"></i>${nomeImovel}
                        <span class="badge bg-secondary ms-2">Total ${Math.round(totalPorcentagem)}%</span>
                    </div>
                    <ul class="list-group list-group-flush">
                        ${participacoesImovel.map(participacao => {
                const proprietario = proprietariosMap && proprietariosMap.get(participacao.proprietario_id);
                const nomeProprietario = proprietario ? proprietario.nome : `Proprietário ID: ${participacao.proprietario_id}`;
                return `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <span>${nomeProprietario}</span>
                                    <span class="badge bg-primary">${participacao.porcentagem}%</span>
                                </li>
                            `;
            }).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    // Render inicial
    renderParticipacoesFiltradas();
}

/**
 * Funções de CRUD - Proprietários
 */
async function addProprietario() {
    const nome = prompt('Nome do proprietário:');
    const email = prompt('Email:');
    const telefone = prompt('Telefone:');
    const cpf_cnpj = prompt('CPF/CNPJ:');

    if (!nome) {
        showAlert('Nome é obrigatório', 'warning');
        return;
    }

    try {
        await window.mobileApi.createProprietario({
            nome,
            email: email || null,
            telefone: telefone || null,
            cpf_cnpj: cpf_cnpj || null
        });

        showAlert('Proprietário criado com sucesso!', 'success');
        await loadProprietarios();
    } catch (error) {
        showAlert('Erro ao criar proprietário', 'error');
    }
}

async function editProprietario(id) {
    showAlert('Funcionalidade em desenvolvimento', 'info');
}

async function deleteProprietario(id, nome) {
    if (!confirm(`Deseja realmente excluir o proprietário ${nome}?`)) {
        return;
    }

    try {
        await window.mobileApi.deleteProprietario(id);
        showAlert('Proprietário excluído com sucesso!', 'success');
        await loadProprietarios();
    } catch (error) {
        showAlert('Erro ao excluir proprietário', 'error');
    }
}

async function refreshProprietarios() {
    await loadProprietarios();
    showAlert('Lista atualizada!', 'success');
}

/**
 * Funções de CRUD - Imóveis
 */
async function addImovel() {
    showAlert('Funcionalidade em desenvolvimento', 'info');
}

async function editImovel(id) {
    showAlert('Funcionalidade em desenvolvimento', 'info');
}

async function deleteImovel(id, endereco) {
    if (!confirm(`Deseja realmente excluir o imóvel ${endereco}?`)) {
        return;
    }

    try {
        await window.mobileApi.deleteImovel(id);
        showAlert('Imóvel excluído com sucesso!', 'success');
        await loadImoveis();
    } catch (error) {
        showAlert('Erro ao excluir imóvel', 'error');
    }
}

async function refreshImoveis() {
    await loadImoveis();
    showAlert('Lista atualizada!', 'success');
}

/**
 * Funções de CRUD - Aluguéis
 */
async function addAluguel() {
    showAlert('Funcionalidade em desenvolvimento', 'info');
}

async function editAluguel(id) {
    showAlert('Funcionalidade em desenvolvimento', 'info');
}

async function deleteAluguel(id) {
    if (!confirm('Deseja realmente excluir este aluguel?')) {
        return;
    }

    try {
        await window.mobileApi.deleteAluguel(id);
        showAlert('Aluguel excluído com sucesso!', 'success');
        await loadAlugueis();
    } catch (error) {
        showAlert('Erro ao excluir aluguel', 'error');
    }
}

async function refreshAlugueis() {
    await loadAlugueis();
    showAlert('Lista atualizada!', 'success');
}

async function refreshParticipacoes() {
    await loadParticipacoes();
    showAlert('Participações atualizadas!', 'success');
}

/**
 * Funções de Relatórios
 */
async function generateReport(type) {
    showAlert('Funcionalidade de relatórios em desenvolvimento', 'info');
}

/**
 * Funções utilitárias
 */
function formatMoney(value) {
    if (!value) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return 'Não informado';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        return 'Data inválida';
    }
}

function getStatusBadgeClass(status) {
    const classes = {
        'ativo': 'bg-success',
        'inativo': 'bg-secondary',
        'vencido': 'bg-danger',
        'disponivel': 'bg-success',
        'ocupado': 'bg-warning',
        'manutencao': 'bg-info'
    };
    return classes[status] || 'bg-secondary';
}

/**
 * Funções de CRUD - Participações
 */
async function addParticipacao() {
    try {
        // Carregar proprietários e imóveis para os selects
        const [proprietariosResult, imoveisResult] = await Promise.all([
            window.mobileApi.getProprietarios(),
            window.mobileApi.getImoveis()
        ]);

        const proprietarios = proprietariosResult.data || [];
        const imoveis = imoveisResult.data || [];

        if (proprietarios.length === 0) {
            showAlert('Não há proprietários cadastrados. Cadastre um proprietário primeiro.', 'warning');
            return;
        }

        if (imoveis.length === 0) {
            showAlert('Não há imóveis cadastrados. Cadastre um imóvel primeiro.', 'warning');
            return;
        }

        // Criar opções para os selects
        const proprietarioOptions = proprietarios.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
        const imovelOptions = imoveis.map(i => `<option value="${i.id}">${i.endereco}</option>`).join('');

        // Criar formulário modal
        const formHtml = `
            <div class="modal fade" id="participacaoModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nova Participação</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="participacaoForm">
                                <div class="mb-3">
                                    <label class="form-label">Proprietário:</label>
                                    <select class="form-select" id="proprietario_id" required>
                                        <option value="">Selecione um proprietário</option>
                                        ${proprietarioOptions}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Imóvel:</label>
                                    <select class="form-select" id="imovel_id" required>
                                        <option value="">Selecione um imóvel</option>
                                        ${imovelOptions}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Porcentagem (%):</label>
                                    <input type="number" class="form-control" id="porcentagem" step="0.01" min="0" max="100" required>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="ativo" checked>
                                        <label class="form-check-label" for="ativo">Ativo</label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="saveParticipacao()">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adicionar modal ao DOM
        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('participacaoModal'));
        modal.show();

        // Remover modal quando fechado
        document.getElementById('participacaoModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });

    } catch (error) {
        console.error('Erro ao carregar dados para nova participação:', error);
        showAlert('Erro ao carregar dados', 'error');
    }
}

async function saveParticipacao() {
    const form = document.getElementById('participacaoForm');
    const formData = new FormData(form);

    const proprietario_id = parseInt(document.getElementById('proprietario_id').value);
    const imovel_id = parseInt(document.getElementById('imovel_id').value);
    const porcentagem = parseFloat(document.getElementById('porcentagem').value);
    const ativo = document.getElementById('ativo').checked;

    if (!proprietario_id || !imovel_id || !porcentagem) {
        showAlert('Por favor, preencha todos os campos obrigatórios', 'warning');
        return;
    }

    try {
        await window.mobileApi.createParticipacao({
            proprietario_id,
            imovel_id,
            porcentagem,
            ativo
        });

        showAlert('Participação criada com sucesso!', 'success');

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('participacaoModal'));
        modal.hide();

        // Recarregar participações
        await loadParticipacoes();
    } catch (error) {
        console.error('Erro ao criar participação:', error);
        showAlert('Erro ao criar participação', 'error');
    }
}

async function editParticipacao(id) {
    try {
        // Carregar dados da participação, proprietários e imóveis
        const [participacaoResult, proprietariosResult, imoveisResult] = await Promise.all([
            window.mobileApi.getParticipacao(id),
            window.mobileApi.getProprietarios(),
            window.mobileApi.getImoveis()
        ]);

        const participacao = participacaoResult.data;
        const proprietarios = proprietariosResult.data || [];
        const imoveis = imoveisResult.data || [];

        if (!participacao) {
            showAlert('Participação não encontrada', 'error');
            return;
        }

        // Criar opções para os selects
        const proprietarioOptions = proprietarios.map(p =>
            `<option value="${p.id}" ${p.id === participacao.proprietario_id ? 'selected' : ''}>${p.nome}</option>`
        ).join('');

        const imovelOptions = imoveis.map(i =>
            `<option value="${i.id}" ${i.id === participacao.imovel_id ? 'selected' : ''}>${i.endereco}</option>`
        ).join('');

        // Criar formulário modal
        const formHtml = `
            <div class="modal fade" id="editParticipacaoModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Participação</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editParticipacaoForm">
                                <input type="hidden" id="edit_participacao_id" value="${id}">
                                <div class="mb-3">
                                    <label class="form-label">Proprietário:</label>
                                    <select class="form-select" id="edit_proprietario_id" required>
                                        <option value="">Selecione um proprietário</option>
                                        ${proprietarioOptions}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Imóvel:</label>
                                    <select class="form-select" id="edit_imovel_id" required>
                                        <option value="">Selecione um imóvel</option>
                                        ${imovelOptions}
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Porcentagem (%):</label>
                                    <input type="number" class="form-control" id="edit_porcentagem" step="0.01" min="0" max="100" value="${participacao.porcentagem}" required>
                                </div>
                                <div class="mb-3">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="edit_ativo" ${participacao.ativo ? 'checked' : ''}>
                                        <label class="form-check-label" for="edit_ativo">Ativo</label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="updateParticipacao()">Salvar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adicionar modal ao DOM
        document.body.insertAdjacentHTML('beforeend', formHtml);

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('editParticipacaoModal'));
        modal.show();

        // Remover modal quando fechado
        document.getElementById('editParticipacaoModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });

    } catch (error) {
        console.error('Erro ao carregar dados da participação:', error);
        showAlert('Erro ao carregar dados da participação', 'error');
    }
}

async function updateParticipacao() {
    const id = parseInt(document.getElementById('edit_participacao_id').value);
    const proprietario_id = parseInt(document.getElementById('edit_proprietario_id').value);
    const imovel_id = parseInt(document.getElementById('edit_imovel_id').value);
    const porcentagem = parseFloat(document.getElementById('edit_porcentagem').value);
    const ativo = document.getElementById('edit_ativo').checked;

    if (!proprietario_id || !imovel_id || !porcentagem) {
        showAlert('Por favor, preencha todos os campos obrigatórios', 'warning');
        return;
    }

    try {
        await window.mobileApi.updateParticipacao(id, {
            proprietario_id,
            imovel_id,
            porcentagem,
            ativo
        });

        showAlert('Participação atualizada com sucesso!', 'success');

        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editParticipacaoModal'));
        modal.hide();

        // Recarregar participações
        await loadParticipacoes();
    } catch (error) {
        console.error('Erro ao atualizar participação:', error);
        showAlert('Erro ao atualizar participação', 'error');
    }
}

async function deleteParticipacao(id) {
    if (!confirm('Tem certeza que deseja excluir esta participação?')) {
        return;
    }

    try {
        await window.mobileApi.deleteParticipacao(id);
        showAlert('Participação excluída com sucesso!', 'success');
        await loadParticipacoes();
    } catch (error) {
        console.error('Erro ao excluir participação:', error);
        showAlert('Erro ao excluir participação', 'error');
    }
}
