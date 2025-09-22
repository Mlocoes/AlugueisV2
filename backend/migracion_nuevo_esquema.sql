-- Migración para nuevo esquema relacional SistemaAlquileresV2

-- 1. Crear tabla inmuebles
CREATE TABLE IF NOT EXISTS inmuebles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    direccion VARCHAR(500) NOT NULL,
    tipo VARCHAR(100),
    ciudad VARCHAR(100),
    activo VARCHAR(10) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear tabla propietarios (si no existe, solo agregar campos nuevos si es necesario)
-- (Ya existe en la mayoría de los casos)

-- 3. Crear tabla participaciones
CREATE TABLE IF NOT EXISTS participaciones (
    id SERIAL PRIMARY KEY,
    propietario_id INTEGER NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
    inmueble_id INTEGER NOT NULL REFERENCES inmuebles(id) ON DELETE CASCADE,
    porcentaje NUMERIC(5,2) NOT NULL
);

-- 3.1. Eliminar vista dependiente si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'vista_resumen_propiedad_mes') THEN
        EXECUTE 'DROP VIEW vista_resumen_propiedad_mes';
    END IF;
END$$;

-- 4. Modificar tabla alquileres_simple
ALTER TABLE alquileres_simple
    DROP COLUMN IF EXISTS nombre_propiedad,
    ADD COLUMN IF NOT EXISTS inmueble_id INTEGER REFERENCES inmuebles(id) ON DELETE CASCADE;

-- 5. Actualizar constraints únicos y relaciones
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'uk_alquiler_simple_mes_ano_prop_propietario') THEN
        ALTER TABLE alquileres_simple DROP CONSTRAINT uk_alquiler_simple_mes_ano_prop_propietario;
    END IF;
END$$;

ALTER TABLE alquileres_simple
    ADD CONSTRAINT uk_alquiler_simple_mes_ano_inmueble_propietario UNIQUE (inmueble_id, mes, ano, propietario_id);

-- 6. Crear índices
CREATE INDEX IF NOT EXISTS idx_alquileres_simple_inmueble ON alquileres_simple(inmueble_id);
CREATE INDEX IF NOT EXISTS idx_alquileres_simple_propietario ON alquileres_simple(propietario_id);

-- 7. (Opcional) Migrar datos antiguos de nombre_propiedad a inmueble_id si es necesario
-- (Requiere script adicional si hay datos previos)

-- 8. Listo para usar el nuevo modelo relacional

-- 9. Adicionar coluna ATIVO em PROPRIETARIOS
ALTER TABLE proprietarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;