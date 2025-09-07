/**
 * Módulo de Gestão de Usuários
 * Gerencia cadastro, edição e listagem de usuários
 */

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
        if (this.initialized) return;

        // Obter elementos do DOM (verificar se existem antes de criar modales)
        const modalElement = document.getElementById('modal-cadastrar-usuario');
        const modalAlterarElement = document.getElementById('modal-alterar-usuario');
        
        if (modalElement) {
            this.modal = new bootstrap.Modal(modalElement);
        } else {
            console.warn('⚠️ Modal cadastrar-usuario não encontrado');
        }
        
        if (modalAlterarElement) {
            this.modalAlterar = new bootstrap.Modal(modalAlterarElement);
        } else {
            console.warn('⚠️ Modal alterar-usuario não encontrado');
        }
        
        this.form = document.getElementById('form-cadastrar-usuario');
        this.formAlterar = document.getElementById('form-alterar-usuario');

        // Configurar eventos
        this.setupEvents();

        this.initialized = true;
    }

    /**
     * Método para carregar dados quando a vista é ativada (chamado pelo view-manager)
     */
    async load() {
        console.log('🔄 Carregando UsuarioManager...');
        try {
            // Inicializar se ainda não foi inicializado
            if (!this.initialized) {
                this.init();
            }
            
            // Carregar lista de usuários apenas se há elementos necessários
            if (this.form || this.formAlterar) {
                await this.carregarUsuarios();
            } else {
                console.log('ℹ️ UsuarioManager carregado em modo limitado (elementos DOM não encontrados)');
            }
            
            console.log('✅ UsuarioManager carregado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao carregar UsuarioManager:', error);
        }
    }

    /**
     * Configurar eventos
     */
    setupEvents() {
        // Eventos para modal de cadastro
        if (this.form) {
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCadastroUsuario();
            });
        }

        // Eventos para modal de alterar
        if (this.formAlterar) {
            this.formAlterar.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAlterarUsuario();
            });
        }

        // Seleção de usuário para alterar
        const selecionarUsuario = document.getElementById('selecionar-usuario');
        if (selecionarUsuario) {
            selecionarUsuario.addEventListener('change', (e) => {
                this.selecionarUsuarioParaAlterar(e.target.value);
            });
        }

        // Botão excluir usuário
        const btnExcluir = document.getElementById('btn-excluir-usuario-selecionado');
        if (btnExcluir) {
            btnExcluir.addEventListener('click', () => {
                this.confirmarExclusaoUsuario();
            });
        }

        // Evento para mostrar/ocultar senha - cadastro
        const toggleSenha = document.getElementById('toggle-senha');
        if (toggleSenha) {
            toggleSenha.addEventListener('click', this.toggleSenhaVisibility);
        }

        // Evento para mostrar/ocultar senha - alterar
        const toggleAlterarSenha = document.getElementById('toggle-alterar-senha');
        if (toggleAlterarSenha) {
            toggleAlterarSenha.addEventListener('click', this.toggleAlterarSenhaVisibility);
        }

        // Validação em tempo real - cadastro
        const senhaField = document.getElementById('nova-senha');
        const confirmarSenhaField = document.getElementById('confirmar-senha');

        if (confirmarSenhaField) {
            confirmarSenhaField.addEventListener('input', this.validarSenhas);
        }

        // Validação em tempo real - alterar
        const alterarSenhaField = document.getElementById('alterar-nova-senha');
        const alterarConfirmarSenhaField = document.getElementById('alterar-confirmar-senha');

        if (alterarConfirmarSenhaField) {
            alterarConfirmarSenhaField.addEventListener('input', this.validarAlterarSenhas);
        }

        // Limpar formulário quando modal fecha - cadastro
        const modalElement = document.getElementById('modal-cadastrar-usuario');
        if (modalElement) {
            // INTERCEPTAR ANTES del cierre para evitar problema de foco
            modalElement.addEventListener('hide.bs.modal', () => {
                // Desenfocar ANTES de que Bootstrap aplique aria-hidden
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                console.log('🔧 Focus transferido antes del cierre del modal cadastrar');
            });
            
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.limparFormulario();
                // Enfoque adicional por seguridad
                const focusTarget = document.querySelector('#btn-cadastrar-usuario, input[type="search"], .btn-primary');
                if (focusTarget && focusTarget.offsetParent !== null) {
                    setTimeout(() => focusTarget.focus(), 50);
                } else {
                    setTimeout(() => document.body.focus(), 50);
                }
            });
        }

        // Limpar formulário quando modal fecha - alterar
        const modalAlterarElement = document.getElementById('modal-alterar-usuario');
        if (modalAlterarElement) {
            // INTERCEPTAR ANTES del cierre para evitar problema de foco
            modalAlterarElement.addEventListener('hide.bs.modal', () => {
                // Desenfocar ANTES de que Bootstrap aplique aria-hidden
                if (document.activeElement) document.activeElement.blur();
                document.body.focus();
                console.log('🔧 Focus transferido antes del cierre del modal alterar');
            });
            
            modalAlterarElement.addEventListener('hidden.bs.modal', () => {
                this.limparFormularioAlterar();
                // Enfoque adicional por seguridad
                const focusTarget = document.querySelector('#btn-alterar-usuario, input[type="search"], .btn-primary');
                if (focusTarget && focusTarget.offsetParent !== null) {
                    setTimeout(() => focusTarget.focus(), 50);
                } else {
                    setTimeout(() => document.body.focus(), 50);
                }
            });
            modalAlterarElement.addEventListener('show.bs.modal', () => {
                this.carregarUsuarios();
            });
        }

        // INTERCEPTAR CLICS EN BOTONES DE CERRAR ANTES DE QUE BOOTSTRAP PROCESE
        const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
        closeButtons.forEach(button => {
            const modalId = button.closest('.modal')?.id;
            if (modalId && (modalId.includes('usuario') || modalId.includes('imovel') || modalId.includes('proprietario'))) {
                button.addEventListener('click', (e) => {
                    // Desenfocar inmediatamente ANTES de que Bootstrap inicie el proceso
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    console.log(`🔧 PREEMPTIVE: Focus transferido antes del cierre por botón X en ${modalId}`);
                });
            }
        });

        // Event listeners para botões que abrem modales (adicionado para corrigir problema)
        this.setupModalButtons();
    }

    /**
     * Configurar event listeners para botões que abrem modales
     */
    setupModalButtons() {
        // Botão "Cadastrar Novo Usuário"
        const btnCadastrar = document.getElementById('btn-cadastrar-usuario');
        if (btnCadastrar) {
            btnCadastrar.addEventListener('click', (e) => {
                e.preventDefault();
                this.abrirModalCadastro();
            });
            console.log('✅ Event listener configurado para btn-cadastrar-usuario');
        }

        // Botão "Alterar Usuário" 
        const btnAlterar = document.getElementById('btn-alterar-usuario');
        if (btnAlterar) {
            btnAlterar.addEventListener('click', (e) => {
                e.preventDefault();
                this.abrirModalAlteracao();
            });
            console.log('✅ Event listener configurado para btn-alterar-usuario');
        }
    }

    /**
     * Abrir modal de cadastro
     */
    abrirModalCadastro() {
        console.log('🔄 Abrindo modal de cadastro...');
        if (this.modal) {
            this.limparFormulario();
            this.modal.show();
        } else {
            console.warn('⚠️ Modal de cadastro não disponível');
            alert('Funcionalidade de cadastro não disponível nesta tela');
        }
    }

    /**
     * Abrir modal de alteração
     */
    abrirModalAlteracao() {
        console.log('🔄 Abrindo modal de alteração...');
        if (this.modalAlterar) {
            this.limparFormularioAlterar();
            this.modalAlterar.show();
        } else {
            console.warn('⚠️ Modal de alteração não disponível');
            alert('Funcionalidade de alteração não disponível nesta tela');
        }
    }

    /**
     * Processar cadastro de usuário
     */
    async handleCadastroUsuario() {
        const formData = new FormData(this.form);
        const userData = {
            usuario: formData.get('usuario').trim(),
            senha: formData.get('senha'),
            tipo_de_usuario: formData.get('tipo_de_usuario')
        };

        // Validações frontend
        if (!this.validarDados(userData)) {
            return;
        }

        // Verificar se senhas coincidem
        const confirmarSenha = formData.get('confirmar_senha');
        if (userData.senha !== confirmarSenha) {
            this.mostrarErro('As senhas não coincidem');
            return;
        }

        // Mostrar loading
        this.setLoading(true);
        this.esconderAlerts();

        try {
            // Esperar a que AppConfig esté inicializado si es necesario
            if (!window.AppConfig?.api?.baseUrl) {
                console.log('⏳ AppConfig no inicializado, inicializando...');
                await window.AppConfig?.initNetwork();
            }
            
            const baseUrl = window.AppConfig?.api?.baseUrl || '';
            console.log('🔗 Usando baseUrl:', baseUrl);
            
            const authHeader = window.authService?.getAuthHeader();

            if (!authHeader || !authHeader.Authorization) {
                throw new Error('Token de autenticação não encontrado');
            }

            const response = await fetch(`${baseUrl}/api/auth/cadastrar-usuario`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader.Authorization
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const result = await response.json();
                this.mostrarSucesso(`Usuário '${result.usuario}' cadastrado com sucesso!`);

                // Limpar formulário após sucesso
                setTimeout(() => {
                    // Aplicar la misma solución que proprietarios
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    this.modal.hide();
                    // Limpieza manual de cualquier backdrop residual
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(bd => bd.remove());
                }, 2000);

            } else {
                const error = await response.json();
                this.mostrarErro(error.detail || 'Erro ao cadastrar usuário');
            }

        } catch (error) {
            console.error('Erro no cadastro:', error);
            this.mostrarErro('Erro de conexão com o servidor');
        } finally {
            this.setLoading(false);
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
        const inputs = this.form.querySelectorAll('input, select');

        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Cadastrando...';
            inputs.forEach(input => input.disabled = true);
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save me-1"></i> Cadastrar Usuário';
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Limpar formulário
     */
    limparFormulario() {
        if (this.form) {
            this.form.reset();
        }

        this.esconderAlerts();

        // Limpar validações visuais
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });

        console.log('🧹 Formulário de usuário limpo');
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

            if (response && response.success) {
                this.usuarios = response.data;
                console.log('👥 Usuários carregados:', this.usuarios);
                this.preencherSelectUsuarios();
            } else {
                console.error('❌ Erro na resposta:', response);
                this.mostrarErroAlterar(response?.message || response?.error || 'Erro ao carregar usuários');
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

        if (this.usuarioSelecionado) {
            this.formAlterar.style.display = 'block';
            this.preencherDadosUsuario();
        } else {
            this.formAlterar.style.display = 'none';
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
            const response = await window.apiService.alterarUsuario(this.usuarioSelecionado.id, updateData);

            if (response && response.success) {
                this.mostrarSucessoAlterar(`Usuário '${this.usuarioSelecionado.usuario}' alterado com sucesso!`);

                setTimeout(() => {
                    // Aplicar la misma solución que proprietarios
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    this.modalAlterar.hide();
                    // Limpieza manual de cualquier backdrop residual
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(bd => bd.remove());
                }, 2000);

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
            const response = await window.apiService.excluirUsuario(this.usuarioSelecionado.id);

            if (response && response.success) {
                this.mostrarSucessoAlterar(`Usuário '${this.usuarioSelecionado.usuario}' excluído com sucesso!`);

                setTimeout(() => {
                    // Aplicar la misma solución que proprietarios
                    if (document.activeElement) document.activeElement.blur();
                    document.body.focus();
                    this.modalAlterar.hide();
                    // Limpieza manual de cualquier backdrop residual
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(bd => bd.remove());
                }, 2000);

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
        }

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
    }
}

// Criar instância global
window.usuarioManager = new UsuarioManager();
// Registrar também como usuarioManagerModule para compatibilidade com view-manager
window.usuarioManagerModule = window.usuarioManager;
