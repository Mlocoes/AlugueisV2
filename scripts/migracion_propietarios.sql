-- 1. Crear tabla propietarios
CREATE TABLE IF NOT EXISTS propietarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    nombre_completo VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    activo INTEGER DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agregar columna propietario_id a alquileres_simple (temporalmente NULL)
ALTER TABLE alquileres_simple ADD COLUMN IF NOT EXISTS propietario_id INTEGER;

-- 3. Poblar tabla propietarios con los nombres únicos de alquileres_simple
INSERT INTO propietarios (nombre)
SELECT DISTINCT nombre_propietario FROM alquileres_simple
ON CONFLICT (nombre) DO NOTHING;

-- 4. Actualizar alquileres_simple.propietario_id según el nombre
UPDATE alquileres_simple a
SET propietario_id = p.id
FROM propietarios p
WHERE a.nombre_propietario = p.nombre;

-- 5. Hacer propietario_id NOT NULL
ALTER TABLE alquileres_simple ALTER COLUMN propietario_id SET NOT NULL;

-- 6. Crear la clave foránea
ALTER TABLE alquileres_simple
ADD CONSTRAINT fk_alquileres_simple_propietario FOREIGN KEY (propietario_id)
REFERENCES propietarios(id);

-- 7. (Opcional) Eliminar columna antigua de nombre_propietario
-- ALTER TABLE alquileres_simple DROP COLUMN nombre_propietario;

-- 8. (Opcional) Actualizar nombre_completo, telefono, email en propietarios según información adicional si existe
-- (Esto depende de si tienes esos datos en otra tabla o Excel)

-- 9. (Opcional) Repetir proceso para inmuebles y participaciones si se requiere estructura relacional completa
