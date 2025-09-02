-- Migración para agregar campo nome_transferencia a la tabla extras
-- Fecha: 2 de septiembre de 2025

-- Agregar columna nome_transferencia
ALTER TABLE extras ADD COLUMN IF NOT EXISTS nome_transferencia VARCHAR(300);

-- Comentario sobre la columna
COMMENT ON COLUMN extras.nome_transferencia IS 'Nome da transferência cadastrada';

-- Confirmar la migración
INSERT INTO alembic_version (version_num) VALUES ('add_nome_transferencia_001')
ON CONFLICT (version_num) DO NOTHING;
