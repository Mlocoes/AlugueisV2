# Scripts para Gestión de Base de Datos - Sistema de Alquileres V2

## 📋 Resumen de Scripts Creados

Se han creado **4 scripts** para gestionar la base de datos del Sistema de Alquileres V2:

### 1. 🐍 `vaciar_base_datos.py` - Script Python Completo
- **Propósito**: Script principal para vaciar la base de datos con máxima seguridad
- **Características**:
  - ✅ Confirmación obligatoria (`SI CONFIRMO`)
  - ✅ Verificación de conexión antes de proceder
  - ✅ Muestra estado antes y después de la limpieza
  - ✅ Respeta foreign keys en orden correcto
  - ✅ Reinicia secuencias automáticamente
  - ✅ Optimiza tablas después de la limpieza
  - ✅ Manejo completo de errores
  - ✅ Logs detallados del proceso

### 2. 🔧 `vaciar_base_datos.sh` - Script Shell Simple
- **Propósito**: Script shell básico para limpieza rápida
- **Características**:
  - ✅ Más rápido para uso ocasional
  - ✅ Requiere PostgreSQL client (`psql`)
  - ✅ Confirmación simple
  - ✅ Colores en la salida
  - ✅ Verificación de estado final

### 3. 🛠️ `gestionar_db.sh` - Script Shell Avanzado
- **Propósito**: Herramienta completa de gestión de base de datos
- **Características**:
  - ✅ **Múltiples funciones**: clean, backup, restore, status, reset
  - ✅ **Backups automáticos** con compresión
  - ✅ **Restauración** desde backups
  - ✅ **Estado detallado** de la base de datos
  - ✅ **Reset completo**: backup + clean + status
  - ✅ **Gestión de archivos** de backup
  - ✅ Interfaz de línea de comandos completa

### 4. 📊 `estado_db.py` - Consulta de Estado Rápida
- **Propósito**: Script ligero para consultar el estado actual sin modificar nada
- **Características**:
  - ✅ **Solo lectura** - no modifica datos
  - ✅ **Información detallada** por tabla
  - ✅ **Estadísticas útiles** (propietarios únicos, participación promedio)
  - ✅ **Tamaño de la base de datos**
  - ✅ **Ejecución rápida** para monitoreo

## 🚀 Cómo Usar los Scripts

### Preparación (Solo una vez)
```bash
cd /home/mloco/Escritorio/SistemaAlquileresV2

# Los scripts ya están configurados y listos para usar
# El entorno virtual ya está creado en venv_scripts/
```

### Opción 1: Script Python (Recomendado)
```bash
# Vaciar la base de datos completamente
./vaciar_base_datos.py

# El script pedirá confirmación escribiendo 'SI CONFIRMO'
```

### Opción 2: Script Shell Simple
```bash
# Vaciar la base de datos (requiere psql instalado)
./vaciar_base_datos.sh

# Instalar psql si es necesario:
# sudo apt-get install postgresql-client
```

### Opción 3: Script Shell Avanzado (Más Completo)
```bash
# Ver ayuda
./gestionar_db.sh help

# Ver estado actual de la base de datos
./gestionar_db.sh status

# Crear backup antes de limpiar
./gestionar_db.sh backup

# Solo limpiar la base de datos
./gestionar_db.sh clean

# Reset completo: backup + clean + status
./gestionar_db.sh reset

# Restaurar desde backup
./gestionar_db.sh restore

# Listar backups disponibles
./gestionar_db.sh list
```

### Opción 4: Consulta de Estado (Sin modificaciones)
```bash
# Ver estado actual sin modificar nada
./estado_db.py

# Ideal para monitoreo regular y verificación rápida
```
```bash
# Ver ayuda
./gestionar_db.sh help

# Ver estado actual de la base de datos
./gestionar_db.sh status

# Crear backup antes de limpiar
./gestionar_db.sh backup

# Solo limpiar la base de datos
./gestionar_db.sh clean

# Reset completo: backup + clean + status
./gestionar_db.sh reset

# Restaurar desde backup
./gestionar_db.sh restore

# Listar backups disponibles
./gestionar_db.sh list
```

