/**
 * Módulo de Gestão de Usuários
 * Gerencia cadastro, edição e listagem de usuários
 */

// Utilidad para guardar logs en localStorage
function logToLocalStorage(message, data) {
    try {
        const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
        const entry = { timestamp: new Date().toISOString(), message, data };
        logs.push(entry);
        localStorage.setItem('debugLogs', JSON.stringify(logs));
    } catch (e) {}
}

class UsuarioManager {
    constructor() {
        this.modal = null;
        this.modalAlterar = null;
        this.form = null;
        this.formAlterar = null;
        this.usuarios = [];
        this.usuarioSelecionado = null;
        this.initialized = false;
    }

    /**
     * Inicializar o gerenciador de usuários
     */
    init() {
        console.log('[UsuarioManager] init() called');
        if (this.initialized) return;

        // Centralizar obtención de elementos
        this.modal = this.getBootstrapModal('modal-cadastrar-usuario');
        this.modalAlterar = this.getBootstrapModal('modal-alterar-usuario');
        this.form = this.getFormWithId('form-cadastrar-usuario', 'modal-cadastrar-usuario');
        this.formAlterar = this.getFormWithId('form-alterar-usuario', 'modal-alterar-usuario');

        console.log('[UsuarioManager] form (cadastrar):', this.form);
        console.log('[UsuarioManager] formAlterar (alterar):', this.formAlterar);

        // Verificación y logueo explícito
        if (!this.form) {
            console.error('[UsuarioManager] Formulario form-cadastrar-usuario NO encontrado en el DOM');
        } else {
            console.log('[UsuarioManager] Formulario form-cadastrar-usuario encontrado:', this.form);
            const salvarBtn = this.form.querySelector('button[type="submit"], .btn-success');
            if (!salvarBtn) {
                console.error('[UsuarioManager] Botón Salvar NO encontrado dentro del formulario');
            } else {
                console.log('[UsuarioManager] Botón Salvar encontrado:', salvarBtn);
                if (salvarBtn.type !== 'submit') {
                    console.warn('[UsuarioManager] Botón Salvar no es de tipo submit, se fuerza a submit');
                    salvarBtn.type = 'submit';
                }
            }
        }

        // Forçar o botão 'Salvar' a type='submit'
        this.forceSubmitButtonType(this.form, 'btn-salvar-usuario');
        this.forceSubmitButtonType(this.formAlterar, 'btn-alterar-usuario');

        // Configurar eventos
        this.setupEvents();
        this.initialized = true;
    }

    getBootstrapModal(modalId) {
        const el = document.getElementById(modalId);
        return el ? new bootstrap.Modal(el) : null;
    }

    getFormWithId(formId, modalId) {
        let form = document.getElementById(formId);
        console.log('getFormWithId direct', formId, form);
        if (!form) {
            const modalEl = document.getElementById(modalId);
            console.log('getFormWithId modalEl', modalId, modalEl);
            if (modalEl) {
                form = modalEl.querySelector('form');
                console.log('getFormWithId form in modal', form);
                if (form) form.id = formId;
            }
        }
        console.log('getFormWithId final', formId, form);
        return form;
    }

    forceSubmitButtonType(form, btnId) {
        if (!form) return;
        let btn = form.querySelector('button[type="submit"], .btn-success');
        if (!btn && btnId) btn = document.getElementById(btnId);
        if (btn) btn.type = 'submit';
    }

