#!/bin/bash

# Script para cargar datos de prueba consistentes
# Sistema de Alquileres V2

set -e

echo "=== CARGANDO DATOS DE PRUEBA CONSISTENTES ==="

# Configuración de conexión a la base de datos
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="alquileresv2_db"
DB_USER="alquileresv2_user"
DB_PASSWORD="alquileresv2_pass"

echo "🔗 Conectando a la base de datos..."

# Función para ejecutar SQL
execute_sql() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

echo "📊 Insertando propietarios de prueba..."

# Insertar propietarios
execute_sql "INSERT INTO propietarios (nombre, apellido, email, telefono, activo, nombre_completo) VALUES 
('Juan', 'Pérez', 'juan.perez@email.com', '11-1234-5678', true, 'Juan Pérez'),
('María', 'González', 'maria.gonzalez@email.com', '11-2345-6789', true, 'María González'),
('Carlos', 'Rodríguez', 'carlos.rodriguez@email.com', '11-3456-7890', true, 'Carlos Rodríguez'),
('Ana', 'Silva', 'ana.silva@email.com', '11-4567-8901', true, 'Ana Silva'),
('Pedro', 'Santos', 'pedro.santos@email.com', '11-5678-9012', true, 'Pedro Santos');"

echo "🏢 Insertando inmuebles de prueba..."

# Insertar inmuebles
execute_sql "INSERT INTO inmuebles (nombre, direccion_completa, activo) VALUES 
('Apartamento Central 101', 'Av. Corrientes 1234, CABA', true),
('Casa Jardín Norte', 'Calle Falsa 123, San Isidro', true),
('Comercial Vila Madalena', 'Rua Augusta 456, São Paulo', true),
('Apartamento Ipanema', 'Rua Visconde 789, Rio de Janeiro', true),
('Casa Pinheiros', 'Rua dos Pinheiros 321, São Paulo', true);"

echo "📈 Insertando participaciones consistentes..."

# Obtener IDs de propietarios e inmuebles
PROPIETARIOS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM propietarios ORDER BY id LIMIT 5;")
INMUEBLES=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT id FROM inmuebles ORDER BY id LIMIT 5;")

# Convertir a arrays
PROP_ARRAY=($PROPIETARIOS)
INM_ARRAY=($INMUEBLES)

echo "Propietarios encontrados: ${PROP_ARRAY[@]}"
echo "Inmuebles encontrados: ${INM_ARRAY[@]}"

# Participaciones que sumen exactamente 100%
# Inmueble 1: Juan 60%, María 40%
execute_sql "INSERT INTO participaciones (inmueble_id, propietario_id, porcentaje, fecha_registro) VALUES 
(${INM_ARRAY[0]}, ${PROP_ARRAY[0]}, 60.00, NOW()),
(${INM_ARRAY[0]}, ${PROP_ARRAY[1]}, 40.00, NOW());"

# Inmueble 2: Carlos 100%
execute_sql "INSERT INTO participaciones (inmueble_id, propietario_id, porcentaje, fecha_registro) VALUES 
(${INM_ARRAY[1]}, ${PROP_ARRAY[2]}, 100.00, NOW());"

# Inmueble 3: Ana 50%, Pedro 30%, Carlos 20%
execute_sql "INSERT INTO participaciones (inmueble_id, propietario_id, porcentaje, fecha_registro) VALUES 
(${INM_ARRAY[2]}, ${PROP_ARRAY[3]}, 50.00, NOW()),
(${INM_ARRAY[2]}, ${PROP_ARRAY[4]}, 30.00, NOW()),
(${INM_ARRAY[2]}, ${PROP_ARRAY[2]}, 20.00, NOW());"

# Inmueble 4: Juan 25%, María 25%, Ana 25%, Pedro 25%
execute_sql "INSERT INTO participaciones (inmueble_id, propietario_id, porcentaje, fecha_registro) VALUES 
(${INM_ARRAY[3]}, ${PROP_ARRAY[0]}, 25.00, NOW()),
(${INM_ARRAY[3]}, ${PROP_ARRAY[1]}, 25.00, NOW()),
(${INM_ARRAY[3]}, ${PROP_ARRAY[3]}, 25.00, NOW()),
(${INM_ARRAY[3]}, ${PROP_ARRAY[4]}, 25.00, NOW());"

# Inmueble 5: María 80%, Carlos 20%
execute_sql "INSERT INTO participaciones (inmueble_id, propietario_id, porcentaje, fecha_registro) VALUES 
(${INM_ARRAY[4]}, ${PROP_ARRAY[1]}, 80.00, NOW()),
(${INM_ARRAY[4]}, ${PROP_ARRAY[2]}, 20.00, NOW());"

echo "📊 Verificando consistencia de datos..."

# Verificar que todas las participaciones sumen 100%
execute_sql "SELECT 
    i.nombre as inmueble,
    COALESCE(SUM(p.porcentaje), 0) as total_porcentaje
FROM inmuebles i 
LEFT JOIN participaciones p ON i.id = p.inmueble_id 
GROUP BY i.id, i.nombre 
ORDER BY i.id;"

echo "✅ Datos de prueba cargados exitosamente!"
echo ""
echo "📋 RESUMEN DE DATOS CARGADOS:"
echo "- 5 Propietarios"
echo "- 5 Inmuebles" 
echo "- Participaciones consistentes (todas suman 100%)"
echo ""
echo "🎯 El sistema está listo para pruebas!"
