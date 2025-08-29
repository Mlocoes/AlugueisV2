# 📁 Directorio Scripts - Sistema de Alquileres V2

Este directorio contiene todos los scripts de gestión y mantenimiento del Sistema de Alquileres V2.

## 🎯 Organización

Todos los scripts del sistema están centralizados en este directorio para:
- **Mejor organización**: Fácil localización de scripts
- **Mantenimiento simplificado**: Un solo lugar para todos los scripts
- **Ejecución centralizada**: Script maestro `../run_script.sh` para ejecutar cualquier script

## 📋 Scripts Disponibles

### 🚀 **Gestión del Sistema**
- `start_total_system.sh` - Iniciar el sistema completo (Docker + Backend + Frontend)
- `stop_total_system.sh` - Detener el sistema completo de forma segura
- `verificar_estado.sh` - Verificar estado básico del sistema
- `check_system_status.sh` - Verificación detallada del estado del sistema

### 🗄️ **Gestión de Base de Datos**
- `gestionar_db.sh` - Herramientas completas de gestión de base de datos
- `limpiar_base_datos.sh` - Limpiar y resetear la base de datos
- `aplicar_estructura_final.sh` - Aplicar estructura final de base de datos

### 🧹 **Limpieza y Mantenimiento**
- `limpiar_rapido.sh` - Limpieza rápida de archivos temporales
- `limpiar_sistema_completo.sh` - Limpieza completa del sistema

## 🎮 Cómo Usar

### Opción 1: Script Maestro (Recomendado)
```bash
# Desde el directorio raíz del proyecto
./run_script.sh <comando>

# Ejemplos:
./run_script.sh start          # Iniciar sistema
./run_script.sh stop           # Detener sistema
./run_script.sh status         # Ver estado
./run_script.sh clean-db       # Limpiar BD
```

### Opción 2: Ejecución Directa
```bash
# Desde el directorio raíz del proyecto
./scripts/<nombre_script>.sh

# Ejemplos:
./scripts/start_total_system.sh
./scripts/verificar_estado.sh
```

## 📝 Comandos Cortos Disponibles

| Comando Corto | Script Real | Descripción |
|--------------|-------------|-------------|
| `start` | `start_total_system.sh` | Iniciar sistema |
| `stop` | `stop_total_system.sh` | Detener sistema |
| `status` | `verificar_estado.sh` | Estado básico |
| `check` | `check_system_status.sh` | Estado detallado |
| `clean-db` | `limpiar_base_datos.sh` | Limpiar BD |
| `clean-quick` | `limpiar_rapido.sh` | Limpieza rápida |
| `clean-full` | `limpiar_sistema_completo.sh` | Limpieza completa |
| `db` | `gestionar_db.sh` | Gestión de BD |
| `apply-structure` | `aplicar_estructura_final.sh` | Aplicar estructura |

## 🆕 Crear Nuevos Scripts

**Regla importante**: Todos los nuevos scripts deben crearse en este directorio.

### Plantilla para Nuevos Scripts
```bash
#!/bin/bash
# Descripción del script
# Autor: [Tu nombre]
# Fecha: $(date)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Tu código aquí...
```

### Pasos para Agregar un Nuevo Script
1. Crear el script en `scripts/`
2. Hacerlo ejecutable: `chmod +x scripts/nuevo_script.sh`
3. (Opcional) Agregar comando corto al `../run_script.sh`
4. Actualizar esta documentación

## 🔧 Mantenimiento

- **Ubicación**: `/home/mloco/Escritorio/SistemaAlquileresV2/scripts/`
- **Permisos**: Todos los scripts deben ser ejecutables (`chmod +x`)
- **Estándar**: Usar `#!/bin/bash` como shebang
- **Variables**: Definir `SCRIPT_DIR` y `PROJECT_ROOT` para rutas

## 📚 Documentación Adicional

- Ver `../README.md` para documentación general del proyecto
- Cada script contiene su propia documentación interna
- Para ayuda específica: `./run_script.sh help`

---
📅 **Última actualización**: $(date)
✨ **Versión**: Sistema de Alquileres V2