    /**
     * Método para carregar dados quando a vista é ativada (chamado pelo view-manager)
     */
    setupEvents() {
        logToLocalStorage('[UsuarioManager] setupEvents chamado');
        console.log('[UsuarioManager] setupEvents chamado');

        // --- FIX: Listener de submissão robusto ---
        // O handler é definido uma vez e anexado permanentemente.
        // A proteção contra submissões múltiplas é feita desabilitando o botão no handler.
        if (this.form && !this.form.dataset.submitListenerAttached) {
            this.form.dataset.submitListenerAttached = 'true'; // Flag para evitar re-anexar
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Pega o botão de submit a partir do evento ou do form
                const submitButton = e.submitter || this.form.querySelector('button[type="submit"]');

                // Proteção contra cliques múltiplos
                if (submitButton && submitButton.disabled) {
                    console.log('[UsuarioManager] Submissão ignorada, formulário já em processamento.');
                    return;
                }

                logToLocalStorage('[Usuario] form-cadastrar-usuario submit');
                console.log('[Usuario] form-cadastrar-usuario submit');
                
                const formData = new FormData(this.form);
                const userData = {
                    usuario: formData.get('usuario')?.trim() || '',
                    senha: formData.get('senha'),
                    tipo_de_usuario: formData.get('tipo_de_usuario')
                };
                this.handleCadastroUsuario(userData, this.form);
            });
        }

        if (this.formAlterar && !this.formAlterar.dataset.submitListenerAttached) {
            this.formAlterar.dataset.submitListenerAttached = 'true';
            this.formAlterar.addEventListener('submit', (e) => {
                e.preventDefault();
                logToLocalStorage('[Usuario] form-alterar-usuario submit');
                console.log('[Usuario] form-alterar-usuario submit');
                const formData = new FormData(this.formAlterar);
                const userData = {
                    usuario: formData.get('usuario')?.trim() || '',
                    senha: formData.get('senha'),
                    tipo_de_usuario: formData.get('tipo_de_usuario')
                };
                this.handleAlterarUsuario(userData, this.formAlterar);
            });
        }

        // Selección y exclusión de usuario
        this.registerChange('selecionar-usuario', this.selecionarUsuarioParaAlterar.bind(this));
        this.registerClick('btn-excluir-usuario-selecionado', this.confirmarExclusaoUsuario.bind(this));

        // Mostrar/ocultar senha
        this.registerClick('toggle-senha', this.toggleSenhaVisibility);
        this.registerClick('toggle-alterar-senha', this.toggleAlterarSenhaVisibility);

        // Validación en tiempo real
        this.registerInput('confirmar-senha', this.validarSenhas);
        this.registerInput('alterar-confirmar-senha', this.validarAlterarSenhas);

        // Eventos de modal
        this.registerModalEvents('modal-cadastrar-usuario', this.limparFormulario.bind(this), '#btn-cadastrar-usuario');
        this.registerModalEvents('modal-alterar-usuario', this.limparFormularioAlterar.bind(this), '#btn-alterar-usuario', this.limparFormularioAlterar.bind(this));
        
        // --- FIX: Removida a lógica de "reforço" que causava listeners duplicados ---

        // Botones de cerrar
        this.registerCloseButtons();
    }

    registerFormSubmit(form, handler, logMsg) {
        if (!form) return;
        // Eliminar listeners previos
        form.onsubmit = null;
        form.addEventListener('submit', (e) => {
            if (logMsg) logToLocalStorage(logMsg);
            if (logMsg) console.log(logMsg);
            e.preventDefault();
            handler(e);
        });
    }

    registerChange(elementId, handler) {
        const el = document.getElementById(elementId);
        if (el) {
            el.onchange = null;
            el.addEventListener('change', (e) => handler(e.target.value));
        }
    }

    registerClick(elementId, handler) {
        const el = document.getElementById(elementId);
        if (el) {
            el.onclick = null;
            el.addEventListener('click', handler);
        }
    }

    registerInput(elementId, handler) {
        const el = document.getElementById(elementId);
        if (el) {
            el.oninput = null;
            el.addEventListener('input', handler);
        }
    }

    registerModalEvents(modalId, limparFn, focusSelector, showFn) {
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;
        modalEl.addEventListener('hide.bs.modal', () => {
            if (document.activeElement) document.activeElement.blur();
            document.body.focus();
            console.log(`🔧 Focus transferido antes del cierre del modal ${modalId}`);
        });
        modalEl.addEventListener('hidden.bs.modal', () => {
            // Obtener el formulario directamente del modal
            const form = modalEl.querySelector('form');
            if (modalId === 'modal-cadastrar-usuario' && form) {
                form.reset();
                // Limpiar validaciones visuales
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.classList.remove('is-valid', 'is-invalid');
                });
                // Esconder alerts
                const errorDiv = document.getElementById('erro-cadastro-usuario');
                const sucessoDiv = document.getElementById('sucesso-cadastro-usuario');
                if (errorDiv) errorDiv.classList.add('d-none');
                if (sucessoDiv) sucessoDiv.classList.add('d-none');
                console.log('🧹 Formulário de usuário limpo (directo desde modal)');
            } else if (limparFn) {
                limparFn();
            }
            const focusTarget = document.querySelector(focusSelector + ', input[type="search"], .btn-primary');
            if (focusTarget && focusTarget.offsetParent !== null) {
                setTimeout(() => focusTarget.focus(), 50);
            } else {
                setTimeout(() => document.body.focus(), 50);
            }
        });
        if (showFn) {
            modalEl.addEventListener('show.bs.modal', showFn);
        }
    }

    registerCloseButtons() {
        const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            const modalId = button.closest('.modal')?.id;
            if (modalId && (modalId.includes('usuario') || modalId.includes('imovel') || modalId.includes('proprietario'))) {
                button.onclick = null;
                button.addEventListener('click', () => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log(`🔧 PREEMPTIVE: Focus transferido antes del cierre por botón X en ${modalId}`);
                });
            }
        });
    }

    /**
     * Processar cadastro de usuário
     */
    async handleCadastroUsuario(userData, form) {
        logToLocalStorage('[Usuario] handleCadastroUsuario called');
        console.log('[Usuario] handleCadastroUsuario called', userData, form);
        
        if (!form) {
            console.error("[UsuarioManager] Tentativa de submeter um formulário nulo.");
            this.mostrarErro('Erro interno: formulário não encontrado.');
            return;
        }

        // Validaciones frontend
        if (!this.validarDados(userData)) {
            // A função validarDados já mostra o erro específico.
            return;
        }

        // Verificar se senhas coincidem
        const confirmarSenhaEl = form.querySelector('[name="confirmar_senha"]');
        if (!confirmarSenhaEl || userData.senha !== confirmarSenhaEl.value) {
            this.mostrarErro('As senhas não coincidem');
            return;
        }

        // Mostrar loading e desabilitar form
        this.setLoading(true, form);
        this.esconderAlerts();

        try {
            // Esperar a que AppConfig esté inicializado si es necesario
            if (!window.AppConfig?.api?.baseUrl) {
                console.log('⏳ AppConfig no inicializado, inicializando...');
                await window.AppConfig?.initNetwork();
            }

            const baseUrl = window.AppConfig?.api?.baseUrl || '';
            console.log('🔗 Usando baseUrl:', baseUrl);

            const authHeaderObj = window.authService?.getAuthHeaderObject();

            if (!authHeaderObj || !authHeaderObj['Authorization']) {
                throw new Error('Token de autenticação não encontrado. Faça o login novamente.');
            }

            const response = await fetch(`${baseUrl}/api/auth/cadastrar-usuario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaderObj
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const result = await response.json();
                this.mostrarSucesso(`Usuário '${result.usuario}' cadastrado com sucesso!`);

                // Atualizar a lista de usuários no modal "Alterar Usuário"
                this.carregarUsuarios();

                // --- FIX: Reduzido o tempo de espera para fechar o modal ---
                setTimeout(() => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    
                    const modalEl = document.getElementById('modal-cadastrar-usuario');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    } else {
                        console.warn('[UsuarioManager] modal-cadastrar-usuario no encontrado en el DOM para fechar.');
                    }
                    
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(bd => bd.remove());
                }, 1000); // Reduzido de 2000ms para 1000ms

            } else {
                let errorMsg = 'Erro desconhecido';
                try {
                    const errorJson = await response.json();
                    // Prioriza a mensagem de erro mais específica do backend
                    errorMsg = errorJson.detail || errorJson.message || JSON.stringify(errorJson);
                } catch (e) {
                    // Fallback se a resposta de erro não for JSON
                    errorMsg = await response.text() || `Erro ${response.status}`;
                }
                console.error('Erro no cadastro:', errorMsg);
                this.mostrarErro('Erro ao cadastrar usuário: ' + errorMsg);
            }

        } catch (error) {
            console.error('Erro de conexão ou de autenticação:', error);
            this.mostrarErro(error.message || 'Erro de conexão com o servidor');
        } finally {
            // Re-habilita o form independentemente do resultado
            this.setLoading(false, form);
        }
    }

    /**
     * Validar dados do formulário
     */
    validarDados(userData) {
        if (!userData.usuario || userData.usuario.length < 3) {
            this.mostrarErro('Nome de usuário deve ter pelo menos 3 caracteres');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(userData.usuario)) {
            this.mostrarErro('Nome de usuário deve conter apenas letras, números e underscore');
            return false;
        }

        if (!userData.senha || userData.senha.length < 6) {
            this.mostrarErro('Senha deve ter pelo menos 6 caracteres');
            return false;
        }

        if (!userData.tipo_de_usuario) {
            this.mostrarErro('Selecione o tipo de usuário');
            return false;
        }

        return true;
    }

    /**
     * Validar se senhas coincidem
     */
    validarSenhas() {
        const senha = document.getElementById('nova-senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const confirmarField = document.getElementById('confirmar-senha');

        if (confirmarSenha && senha !== confirmarSenha) {
            confirmarField.classList.add('is-invalid');
            confirmarField.classList.remove('is-valid');
        } else if (confirmarSenha) {
            confirmarField.classList.add('is-valid');
            confirmarField.classList.remove('is-invalid');
        }
    }

    /**
     * Alternar visibilidade da senha
     */
    toggleSenhaVisibility() {
        const senhaField = document.getElementById('nova-senha');
        const toggleBtn = document.getElementById('toggle-senha');
        const icon = toggleBtn.querySelector('i');

        if (senhaField.type === 'password') {
            senhaField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            senhaField.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    /**
     * Mostrar erro
     */
    mostrarErro(mensagem) {
        const errorDiv = document.getElementById('erro-cadastro-usuario');
        if (errorDiv) {
            errorDiv.textContent = mensagem;
            errorDiv.classList.remove('d-none');
        }
    }

    /**
     * Mostrar sucesso
     */
    mostrarSucesso(mensagem) {
        const sucessoDiv = document.getElementById('sucesso-cadastro-usuario');
        if (sucessoDiv) {
            sucessoDiv.textContent = mensagem;
            sucessoDiv.classList.remove('d-none');
        }
    }

    /**
     * Esconder alerts
     */
    esconderAlerts() {
        const errorDiv = document.getElementById('erro-cadastro-usuario');
        const sucessoDiv = document.getElementById('sucesso-cadastro-usuario');

        if (errorDiv) errorDiv.classList.add('d-none');
        if (sucessoDiv) sucessoDiv.classList.add('d-none');
    }

    /**
     * Configurar estado de loading
     */
    setLoading(loading) {
        const submitBtn = document.getElementById('btn-salvar-usuario');
        const inputs = (arguments.length > 1 && arguments[1]) ? arguments[1].querySelectorAll('input, select') : [];

        if (loading) {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Cadastrando...';
            }
            inputs.forEach(input => input.disabled = true);
        } else {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Cadastrar Usuário';
            }
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Limpar formulário
     */
    limparFormulario() {
        if (this.form) {
            this.form.reset();
            this.esconderAlerts();
            // Limpar validações visuais
            const inputs = this.form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });
            console.log('🧹 Formulário de usuário limpo');
        } else {
            console.warn('[UsuarioManager] limparFormulario: this.form é null, nada a limpar');
        }
    }

    /**
     * Carregar lista de usuários para alteração
     */
    async carregarUsuarios() {
        const select = document.getElementById('selecionar-usuario');
        if (select) {
            select.innerHTML = '<option value="">Carregando usuários...</option>';
        }

        try {
            console.log('🔄 Carregando usuários...');
            const response = await window.apiService.getUsuarios();
            console.log('📋 Resposta getUsuarios:', response);

            // O getUsuarios() retorna diretamente os dados (array) se success=true, ou null se falhou
            if (response && Array.isArray(response)) {
                this.usuarios = response;
                console.log('👥 Usuários carregados:', this.usuarios);
                this.preencherSelectUsuarios();
            } else {
                console.error('❌ Erro: resposta não é um array válido:', response);
                this.mostrarErroAlterar('Erro ao carregar usuários');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuários:', error);
            this.mostrarErroAlterar('Erro de conexão ao carregar usuários: ' + error.message);
        }
    }

    /**
     * Preencher select de usuários
     */
    preencherSelectUsuarios() {
        const select = document.getElementById('selecionar-usuario');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione um usuário</option>';

        this.usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = `${usuario.usuario} (${usuario.tipo_de_usuario})`;
            select.appendChild(option);
        });
    }

    /**
     * Selecionar usuário para alterar
     */
    selecionarUsuarioParaAlterar(usuarioId) {
        this.usuarioSelecionado = this.usuarios.find(u => u.id == usuarioId);

        // Siempre obtener el form del DOM por si fue reconstruido
        const formAlterar = document.getElementById('form-alterar-usuario');
        if (formAlterar) {
            if (this.usuarioSelecionado) {
                formAlterar.style.display = 'block';
                this.formAlterar = formAlterar;
                this.preencherDadosUsuario();
            } else {
                formAlterar.style.display = 'none';
            }
        } else {
            console.warn('[UsuarioManager] form-alterar-usuario no encontrado en el DOM');
        }
    }

    /**
     * Preencher dados do usuário selecionado
     */
    preencherDadosUsuario() {
        if (!this.usuarioSelecionado) return;

        const tipoSelect = document.getElementById('alterar-tipo-usuario');
        if (tipoSelect) {
            tipoSelect.value = this.usuarioSelecionado.tipo_de_usuario;
        }
    }

    /**
     * Processar alteração de usuário
     */
    async handleAlterarUsuario() {
        if (!this.usuarioSelecionado) {
            this.mostrarErroAlterar('Selecione um usuário');
            return;
        }

        const formData = new FormData(this.formAlterar);
        const novaSenha = formData.get('nova_senha');
        const confirmarSenha = formData.get('confirmar_nova_senha');
        const novoTipo = formData.get('novo_tipo_usuario');

        // Validações
        if (novaSenha && novaSenha.length < 6) {
            this.mostrarErroAlterar('Nova senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (novaSenha && novaSenha !== confirmarSenha) {
            this.mostrarErroAlterar('Senhas não coincidem');
            return;
        }

        // Preparar dados para envio
        const updateData = {};
        if (novaSenha) updateData.nova_senha = novaSenha;
        if (novoTipo) updateData.novo_tipo_usuario = novoTipo;

        if (Object.keys(updateData).length === 0) {
            this.mostrarErroAlterar('Informe pelo menos um campo para alterar');
            return;
        }

        this.setLoadingAlterar(true);
        this.esconderAlertsAlterar();

        try {
            const response = await window.apiService.updateUsuario(this.usuarioSelecionado.id, updateData);

            if (response && response.success) {
                this.mostrarSucessoAlterar(`Usuário '${this.usuarioSelecionado.usuario}' alterado com sucesso!`);

                setTimeout(() => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();

                    const modalEl = document.getElementById('modal-alterar-usuario');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }

                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(bd => bd.remove());
                }, 1000);

            } else {
                this.mostrarErroAlterar(response?.message || 'Erro ao alterar usuário');
            }

        } catch (error) {
            this.mostrarErroAlterar('Erro de conexão com o servidor');
        } finally {
            this.setLoadingAlterar(false);
        }
    }

    /**
     * Confirmar exclusão de usuário
     */
    async confirmarExclusaoUsuario() {
        if (!this.usuarioSelecionado) {
            this.mostrarErroAlterar('Selecione um usuário');
            return;
        }

        const confirmacao = confirm(`Tem certeza que deseja excluir o usuário '${this.usuarioSelecionado.usuario}'?\n\nEsta ação não pode ser desfeita.`);

        if (confirmacao) {
            await this.excluirUsuario();
        }
    }

    /**
     * Excluir usuário
     */
    async excluirUsuario() {
        this.setLoadingAlterar(true);
        this.esconderAlertsAlterar();

        try {
            const response = await window.apiService.deleteUsuario(this.usuarioSelecionado.id);

            if (response && response.success) {
                this.mostrarSucessoAlterar(`Usuário '${this.usuarioSelecionado.usuario}' excluído com sucesso!`);

                setTimeout(() => {
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();

                    const modalEl = document.getElementById('modal-alterar-usuario');
                    if (modalEl) {
                        const modalInstance = bootstrap.Modal.getInstance(modalEl);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }

                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(bd => bd.remove());
                }, 500);

            } else {
                this.mostrarErroAlterar(response?.message || 'Erro ao excluir usuário');
            }

        } catch (error) {
            this.mostrarErroAlterar('Erro de conexão com o servidor');
        } finally {
            this.setLoadingAlterar(false);
        }
    }

    /**
     * Validar senhas de alteração
     */
    validarAlterarSenhas() {
        const senha = document.getElementById('alterar-nova-senha').value;
        const confirmarSenha = document.getElementById('alterar-confirmar-senha').value;
        const confirmarField = document.getElementById('alterar-confirmar-senha');

        if (confirmarSenha && senha !== confirmarSenha) {
            confirmarField.classList.add('is-invalid');
            confirmarField.classList.remove('is-valid');
        } else if (confirmarSenha) {
            confirmarField.classList.add('is-valid');
            confirmarField.classList.remove('is-invalid');
        }
    }

    /**
     * Alternar visibilidade da senha de alteração
     */
    toggleAlterarSenhaVisibility() {
        const senhaField = document.getElementById('alterar-nova-senha');
        const toggleBtn = document.getElementById('toggle-alterar-senha');
        const icon = toggleBtn.querySelector('i');

        if (senhaField.type === 'password') {
            senhaField.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            senhaField.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    /**
     * Mostrar erro no modal de alterar
     */
    mostrarErroAlterar(mensagem) {
        const errorDiv = document.getElementById('erro-alterar-usuario');
        if (errorDiv) {
            errorDiv.textContent = mensagem;
            errorDiv.classList.remove('d-none');
        }
    }

    /**
     * Mostrar sucesso no modal de alterar
     */
    mostrarSucessoAlterar(mensagem) {
        const sucessoDiv = document.getElementById('sucesso-alterar-usuario');
        if (sucessoDiv) {
            sucessoDiv.textContent = mensagem;
            sucessoDiv.classList.remove('d-none');
        }
    }

    /**
     * Esconder alerts do modal de alterar
     */
    esconderAlertsAlterar() {
        const errorDiv = document.getElementById('erro-alterar-usuario');
        const sucessoDiv = document.getElementById('sucesso-alterar-usuario');

        if (errorDiv) errorDiv.classList.add('d-none');
        if (sucessoDiv) sucessoDiv.classList.add('d-none');
    }

    /**
     * Configurar estado de loading no modal de alterar
     */
    setLoadingAlterar(loading) {
        const submitBtn = this.formAlterar.querySelector('button[type="submit"]');
        const excluirBtn = document.getElementById('btn-excluir-usuario-selecionado');
        const inputs = this.formAlterar.querySelectorAll('input, select');

        if (loading) {
            submitBtn.disabled = true;
            excluirBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Alterando...';
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            excluirBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Alterar Usuário';
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Limpar formulário de alteração
     */
    limparFormularioAlterar() {
        if (this.formAlterar) {
            this.formAlterar.reset();
            this.formAlterar.style.display = 'none';
            this.esconderAlertsAlterar();
            this.usuarioSelecionado = null;
            // Resetar select
            const select = document.getElementById('selecionar-usuario');
            if (select) {
                select.value = '';
            }
            // Limpar validações visuais
            const inputs = this.formAlterar.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });
        } else {
            console.warn('[UsuarioManager] limparFormularioAlterar: this.formAlterar é null, nada a limpar');
        }
    }

    async load() {
        logToLocalStorage('[UsuarioManager] load() chamado');
        console.log('🔄 Carregando UsuarioManager...');
        try {
            // Siempre reinicializar eventos y referencias tras cada renderizado
            this.initialized = false;
            this.init();
            // Cargar datos si es necesario (ejemplo: lista de usuários)
            if (typeof this.carregarUsuarios === 'function') {
                await this.carregarUsuarios();
            }
            console.log('✅ UsuarioManager carregado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar UsuarioManager:', error);
        }
    }

    showAlterarModal() {
        if (this.modalAlterar) {
            this.modalAlterar.show();
        } else {
            console.error('Modal alterar usuario no encontrado');
        }
    }
}

// Criar instâncias globais para compatibilidade
window.usuarioManager = new UsuarioManager();
window.usuarioManagerModule = window.usuarioManager; // Alias para view-manager