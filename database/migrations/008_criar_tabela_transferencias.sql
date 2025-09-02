-- Migração: Crear tabla de transferencias separada
-- Data: 2025-09-02
-- Objetivo: Separar aliases de transferencias para tener IDs únicos por transferencia

-- Crear tabla de transferencias
CREATE TABLE IF NOT EXISTS transferencias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias_id INTEGER NOT NULL REFERENCES extras(id) ON DELETE CASCADE,
    nome_transferencia VARCHAR(300) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    id_proprietarios TEXT, -- JSON con [{"id": 1, "valor": 100.50}, {"id": 2, "valor": 200.75}]
    origem_id_proprietario INTEGER REFERENCES proprietarios(id),
    destino_id_proprietario INTEGER REFERENCES proprietarios(id),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transferencias_alias_id ON transferencias(alias_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_data_criacao ON transferencias(data_criacao);
CREATE INDEX IF NOT EXISTS idx_transferencias_ativo ON transferencias(ativo);

-- Comentários sobre campos da tabela transferencias
COMMENT ON TABLE transferencias IS 'Tabela para armazenar transferências cadastradas com IDs únicos';
COMMENT ON COLUMN transferencias.alias_id IS 'ID do alias (grupo de proprietários) ao qual a transferência pertence';
COMMENT ON COLUMN transferencias.nome_transferencia IS 'Nome identificador da transferência';
COMMENT ON COLUMN transferencias.valor_total IS 'Valor total da transferência (soma de todos os proprietários)';
COMMENT ON COLUMN transferencias.id_proprietarios IS 'JSON array com objetos {id: number, valor: number} dos proprietários e seus valores';
COMMENT ON COLUMN transferencias.origem_id_proprietario IS 'ID do proprietário origem para transferências individuais';
COMMENT ON COLUMN transferencias.destino_id_proprietario IS 'ID do proprietário destino para transferências individuais';
COMMENT ON COLUMN transferencias.data_criacao IS 'Data de criação da transferência';
COMMENT ON COLUMN transferencias.data_fim IS 'Data de fim ou conclusão da transferência';
COMMENT ON COLUMN transferencias.ativo IS 'Se a transferência está ativa';

-- Migrar dados existentes de extras para transferencias (se existirem transferências)
INSERT INTO transferencias (alias_id, nome_transferencia, valor_total, id_proprietarios, origem_id_proprietario, destino_id_proprietario, data_criacao, data_fim, ativo)
SELECT 
    id as alias_id,
    COALESCE(nome_transferencia, 'Transferência ' || id) as nome_transferencia,
    COALESCE(valor_transferencia, 0) as valor_total,
    id_proprietarios,
    origem_id_proprietario,
    destino_id_proprietario,
    data_criacao,
    data_fim,
    ativo
FROM extras 
WHERE nome_transferencia IS NOT NULL AND nome_transferencia != '';

-- Limpiar campos de transferencia de la tabla extras (mantener solo datos de alias)
ALTER TABLE extras DROP COLUMN IF EXISTS valor_transferencia;
ALTER TABLE extras DROP COLUMN IF EXISTS nome_transferencia;
ALTER TABLE extras DROP COLUMN IF EXISTS origem_id_proprietario;
ALTER TABLE extras DROP COLUMN IF EXISTS destino_id_proprietario;
ALTER TABLE extras DROP COLUMN IF EXISTS data_fim;

-- Comentário final
COMMENT ON TABLE extras IS 'Tabela para aliases (grupos de proprietários) - transferências agora em tabela separada';
