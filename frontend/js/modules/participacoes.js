/**
 * Módulo Participacoes - Gestão de participações de imóveis e proprietários
 * Inclui CRUD, seleção de conjuntos, renderização de matriz e validações
 */

class ParticipacoesModule {
    constructor() {
        this.apiService = window.apiService;
        this.uiManager = window.uiManager;
        this.participacoes = [];
        this.datas = [];
        this.selectedData = null;
        this.proprietarios = [];
        this.imoveis = [];
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
    }

    async load() {
        this.init();
        await this.loadDatas();
    }

    async loadDatas() {
        try {
            this.uiManager.showLoading('Carregando datas de conjuntos...');
            const datas = await this.apiService.getDatasParticipacoes();
            console.log('datas from API:', datas);
            this.uiManager.hideLoading();
            
            // Manejar caso donde datas es null o undefined
            if (!datas) {
                this.uiManager.showAlert('Nenhum conjunto de participações encontrado.', 'warning');
                this.datas = [];
                this.selectedData = "ativo";
                this.renderDataSelector();
                return;
            }
            
            if (!Array.isArray(datas)) {
                this.uiManager.showAlert('Erro ao carregar datas.', 'error');
                return;
            }
            
            // Não filtrar duplicatas, pois cada item é único com versao_id
            this.datas = datas;
            this.selectedData = this.datas.length ? this.datas[0].versao_id : "ativo";
            this.renderDataSelector();
            
            if (this.selectedData) {
                await this.loadParticipacoes();
            }
        } catch (error) {
            this.uiManager.showAlert('Erro ao carregar datas: ' + error.message, 'error');
            this.uiManager.hideLoading();
        }
    }

    renderDataSelector() {
        const container = document.getElementById('participacoes-data-selector');
        if (!container) return;
        if (!this.datas.length) {
            SecurityUtils.setSafeHTML(container, '<span class="text-muted">Nenhum conjunto disponível</span>');
            return;
        }
        let html = '<label for="data-participacoes">Conjunto de Participações:</label> ';
        html += `<select id="data-participacoes">`;
        for (const item of this.datas) {
            const value = item.versao_id || "ativo";
            const isSelected = value === (this.selectedData || "ativo");
            html += `<option value="${SecurityUtils.escapeHtml(value)}"${isSelected ? ' selected' : ''}>${SecurityUtils.escapeHtml(item.label)}</option>`;
        }
        html += '</select>';
        SecurityUtils.setSafeHTML(container, html);
        document.getElementById('data-participacoes').addEventListener('change', (e) => {
            this.selectedData = e.target.value;
            this.loadParticipacoes();
        });
    }

    async loadParticipacoes(dataId = null) {
        try {
            this.uiManager.showLoading('Carregando participações...');
            console.log('🔧 Carregando participações para dataId:', dataId);
            
            const [participacoes, proprietarios, imoveis] = await Promise.all([
                this.apiService.getParticipacoes(dataId),
                this.apiService.getProprietarios(),
                this.apiService.getImoveis()
            ]);
            
            console.log('🔧 Dados carregados:', {
                participacoes: participacoes?.length || 0,
                proprietarios: proprietarios?.length || 0,
                imoveis: imoveis?.length || 0
            });
            
            this.uiManager.hideLoading();
            this.participacoes = participacoes || [];
            this.proprietarios = proprietarios || [];
            this.imoveis = imoveis || [];
            console.log('🔧 Chamando renderTable...');
            this.renderTable();
        } catch (error) {
            console.error('🔧 Erro ao carregar participações:', error);
            this.uiManager.showAlert('Erro ao carregar participações: ' + error.message, 'error');
            this.uiManager.hideLoading();
        }
    }

