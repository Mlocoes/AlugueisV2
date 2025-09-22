
class ModalManager {
    constructor(modalCadastroId, modalEdicaoId) {
        console.log(`[ModalManager] new instance with IDs: cadastro=${modalCadastroId}, edicao=${modalEdicaoId}`);
        if (modalCadastroId) {
            const modalCadastroEl = document.getElementById(modalCadastroId);
            if (modalCadastroEl) {
                this.modalCadastro = new bootstrap.Modal(modalCadastroEl);
                this.modalCadastroTitleEl = modalCadastroEl.querySelector('.modal-title'); // Store title element
                console.log(`[ModalManager] Modal de cadastro "${modalCadastroId}" encontrado e inicializado.`);
            } else {
                console.warn(`[ModalManager] Modal com ID "${modalCadastroId}" não encontrado.`);
            }
        }

        if (modalEdicaoId) {
            const modalEdicaoEl = document.getElementById(modalEdicaoId);
            if (modalEdicaoEl) {
                this.modalEdicao = new bootstrap.Modal(modalEdicaoEl);
                this.modalEdicaoTitleEl = modalEdicaoEl.querySelector('.modal-title'); // Store title element
                console.log(`[ModalManager] Modal de edição "${modalEdicaoId}" encontrado e inicializado.`);
            } else {
                console.warn(`[ModalManager] Modal com ID "${modalEdicaoId}" não encontrado.`);
            }
        }
    }

    setTitle(title) {
        if (this.modalCadastroTitleEl) { // Assuming setTitle is for the cadastro modal
            this.modalCadastroTitleEl.innerHTML = title;
        } else if (this.modalEdicaoTitleEl) { // Fallback for edit modal if cadastro not present
            this.modalEdicaoTitleEl.innerHTML = title;
        }
    }

    show() { // Add a generic show method to simplify calls from modules
        this.abrirModalCadastro(); // Assuming show() means show the cadastro modal
    }

    hide() { // Add a generic hide method
        this.fecharModalCadastro(); // Assuming hide() means hide the cadastro modal
    }

    abrirModalCadastro() {
        if (this.modalCadastro) {
            // Note: a limpeza do formulário deve ser feita no módulo específico
            this.modalCadastro.show();
        }
    }

    fecharModalCadastro() {
        if (this.modalCadastro) {
            console.log('[ModalManager] fechando modal de cadastro... instancia encontrada:', this.modalCadastro);
            this.modalCadastro.hide();
        } else {
            console.warn('[ModalManager] fecharModalCadastro chamado, mas instancia não existe');
        }
    }

    abrirModalEdicao() {
        if (this.modalEdicao) {
            this.modalEdicao.show();
        }
    }

    fecharModalEdicao() {
        if (this.modalEdicao) {
            this.modalEdicao.hide();
        }
    }
}
