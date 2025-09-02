-- Migración para renombrar columna data_atualizacao a data_fim en tabla extras
-- Fecha: 2 de septiembre de 2025

-- Renombrar columna data_atualizacao a data_fim
ALTER TABLE extras RENAME COLUMN data_atualizacao TO data_fim;

-- Comentario sobre la columna
COMMENT ON COLUMN extras.data_fim IS 'Data de fim ou última atualização da transferência';

-- Confirmar la migración
INSERT INTO alembic_version (version_num) VALUES ('rename_data_atualizacao_to_data_fim_001')
ON CONFLICT (version_num) DO NOTHING;