    renderTable() {
        console.log('🔧 renderTable chamado com:', {
            participacoes: this.participacoes?.length || 0,
            proprietarios: this.proprietarios?.length || 0,
            imoveis: this.imoveis?.length || 0
        });
        
        // 🔍 Diagnóstico detalhado dos dados
        console.log('🔍 Dados detalhados:', {
            imoveis: this.imoveis,
            proprietarios: this.proprietarios,
            participacoes: this.participacoes
        });
        
        const tableHead = document.getElementById('participacoes-matrix-head');
        const tableBody = document.getElementById('participacoes-matrix-body');
        const tableContainer = document.getElementById('participacoes-table-container');
        
        console.log('🔧 Elementos DOM encontrados:', {
            tableHead: !!tableHead,
            tableBody: !!tableBody,
            tableContainer: !!tableContainer
        });
        
        if (tableContainer) tableContainer.style.display = 'block';
        if (!tableHead || !tableBody) {
            console.warn('🔧 Elementos da tabela não encontrados');
            return;
        }
        
        if (!this.participacoes.length || !this.proprietarios.length || !this.imoveis.length) {
            console.log('🔧 Renderizando tabela vazia');
            SecurityUtils.setSafeHTML(tableHead, '');
            SecurityUtils.setSafeHTML(tableBody, '<tr><td colspan="5" class="text-center text-muted">Nenhuma participação encontrada.</td></tr>');
            return;
        }
        
        console.log('🔧 Renderizando tabela com dados');
        let headHtml = '<tr><th width="80">Imóvel</th>';
        for (const prop of this.proprietarios) {
            headHtml += `<th>${prop.nome}</th>`;
        }
        headHtml += '<th>Total</th><th width="120">Ações</th></tr>';
        console.log('🔧 Head HTML:', headHtml);
        SecurityUtils.setSafeHTML(tableHead, headHtml);
        
        // Criar linhas da tabela via DOM (mais seguro que innerHTML)
        tableBody.innerHTML = ''; // Limpar primeiro
        
        for (const imovel of this.imoveis) {
            const row = document.createElement('tr');
            
            // Célula do imóvel
            const cellImovel = document.createElement('td');
            cellImovel.textContent = imovel.nome;
            cellImovel.style.width = '80px';
            cellImovel.style.minWidth = '80px';
            cellImovel.style.maxWidth = '80px';
            cellImovel.style.wordWrap = 'break-word';
            cellImovel.style.whiteSpace = 'normal';
            row.appendChild(cellImovel);
            
            let total = 0;
            // Células dos proprietários
            for (const prop of this.proprietarios) {
                const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                let val = part ? part.porcentagem : '';
                if (val !== '' && val < 1) val = (val * 100).toFixed(2);
                if (val !== '' && val >= 1) val = Number(val).toFixed(2);
                total += part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                
                const cellProp = document.createElement('td');
                cellProp.textContent = val !== '' ? val + ' %' : '-';
                row.appendChild(cellProp);
            }
            
            // Célula do total
            const cellTotal = document.createElement('td');
            cellTotal.innerHTML = `<strong>${Math.round(total)}%</strong>`;
            row.appendChild(cellTotal);
            
            // Célula de ações
            const cellActions = document.createElement('td');
            const isAdmin = window.authService && window.authService.isAdmin();
            const disabledAttr = isAdmin ? '' : 'disabled';
            const disabledClass = isAdmin ? '' : 'opacity-50';
            const titleAttr = isAdmin ? 'Nova versão' : 'Apenas administradores podem criar nova versão';
            
            cellActions.innerHTML = `
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary admin-only ${disabledClass}" ${disabledAttr ? 'disabled' : ''} title="${titleAttr}" onclick="window.participacoesModule.novaVersao('${imovel.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            `;
            row.appendChild(cellActions);
            
            tableBody.appendChild(row);
        }
        
        // Força estilos da tabela via CSS inline
        console.log('🔧 Aplicando estilos da tabela...');
        
        // Força estilos da tabela
        const tableElement = document.getElementById('participacoes-matrix-table');
        if (tableElement) {
            tableElement.style.tableLayout = 'fixed';
            tableElement.style.width = '100%';
            
            // Aplica estilos às células da primeira coluna
            const applyColumnStyles = () => {
                const firstCells = tableElement.querySelectorAll('th:first-child, td:first-child');
                firstCells.forEach(cell => {
                    cell.style.cssText = `
                        width: 80px !important;
                        min-width: 80px !important;
                        max-width: 80px !important;
                        word-wrap: break-word !important;
                        white-space: normal !important;
                        font-size: 0.7rem !important;
                        padding: 0.25rem 0.5rem !important;
                        text-align: left !important;
                        overflow-wrap: break-word !important;
                        box-sizing: border-box !important;
                    `;
                });
            };
            
            // Aplica imediatamente
            applyColumnStyles();
            
            // Aplica novamente após um pequeno delay (para garantir)
            setTimeout(applyColumnStyles, 100);
        }
        
        console.log('🔧 Estilos aplicados');
        
        console.log('🔧 Aplicando HTML ao DOM...');
        console.log('🔧 HTML aplicado com sucesso');
        
        // 🔍 Diagnóstico completo final
        console.log('🔍 === DIAGNÓSTICO COMPLETO ===');
        console.log('DOM após aplicação:', tableBody.innerHTML);
        console.log('Número de linhas no DOM:', tableBody.querySelectorAll('tr').length);
        
        // Verificar se cada linha tem as colunas esperadas
        tableBody.querySelectorAll('tr').forEach((row, index) => {
            const cells = row.querySelectorAll('td');
            console.log(`Linha ${index + 1}:`, cells.length, 'colunas');
            if (cells.length > 0) {
                console.log(`  Conteúdo da linha ${index + 1}:`, Array.from(cells).map(cell => cell.textContent.trim()));
            }
        });
        
        // Verificar estrutura da tabela
        const table = document.getElementById('participacoes-matrix-table');
        if (table) {
            console.log('Estrutura da tabela:', {
                display: window.getComputedStyle(table).display,
                tableLayout: window.getComputedStyle(table).tableLayout
            });
        }
    }

