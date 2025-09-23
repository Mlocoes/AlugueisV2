-- Migração 010: Alterar precisão da coluna porcentagem na tabela participacoes
-- Data: 23 de setembro de 2025
-- Descrição: Aumentar precisão de Numeric(5,2) para Numeric(10,8) para suportar até 8 casas decimais

-- Remover constraint existente
ALTER TABLE participacoes DROP CONSTRAINT IF EXISTS participacoes_porcentagem_check;

-- Alterar tipo da coluna porcentagem
ALTER TABLE participacoes ALTER COLUMN porcentagem TYPE NUMERIC(10,8);

-- Recriar constraint com nova validação
ALTER TABLE participacoes ADD CONSTRAINT participacoes_porcentagem_check
    CHECK (porcentagem >= 0 AND porcentagem <= 100);

-- Atualizar valores existentes para garantir compatibilidade
UPDATE participacoes SET porcentagem = ROUND(porcentagem, 8) WHERE porcentagem IS NOT NULL;