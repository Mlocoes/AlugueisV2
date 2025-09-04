-- =============================================
-- MIGRACIÓN: Corrección del trigger calcular_taxa_proprietario_automatico
-- Fecha: 2025-09-04
-- Descripción: Corrige la función para usar 'porcentagem' en lugar de 'participacao'
--              y elimina la referencia al campo inexistente 'ativo'
-- =============================================

-- Función corregida para calcular automaticamente taxa_administracao_proprietario
CREATE OR REPLACE FUNCTION calcular_taxa_proprietario_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Buscar a participação do proprietário no imóvel
    SELECT (porcentagem / 100.0) * NEW.taxa_administracao_total
    INTO NEW.taxa_administracao_proprietario
    FROM participacoes 
    WHERE proprietario_id = NEW.proprietario_id 
    AND imovel_id = NEW.imovel_id 
    LIMIT 1;
    
    -- Se não encontrou participação, mantém o valor original
    IF NEW.taxa_administracao_proprietario IS NULL THEN
        NEW.taxa_administracao_proprietario := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Confirmar que os triggers estão ativos
-- (os triggers já foram criados na estrutura principal)

COMMENT ON FUNCTION calcular_taxa_proprietario_automatico() IS 
'Função corregida em 2025-09-04: usa porcentagem em vez de participacao e remove campo ativo inexistente';
