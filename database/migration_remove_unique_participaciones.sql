-- Migración para eliminar restricción UNIQUE y permitir versionado histórico
-- Sistema de Alquileres V2

-- 1. Eliminar la restricción UNIQUE que impide el versionado histórico
ALTER TABLE participaciones DROP CONSTRAINT IF EXISTS participaciones_propietario_id_inmueble_id_key;

-- 2. Agregar campo fecha_registro si no existe
ALTER TABLE participaciones ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Actualizar registros existentes que no tengan fecha_registro
UPDATE participaciones 
SET fecha_registro = CURRENT_TIMESTAMP 
WHERE fecha_registro IS NULL;

-- 4. Hacer el campo fecha_registro NOT NULL
ALTER TABLE participaciones ALTER COLUMN fecha_registro SET NOT NULL;

-- 5. Crear índice compuesto para mejorar consultas de participaciones vigentes
CREATE INDEX IF NOT EXISTS idx_participaciones_inmueble_fecha 
ON participaciones(inmueble_id, fecha_registro DESC);

-- 6. Crear índice para consultas de historial
CREATE INDEX IF NOT EXISTS idx_participaciones_historial 
ON participaciones(inmueble_id, propietario_id, fecha_registro DESC);

-- 7. Comentario sobre la nueva estructura
COMMENT ON TABLE participaciones IS 'Tabla de participaciones con versionado histórico. Permite múltiples registros por propietario-inmueble con diferentes fechas para mantener auditoría completa.';

COMMENT ON COLUMN participaciones.fecha_registro IS 'Fecha y hora de registro de esta versión de participación. Usado para versionado histórico.';

-- Mostrar estructura actualizada
\d participaciones;
