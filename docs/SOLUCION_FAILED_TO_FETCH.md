# Solución al Error "Failed to fetch" - Sistema de Alquileres V2

## 🚨 Problema Identificado

**Error**: `Failed to fetch` al intentar importar alquileres después de limpiar la base de datos.

**Causa**: El backend (servidor API) no está corriendo después de la limpieza.

## 🔍 Diagnóstico

### Síntomas:
- ✅ Frontend carga correctamente (puerto 3000)
- ✅ PostgreSQL está funcionando
- ❌ Error "Failed to fetch" al importar archivos
- ❌ Backend no responde en puerto 8000

### Verificación Rápida:
```bash
# 1. Verificar backend
curl http://localhost:8000/health

# 2. Verificar procesos
ps aux | grep python3 | grep main.py

# 3. Verificar servicios Docker
docker-compose ps
```

## ✅ Solución Implementada

### 1. Script de Inicio Automático
**Archivo creado**: `iniciar_servicios_post_limpieza.sh`

**Uso**:
```bash
./iniciar_servicios_post_limpieza.sh
```

**Funciones**:
- ✅ Verifica estado de PostgreSQL
- ✅ Inicia backend automáticamente
- ✅ Verifica frontend
- ✅ Muestra estado final de todos los servicios
- ✅ Proporciona enlaces de acceso

### 2. Integración en Scripts de Limpieza

#### Script Interactivo (`limpiar_datos_alquileres.sh`):
- ✅ **Opción 6 (Limpieza TOTAL)**: Reinicia servicios automáticamente
- ✅ **Otras opciones**: Sugiere ejecutar script de inicio
- ✅ Evita el error "Failed to fetch" automáticamente

#### Script Rápido (`limpiar_rapido.sh`):
- ✅ **Reinicio automático** después de limpieza
- ✅ Verificación de funcionamiento
- ✅ Logs de inicio en `logs/backend.log`

### 3. Endpoints de Verificación

```bash
# Health check del backend
curl http://localhost:8000/health

# Estadísticas después de limpieza
curl http://localhost:8000/estadisticas-limpieza/

# Información de corrección de tasas
curl http://localhost:8000/info-correccion-tasas/
```

## 🎯 Procedimiento Recomendado

### Después de Limpiar Datos:

1. **Automático** (si usó limpieza total):
   ```bash
   ./limpiar_datos_alquileres.sh
   # Seleccionar opción 6 - Los servicios se reinician automáticamente
   ```

2. **Manual** (si necesita reiniciar servicios):
   ```bash
   ./iniciar_servicios_post_limpieza.sh
   ```

3. **Verificación**:
   ```bash
   curl http://localhost:8000/health
   # Debe responder: {"status":"healthy","database":"connected",...}
   ```

### Estado Final Esperado:
```
🐘 PostgreSQL: ✅ Funcionando
⚙️  Backend: ✅ Funcionando (puerto 8000)
🌐 Frontend: ✅ Funcionando (puerto 3000)
```

## 🔗 Enlaces de Acceso

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Adminer (BD)**: http://localhost:8080

## 🛠️ Solución Manual (si los scripts fallan)

### 1. Verificar PostgreSQL:
```bash
docker-compose up -d postgres_v2
```

### 2. Iniciar Backend:
```bash
cd /home/mloco/Escritorio/SistemaAlquileresV2
mkdir -p logs
python3 backend/main.py > logs/backend.log 2>&1 &
```

### 3. Verificar Frontend:
```bash
# Si no está corriendo
cd frontend
python3 -m http.server 3000
```

### 4. Verificar Funcionamiento:
```bash
curl http://localhost:8000/health
curl http://localhost:3000
```

## 📋 Prevención

### Para Evitar el Error en el Futuro:

1. **Usar scripts actualizados**:
   - `limpiar_datos_alquileres.sh` (con reinicio automático)
   - `limpiar_rapido.sh` (con reinicio automático)

2. **Después de cualquier limpieza**, ejecutar:
   ```bash
   ./iniciar_servicios_post_limpieza.sh
   ```

3. **Verificar estado** antes de importar:
   ```bash
   curl http://localhost:8000/health
   ```

## 🐛 Debugging Adicional

### Si el problema persiste:

1. **Verificar logs del backend**:
   ```bash
   tail -f logs/backend.log
   ```

2. **Verificar consola del navegador**:
   - F12 → Console → Buscar errores de red

3. **Verificar configuración CORS**:
   - Backend debe permitir origen `http://localhost:3000`

4. **Verificar puertos**:
   ```bash
   netstat -tlnp | grep -E ":(3000|8000|5432)"
   ```

## ✅ Resultado Final

- ✅ **Error solucionado**: "Failed to fetch" eliminado
- ✅ **Scripts actualizados**: Reinicio automático de servicios
- ✅ **Documentación creada**: Guía completa de solución
- ✅ **Prevención implementada**: Evita el error en futuras limpiezas

---

**Fecha de solución**: 25 de julio de 2025  
**Estado**: ✅ Completamente resuelto  
**Herramientas**: Scripts automáticos + documentación
