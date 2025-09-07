/**
 * Utilidades de seguridad para prevenir ataques XSS
 */

/**
 * Escapa caracteres HTML peligrosos para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} - Texto escapado
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Sanitiza un objeto de datos escapando todos los valores string
 * @param {Object} data - Objeto con datos a sanitizar
 * @returns {Object} - Objeto con valores escapados
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            sanitized[key] = escapeHtml(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Crea un elemento DOM de forma segura con texto escapado
 * @param {string} tagName - Nombre del elemento a crear
 * @param {string} textContent - Contenido de texto (será escapado)
 * @param {Object} attributes - Atributos a establecer
 * @returns {HTMLElement} - Elemento creado
 */
function createSafeElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    if (textContent) {
        element.textContent = textContent;
    }
    
    for (const [attr, value] of Object.entries(attributes)) {
        element.setAttribute(attr, value);
    }
    
    return element;
}

/**
 * Establece contenido HTML de forma segura, escapando datos del usuario
 * @param {HTMLElement} element - Elemento donde establecer el contenido
 * @param {string} htmlTemplate - Template HTML con placeholders
 * @param {Object} data - Datos a insertar (serán escapados)
 */
function setSafeHTML(element, htmlTemplate, data = {}) {
    const sanitizedData = sanitizeData(data);
    
    // Reemplazar placeholders en el template con datos escapados
    let safeHTML = htmlTemplate;
    for (const [key, value] of Object.entries(sanitizedData)) {
        const placeholder = new RegExp(`\\$\\{${key}\\}`, 'g');
        safeHTML = safeHTML.replace(placeholder, value || '');
    }
    
    element.innerHTML = safeHTML;
}

// Exportar funciones para uso global
window.SecurityUtils = {
    escapeHtml,
    sanitizeData,
    createSafeElement,
    setSafeHTML
};
