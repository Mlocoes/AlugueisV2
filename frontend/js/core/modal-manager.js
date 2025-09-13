
class ModalManager {
    constructor(modalCadastroId, modalEdicaoId) {
        if (modalCadastroId) {
            const modalCadastroEl = document.getElementById(modalCadastroId);
            if (modalCadastroEl) {
                this.modalCadastro = new bootstrap.Modal(modalCadastroEl);
            } else {
                console.warn(`Modal com ID "${modalCadastroId}" não encontrado.`);
            }
        }

        if (modalEdicaoId) {
            const modalEdicaoEl = document.getElementById(modalEdicaoId);
            if (modalEdicaoEl) {
                this.modalEdicao = new bootstrap.Modal(modalEdicaoEl);
            } else {
                console.warn(`Modal com ID "${modalEdicaoId}" não encontrado.`);
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
            this.modalCadastro.hide();
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
