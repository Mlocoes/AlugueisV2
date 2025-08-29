# Nueva Estructura Simplificada de Alquileres

## 🎯 Resumen de Cambios

La base de datos de alquileres ha sido actualizada a una **estructura simplificada** según lo solicitado:

### 📋 Nueva Estructura
- **Nombre propiedad** - Identificación de la propiedad
- **Mes** - Mes del alquiler (1-12)
- **Año** - Año del alquiler
- **Valor de alquiler de cada propietario** - Valor bruto del alquiler
- **Tasa de administración** - Descuento aplicado

## 🗄️ Tabla Principal: `alquileres_simple`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID único del registro |
| `uuid` | TEXT | Identificador UUID único |
| `nombre_propiedad` | VARCHAR(200) | Nombre de la propiedad |
| `mes` | INTEGER | Mes (1-12) |
| `ano` | INTEGER | Año (2020-2100) |
| `nombre_propietario` | VARCHAR(200) | Nombre del propietario |
| `valor_alquiler_propietario` | NUMERIC(12,2) | Valor bruto del alquiler |
| `tasa_administracion` | NUMERIC(12,2) | Tasa de administración |
| `valor_liquido_propietario` | NUMERIC(12,2) | Valor líquido (calculado automáticamente) |
| `inquilino` | VARCHAR(200) | Nombre del inquilino (opcional) |
| `estado_pago` | VARCHAR(20) | Estado: PENDIENTE, PAGADO, ATRASADO |
| `observaciones` | TEXT | Comentarios adicionales |
| `activo` | BOOLEAN | Registro activo |
| `fecha_creacion` | TIMESTAMP | Fecha de creación |
| `fecha_actualizacion` | TIMESTAMP | Fecha de última actualización |

## 🚀 Aplicar la Nueva Estructura

### 1. Ejecutar Migración Automática
```bash
./scripts/aplicar_estructura_simple.sh
```

Este script realizará:
- ✅ Backup de la estructura actual
- ✅ Creación de la nueva estructura
- ✅ Migración de datos existentes
- ✅ Actualización del backend
- ✅ Reinicio de servicios

### 2. Migración Manual (Alternativa)
Si prefiere hacer la migración paso a paso:

```bash
# 1. Ejecutar migración de base de datos
python3 scripts/migrar_estructura_simple.py

# 2. Actualizar backend
mv backend/main.py backend/main_complejo.py
mv backend/main_simple.py backend/main.py

# 3. Reiniciar servicios
docker-compose restart
```

## 📊 Ejemplo de Datos

### Formato JSON (API)
```json
{
    "nombre_propiedad": "Apartamento Centro 101",
    "mes": 1,
    "ano": 2024,
    "nombre_propietario": "João Silva",
    "valor_alquiler_propietario": 1500.00,
    "tasa_administracion": 150.00,
    "inquilino": "Maria Santos",
    "observaciones": "Primeiro pagamento do ano"
}
```

### Formato Excel (Importación)
| nombre_propiedad | mes | ano | nombre_propietario | valor_alquiler_propietario | tasa_administracion | inquilino | observaciones |
|------------------|-----|-----|-------------------|---------------------------|-------------------|-----------|---------------|
| Apartamento Centro 101 | 1 | 2024 | João Silva | 1500.00 | 150.00 | Maria Santos | Primeiro pagamento |
| Apartamento Centro 101 | 1 | 2024 | Ana Costa | 1500.00 | 150.00 | Maria Santos | Primeiro pagamento |

## 🔗 Endpoints de la API

### Principales
- `GET /api/alquileres/` - Listar alquileres
- `POST /api/alquileres/` - Crear alquiler
- `GET /api/alquileres/{id}` - Obtener alquiler específico
- `PUT /api/alquileres/{id}` - Actualizar alquiler
- `DELETE /api/alquileres/{id}` - Eliminar alquiler

### Reportes
- `GET /api/reportes/resumen-mensual?mes={mes}&ano={ano}` - Resumen mensual
- `GET /api/reportes/resumen-propietario?nombre_propietario={nombre}` - Resumen por propietario

### Importación
- `POST /api/import/excel` - Importar desde Excel

## 📥 Importación desde Excel

### Columnas Obligatorias
- `nombre_propiedad`
- `mes`
- `ano`
- `nombre_propietario`
- `valor_alquiler_propietario`

### Columnas Opcionales
- `tasa_administracion` (default: 0.00)
- `inquilino`
- `observaciones`

### Validaciones
- No duplicados (misma propiedad, propietario, mes y año)
- Valores numéricos positivos
- Mes entre 1 y 12
- Año entre 2020 y 2100

## 🛠️ Uso de la API

### Crear Alquiler
```bash
curl -X POST "http://localhost:8000/api/alquileres/" \
     -H "Content-Type: application/json" \
     -d '{
       "nombre_propiedad": "Apartamento Centro 101",
       "mes": 1,
       "ano": 2024,
       "nombre_propietario": "João Silva",
       "valor_alquiler_propietario": 1500.00,
       "tasa_administracion": 150.00,
       "inquilino": "Maria Santos"
     }'
```

### Listar Alquileres con Filtros
```bash
# Todos los alquileres
curl "http://localhost:8000/api/alquileres/"

# Por mes y año
curl "http://localhost:8000/api/alquileres/?mes=1&ano=2024"

# Por propiedad
curl "http://localhost:8000/api/alquileres/?nombre_propiedad=Centro"

# Por propietario
curl "http://localhost:8000/api/alquileres/?nombre_propietario=João"
```

### Obtener Resumen Mensual
```bash
curl "http://localhost:8000/api/reportes/resumen-mensual?mes=1&ano=2024"
```

### Obtener Resumen por Propietario
```bash
curl "http://localhost:8000/api/reportes/resumen-propietario?nombre_propietario=João Silva"
```

## 📚 Documentación de API

Una vez iniciado el sistema, accede a:
- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

## 🔄 Ventajas de la Nueva Estructura

1. **Simplicidad**: Una sola tabla principal
2. **Flexibilidad**: Fácil de entender y mantener
3. **Performance**: Consultas más rápidas
4. **Escalabilidad**: Estructura optimizada para crecimiento
5. **Mantenimiento**: Menos complejidad en las relaciones

## 🗂️ Archivos Importantes

- `backend/models_simple.py` - Modelos de datos simplificados
- `backend/main_simple.py` - API simplificada
- `database/init-scripts/003_nueva_estructura_alquileres.sql` - Script de migración
- `scripts/migrar_estructura_simple.py` - Script de migración Python
- `scripts/aplicar_estructura_simple.sh` - Script de migración completa

## 💾 Backup y Seguridad

Durante la migración se crean automáticamente:
- Backup de tablas existentes (`backup_*_YYYYMMDD_HHMMSS`)
- Backup de archivos de backend (`*_backup_YYYYMMDD_HHMMSS.py`)
- Log completo del proceso de migración

Los datos originales se mantienen seguros y la migración es reversible.
