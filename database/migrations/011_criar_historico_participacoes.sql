-- Migração 011: Criar tabela de histórico de participações
-- Data: 23 de setembro de 2025
-- Descrição: Cria tabela para manter histórico das alterações nas participações

CREATE TABLE historico_participacoes (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    versao_id VARCHAR(50) NOT NULL,
    data_versao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    porcentagem NUMERIC(10,8) NOT NULL DEFAULT 0.00000000,
    data_registro_original TIMESTAMP NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id),
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id)
);

-- Índices para performance
CREATE INDEX idx_historico_participacoes_versao_imovel ON historico_participacoes(versao_id, imovel_id);
CREATE INDEX idx_historico_participacoes_data ON historico_participacoes(data_versao);

-- Restrição única para evitar duplicatas na mesma versão
ALTER TABLE historico_participacoes
ADD CONSTRAINT uniq_historico_participacao_versao
UNIQUE (versao_id, imovel_id, proprietario_id);