## 📊 Estado de la Base de Datos

### Tablas que se limpian (en orden):
1. `alquileres_detalle` - Detalles de distribuciones de alquileres
2. `alquileres_mensuales` - Alquileres mensuales
3. `participaciones` - Participaciones de propietarios en inmuebles
4. `inmuebles` - Inmuebles/propiedades
5. `propietarios` - Propietarios

### Lo que hacen los scripts:
- ✅ **Eliminan TODOS los datos** de todas las tablas
- ✅ **Mantienen la estructura** de las tablas
- ✅ **Reinician las secuencias** (IDs empiezan desde 1)
- ✅ **Optimizan las tablas** (VACUUM ANALYZE)
- ✅ **Respetan foreign keys** (orden correcto de eliminación)

## ⚠️ Advertencias Importantes

### 🔴 ACCIÓN DESTRUCTIVA
- **TODOS los datos se perderán permanentemente**
- **No hay forma de deshacer** una vez ejecutado
- **Crear backup** antes si es necesario

### 🛡️ Medidas de Seguridad
- Confirmación obligatoria (`SI CONFIRMO`)
- Verificación de conexión antes de proceder
- Logs detallados de todo el proceso
- Manejo de errores robusto

### 💡 Recomendaciones
1. **Usar `./gestionar_db.sh reset`** para máxima seguridad (incluye backup automático)
2. **Verificar que no hay usuarios** usando el sistema antes de limpiar
3. **Reiniciar la aplicación web** después de limpiar la base de datos
4. **Probar la importación** después de la limpieza

## 🔄 Después de Limpiar la Base de Datos

1. **Reiniciar el servidor backend**:
   ```bash
   cd backend
   # Detener el servidor actual (Ctrl+C)
   # Reiniciar:
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Verificar en la aplicación web**:
   - Todas las listas deben estar vacías
   - Los contadores deben mostrar 0
   - La importación debe funcionar correctamente

3. **Importar datos nuevos**:
   - Usar el botón "Importar Completo" con archivo Excel
   - O importar propietarios e inmuebles por separado

## 📁 Estructura de Archivos

```
SistemaAlquileresV2/
├── vaciar_base_datos.py      # Script Python principal
├── vaciar_base_datos.sh      # Script shell simple  
├── gestionar_db.sh           # Script shell avanzado
├── estado_db.py              # Consulta de estado rápida
├── venv_scripts/             # Entorno virtual para scripts
├── database/backups/         # Directorio de backups (se crea automáticamente)
└── GESTION_BASE_DATOS.md     # Este archivo de documentación
```

## 🆘 Solución de Problemas

### Error: "No se puede conectar a la base de datos"
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar que el contenedor esté activo
docker-compose ps

# Reiniciar el contenedor si es necesario
docker-compose restart postgres
```

### Error: "psql no está instalado" (solo scripts shell)
```bash
# Instalar cliente PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-client

# O usar el script Python que no lo requiere
./vaciar_base_datos.py
```

### Error: "Permission denied"
```bash
# Asegurar que los scripts son ejecutables
chmod +x vaciar_base_datos.py vaciar_base_datos.sh gestionar_db.sh
```

## 🎯 Casos de Uso Típicos

### 🧪 Entorno de Desarrollo/Testing
```bash
# Limpiar y empezar desde cero frecuentemente
./vaciar_base_datos.py
```

### 🏗️ Reset Completo con Backup
```bash
# Para cambios importantes o antes de actualizaciones
./gestionar_db.sh reset
```

### 📈 Monitoreo Regular
```bash
# Ver estado actual de datos (opción rápida)
./estado_db.py

# O ver estado con el script avanzado
./gestionar_db.sh status
```

### 💾 Backups Regulares
```bash
# Crear backup antes de cambios importantes
./gestionar_db.sh backup
```

---

**✅ ¡Scripts listos para usar!** La base de datos puede ser vaciada de forma segura cuando sea necesario.
