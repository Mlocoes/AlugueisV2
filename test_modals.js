// Script de teste para verificar os modales na página de Importar
// Execute este código no console do navegador na página de importar

console.log('🧪 Testando modales de Novo Proprietário e Novo Imóvel...');

// Função para testar se um modal existe e pode ser aberto
function testModal(modalId, buttonId, description) {
    console.log(`\n📋 Testando ${description}:`);
    
    // 1. Verificar se o botão existe
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`❌ Botão ${buttonId} não encontrado`);
        return false;
    }
    console.log(`✅ Botão ${buttonId} encontrado`);
    
    // 2. Verificar se o modal existe
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`❌ Modal ${modalId} não encontrado`);
        return false;
    }
    console.log(`✅ Modal ${modalId} encontrado`);
    
    // 3. Verificar se o botão tem os atributos corretos
    const toggle = button.getAttribute('data-bs-toggle');
    const target = button.getAttribute('data-bs-target');
    if (toggle !== 'modal' || target !== `#${modalId}`) {
        console.error(`❌ Botão não tem atributos corretos. Toggle: ${toggle}, Target: ${target}`);
        return false;
    }
    console.log(`✅ Atributos do botão corretos`);
    
    // 4. Verificar se Bootstrap está disponível
    if (typeof bootstrap === 'undefined') {
        console.error('❌ Bootstrap não está disponível');
        return false;
    }
    console.log(`✅ Bootstrap disponível`);
    
    // 5. Testar abertura do modal
    try {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        console.log(`✅ Modal ${modalId} aberto com sucesso`);
        
        // Fechar após 2 segundos
        setTimeout(() => {
            bsModal.hide();
            console.log(`✅ Modal ${modalId} fechado`);
        }, 2000);
        
        return true;
    } catch (error) {
        console.error(`❌ Erro ao abrir modal: ${error.message}`);
        return false;
    }
}

// Aguardar um pouco e depois testar
setTimeout(() => {
    console.log('🎯 Iniciando testes dos modais...');
    
    // Verificar se estamos na página de importar
    const importarContainer = document.querySelector('.importar-container');
    if (!importarContainer) {
        console.error('❌ Não estamos na página de importar. Navegue para a seção "Importar" primeiro.');
        return;
    }
    
    console.log('✅ Estamos na página de importar');
    
    // Testar modal de Novo Proprietário
    const test1 = testModal('novo-proprietario-modal', 'btn-novo-proprietario', 'Modal Novo Proprietário');
    
    // Aguardar um pouco entre os testes
    setTimeout(() => {
        // Testar modal de Novo Imóvel
        const test2 = testModal('novo-imovel-importar-modal', 'btn-novo-imovel-importar', 'Modal Novo Imóvel');
        
        // Resultado final
        setTimeout(() => {
            console.log('\n🏁 Resultado dos testes:');
            console.log(`Modal Novo Proprietário: ${test1 ? '✅ FUNCIONANDO' : '❌ FALHOU'}`);
            console.log(`Modal Novo Imóvel: ${test2 ? '✅ FUNCIONANDO' : '❌ FALHOU'}`);
            
            if (test1 && test2) {
                console.log('\n🎉 TODOS OS MODAIS ESTÃO FUNCIONANDO CORRETAMENTE!');
            } else {
                console.log('\n⚠️ Alguns modais não estão funcionando. Verifique os erros acima.');
            }
        }, 3000);
    }, 3000);
}, 1000);