    async novaVersao(imovelId) {
        // Admin-only
        if (!window.authService || !window.authService.isAuthenticated() || window.authService.getUserData()?.tipo !== 'administrador') {
            this.uiManager.showError('Apenas administradores podem criar nova versão.');
            return;
        }
        try {
            // Construir estrutura editável: porcentagens por imóvel/proprietário a partir do conjunto carregado
            const porImovel = {};
            for (const imovel of this.imoveis) {
                porImovel[imovel.id] = {};
                for (const prop of this.proprietarios) {
                    const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                    let val = part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                    porImovel[imovel.id][prop.id] = Number(val.toFixed(2));
                }
            }
            // Render modal simples com inputs percentuais por proprietario para o imóvel clicado
            const modalId = 'nova-versao-participacoes-modal';
            let modalEl = document.getElementById(modalId);
            if (!modalEl) {
                const cols = this.proprietarios.map(p => `<th>${p.nome}</th>`).join('');
                const inputs = this.proprietarios.map(p => `<td><input type="number" step="0.01" min="0" max="100" data-prop="${p.id}" class="form-control form-control-sm" /></td>`).join('');
                document.body.insertAdjacentHTML('beforeend', `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header"><h5 class="modal-title">Nova versão de participações</h5></div>
                            <div class="modal-body" style="font-size: 0.80rem; max-height: 70vh; overflow-y: auto;">
                                <p>Edite os percentuais para o imóvel selecionado. A soma deve ser 100%.</p>
                                <table class="table table-sm">
                                    <thead><tr><th>Imóvel</th>${cols}<th>Total</th></tr></thead>
                                    <tbody id="nv-body"></tbody>
                                </table>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" data-bs-dismiss="modal" id="nv-cancelar">Cancelar</button>
                                <button class="btn btn-primary" id="nv-salvar">Salvar nova versão</button>
                            </div>
                        </div>
                    </div>
                </div>`);
                modalEl = document.getElementById(modalId);
            }

            const body = modalEl.querySelector('#nv-body');
            const im = this.imoveis.find(i => String(i.id) === String(imovelId));
            const tds = this.proprietarios.map(p => {
                const value = porImovel[im.id][p.id];
                return `<td><input type="number" step="0.01" min="0" max="100" data-prop="${SecurityUtils.escapeHtml(p.id)}" class="form-control form-control-sm" style="font-size:0.80rem;" value="${SecurityUtils.escapeHtml(value)}" /></td>`;
            }).join('');
            SecurityUtils.setSafeHTML(body, `<tr data-imovel="${SecurityUtils.escapeHtml(im.id)}"><td>${SecurityUtils.escapeHtml(im.nome)}</td>${tds}<td id="nv-total">0%</td></tr>`);

            const recalc = () => {
                let soma = 0;
                body.querySelectorAll('input[data-prop]').forEach(inp => { soma += Number(inp.value || 0); });
                const somaRounded = Math.round(soma);
                body.querySelector('#nv-total').textContent = somaRounded + '%';
                return { soma, somaRounded };
            };
            body.addEventListener('input', recalc);
            recalc();

            const salvar = async () => {
                // Normalizar apenas o imóvel editado
                const edited = {};
                body.querySelectorAll('input[data-prop]').forEach(inp => {
                    const pid = Number(inp.getAttribute('data-prop'));
                    edited[pid] = Number(inp.value || 0);
                });
                // Construir payload: copiar conjunto atual, substituindo apenas o imóvel editado
                const payload = { participacoes: [] };
                for (const imovel of this.imoveis) {
                    for (const prop of this.proprietarios) {
                        let val;
                        if (imovel.id === im.id && edited[prop.id] != null) {
                            val = edited[prop.id];
                        } else {
                            const part = this.participacoes.find(p => p.imovel_id === imovel.id && p.proprietario_id === prop.id);
                            val = part ? (part.porcentagem < 1 ? part.porcentagem * 100 : part.porcentagem) : 0;
                        }
                        payload.participacoes.push({ imovel_id: imovel.id, proprietario_id: prop.id, porcentagem: val });
                    }
                }
                // Enviar ao backend
                try {
                    this.uiManager.showLoading('Salvando nova versão...');
                    const resp = await this.apiService.createNovaVersaoParticipacoes(payload);
                    this.uiManager.hideLoading();
                    if (resp && (resp.success || resp.mensagem || resp.message)) {
                        this.uiManager.showSuccess('Nova versão criada com sucesso');
                        // Aplicar focus management antes de cerrar modal exitosamente
                        if (document.activeElement) document.activeElement.blur();
                        document.body.focus();
                        if (window.bootstrap && window.bootstrap.Modal) {
                            const bs = bootstrap.Modal.getOrCreateInstance(modalEl);
                            bs.hide();
                        } else {
                            modalEl.style.display = 'none'; modalEl.classList.remove('show');
                        }
                        // Recarregar dados após sucesso
                        await this.load();
                    } else {
                        this.uiManager.showError('Erro ao criar nova versão: Resposta inesperada do servidor');
                    }
                } catch (error) {
                    this.uiManager.showError('Erro ao criar nova versão: ' + error.message);
                    this.uiManager.hideLoading();
                }
            };

            modalEl.querySelector('#nv-salvar').onclick = salvar;
            
            // Configurar botón cancelar con focus management
            const cancelarBtn = modalEl.querySelector('#nv-cancelar');
            if (cancelarBtn) {
                cancelarBtn.onclick = () => {
                    // Aplicar focus management antes de cerrar
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    
                    if (window.bootstrap && window.bootstrap.Modal) {
                        const bs = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                        bs.hide();
                    } else {
                        modalEl.style.display = 'none'; 
                        modalEl.classList.remove('show');
                    }
                };
            }
            
            // Añadir event listener para focus management en hide.bs.modal
            modalEl.addEventListener('hide.bs.modal', () => {
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                console.log('🔧 Focus transferido antes del cierre del modal participações');
            });
            
            if (window.bootstrap && window.bootstrap.Modal) {
                const bs = new bootstrap.Modal(modalEl);
                bs.show();
            } else {
                modalEl.style.display = 'block'; modalEl.classList.add('show');
            }
        } catch (e) {
            this.uiManager.showError('Erro na preparação da nova versão: ' + e.message);
        }
    }

    /**
     * Aplicar permissões baseado no tipo de usuário
     */
    applyPermissions(isAdmin) {
        console.log(`🔒 Aplicando permissões no módulo Participações: ${isAdmin ? 'ADMIN' : 'USUÁRIO'}`);

        // A lógica de desabilitar botões agora está no método renderTable.
        // Apenas precisamos re-renderizar a tabela para aplicar as permissões visuais.
        if (this.imoveis && this.imoveis.length > 0) {
            this.renderTable();
        }
    }
}

// Inicializar módulo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.participacoesModule = new ParticipacoesModule();
});
