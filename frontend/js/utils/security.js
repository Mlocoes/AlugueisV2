/**
 * Utilidades de segurança para prevenir ataques XSS, refatorado com DOMPurify.
 */

/**
 * Escapa caracteres HTML para prevenir injeção de template.
 * @param {string} text - Texto a escapar.
 * @returns {string} - Texto escapado.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    
    // Usa textContent para garantir que o navegador trate o texto como puro, sem interpretar HTML.
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Sanitiza um objeto de dados escapando todos os seus valores de string.
 * @param {Object} data - Objeto a ser sanitizado.
 * @returns {Object} - Objeto com valores escapados.
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            sanitized[key] = escapeHtml(value);
        } else if (typeof value === 'object' && value !== null) {
            // Recursivamente sanitiza objetos aninhados.
            sanitized[key] = sanitizeData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Cria um elemento DOM de forma segura com conteúdo de texto.
 * @param {string} tagName - Nome da tag do elemento.
 * @param {string} textContent - Conteúdo de texto (será definido de forma segura).
 * @param {Object} attributes - Atributos a serem definidos no elemento.
 * @returns {HTMLElement} - O elemento criado.
 */
function createSafeElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    // Usa textContent para inserir texto de forma segura, prevenindo XSS.
    if (textContent) {
        element.textContent = textContent;
    }
    
    for (const [attr, value] of Object.entries(attributes)) {
        element.setAttribute(attr, String(value));
    }
    
    return element;
}

/**
 * Define conteúdo HTML de forma segura em um elemento, usando DOMPurify.
 * @param {HTMLElement} element - O elemento onde o conteúdo será inserido.
 * @param {string} htmlString - A string HTML a ser sanitizada e inserida.
 * @param {Object} data - Objeto com dados a serem inseridos no template (opcional).
 */
function setSafeHTML(element, htmlString, data = {}) {
    if (typeof DOMPurify === 'undefined') {
        console.error('DOMPurify não está carregado. O conteúdo não será renderizado por segurança.');
        element.textContent = 'Erro: Biblioteca de segurança não carregada.';
        return;
    }

    let finalHtml = htmlString;

    // Se dados forem fornecidos, substitui os placeholders com os dados escapados.
    if (data && typeof data === 'object') {
        const sanitizedData = sanitizeData(data);
        finalHtml = htmlString.replace(/\$\{(\w+)\}/g, (match, key) => {
            return sanitizedData.hasOwnProperty(key) ? sanitizedData[key] : '';
        });
    }
    
    // Sanitiza a string HTML final com DOMPurify para remover qualquer XSS.
    const cleanHtml = DOMPurify.sanitize(finalHtml);

    // Insere o HTML limpo no elemento.
    element.innerHTML = cleanHtml;
}


// Exporta as funções para uso global.
window.SecurityUtils = {
    escapeHtml,
    sanitizeData,
    createSafeElement,
    setSafeHTML
};

console.log('🛡️ SecurityUtils com DOMPurify carregado.');