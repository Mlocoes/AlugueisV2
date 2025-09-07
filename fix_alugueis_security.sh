#!/bin/bash

# Script para aplicar correcciones de seguridad XSS en alugueis.js

FILE="/home/mloco/Escritorio/AlugueisV1/frontend/src/js/modules/alugueis.js"

echo "Aplicando correcciones de seguridad XSS en alugueis.js..."

# 1. Corregir populateAnoDropdown - línea 86-88
sed -i '86s/.*/        const options = ['\''<option value="">Selecione o ano<\/option>'\''];/' "$FILE"
sed -i '87s/.*/        this.anosDisponiveis.forEach(ano => {/' "$FILE"
sed -i '88s/.*/            options.push(`<option value="${SecurityUtils.escapeHtml(ano)}">${SecurityUtils.escapeHtml(ano)}<\/option>`);/' "$FILE"
sed -i '89i\        });' "$FILE"
sed -i '90i\        SecurityUtils.setSafeHTML(anoSelect, options.join(""));' "$FILE"

# 2. Corregir populateMesDropdown - líneas 104, 107, 124
sed -i '104s/.*/        SecurityUtils.setSafeHTML(mesSelect, '\''<option value="">Selecione o mês<\/option>'\'');/' "$FILE"
sed -i '107s/.*/            SecurityUtils.setSafeHTML(mesSelect, mesSelect.innerHTML + '\''<option value="todos">Todos os meses<\/option>'\'');/' "$FILE"
sed -i '124s/.*/                const option = SecurityUtils.createSafeElement("option", { value: m.num, textContent: m.nome });/' "$FILE"
sed -i '125i\                mesSelect.appendChild(option);' "$FILE"

# 3. Corregir clearMatriz - líneas 233-234
sed -i '233s/.*/        if (tableHead) SecurityUtils.setSafeHTML(tableHead, "");/' "$FILE"
sed -i '234s/.*/        if (tableBody) SecurityUtils.setSafeHTML(tableBody, '\''<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.<\/td><\/tr>'\'');/' "$FILE"

# 4. Corregir renderMatriz - líneas 248-249, 259, 280
sed -i '248s/.*/            SecurityUtils.setSafeHTML(tableHead, "");/' "$FILE"
sed -i '249s/.*/            SecurityUtils.setSafeHTML(tableBody, '\''<tr><td colspan="5" class="text-center text-muted">Nenhum aluguel encontrado.<\/td><\/tr>'\'');/' "$FILE"
sed -i '259s/.*/        SecurityUtils.setSafeHTML(tableHead, headHtml);/' "$FILE"
sed -i '280s/.*/        SecurityUtils.setSafeHTML(tableBody, bodyHtml);/' "$FILE"

echo "Correcciones aplicadas exitosamente."
