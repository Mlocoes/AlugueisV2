
class ModalManager {
    constructor(modalCadastroId, modalEdicaoId) {
        console.log(`[ModalManager] new instance with IDs: cadastro=${modalCadastroId}, edicao=${modalEdicaoId}`);
        if (modalCadastroId) {
            const modalCadastroEl = document.getElementById(modalCadastroId);
            if (modalCadastroEl) {
                this.modalCadastro = new bootstrap.Modal(modalCadastroEl);
                console.log(`[ModalManager] Modal de cadastro "${modalCadastroId}" encontrado e inicializado.`);
            } else {
                console.warn(`[ModalManager] Modal com ID "${modalCadastroId}" não encontrado.`);
            }
        }

        if (modalEdicaoId) {
            const modalEdicaoEl = document.getElementById(modalEdicaoId);
            if (modalEdicaoEl) {
                this.modalEdicao = new bootstrap.Modal(modalEdicaoEl);
                console.log(`[ModalManager] Modal de edição "${modalEdicaoId}" encontrado e inicializado.`);
            } else {
                console.warn(`[ModalManager] Modal com ID "${modalEdicaoId}" não encontrado.`);
            }
        }
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
