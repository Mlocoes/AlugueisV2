
class ModalManager {
    constructor(modalCadastroId, modalEdicaoId) {
        if (modalCadastroId) {
            this.modalCadastro = new bootstrap.Modal(document.getElementById(modalCadastroId));
        }
        if (modalEdicaoId) {
            this.modalEdicao = new bootstrap.Modal(document.getElementById(modalEdicaoId));
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
