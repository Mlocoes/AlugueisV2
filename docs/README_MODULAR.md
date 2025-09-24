# Backend Modular - Sistema de Alquileres V2

## Estructura Refactorizada

El backend ha sido optimizado y reorganizado en una estructura modular para mejorar la mantenibilidad y escalabilidad.

### Estructura de Directorios

```
backend/
├── main.py                 # Aplicación principal (simplificada)
├── config.py              # Configuración global
├── database.py            # Configuración de base de datos
├── models_final.py        # Modelos SQLAlchemy
├── routers/               # Endpoints organizados por módulos
│   ├── __init__.py
│   ├── alquileres.py      # CRUD de alquileres + matriz distribución
│   ├── estadisticas.py    # Reportes y estadísticas
│   └── importacion.py     # Importación Excel
├── services/              # Lógica de negocio
│   ├── __init__.py
│   └── calculo_service.py # Cálculos de tasas y distribuciones
└── utils/                 # Utilidades auxiliares
    ├── __init__.py
    └── helpers.py         # Funciones de apoyo
```

### Mejoras Implementadas

#### 1. **Separación de Responsabilidades**
- **`main.py`**: Solo configuración de app y rutas principales (93 líneas vs 1200+ anteriores)
- **`routers/`**: Endpoints organizados por funcionalidad
- **`services/`**: Lógica de negocio centralizada
- **`utils/`**: Funciones auxiliares reutilizables

#### 2. **Módulos Especializados**

**`routers/alquileres.py`** (230 líneas):
- CRUD completo de alquileres
- Endpoint de distribución matriz con agregación
- Totales por inmueble y mes
- Años disponibles

**`routers/estadisticas.py`** (80 líneas):
- Estadísticas generales del sistema
- Resúmenes por propiedad y propietario
- Endpoint de compatibilidad

**`routers/importacion.py`** (150 líneas):
- Importación Excel con validación
- Carga de Base2025.xlsx
- Logs de importación

**`services/calculo_service.py`** (85 líneas):
- Cálculo de tasas de administración
- Recálculo de todas las tasas
- Lógica de participaciones

#### 3. **Configuración Centralizada**

**`config.py`**:
- Configuración de base de datos
- Configuración de aplicación
- Configuración CORS
- Dependency injection para DB

#### 4. **Utilidades Reutilizables**

**`utils/helpers.py`**:
- Limpieza de nombres de propiedades
- Formateo de períodos para gráficos
- Funciones auxiliares comunes

### Ventajas de la Nueva Estructura

1. **Mantenibilidad**: Código organizado por responsabilidades
2. **Escalabilidad**: Fácil agregar nuevos módulos
3. **Testabilidad**: Servicios aislados y testeable
4. **Legibilidad**: Archivos más pequeños y enfocados
5. **Reutilización**: Servicios y utilidades compartidas

### Compatibilidad

✅ **100% Compatible** con el frontend existente:
- Todos los endpoints mantienen la misma URL y respuesta
- Funcionalidad preservada completamente
- No requiere cambios en el frontend

### Endpoints Principales

| Módulo | Endpoint | Descripción |
|--------|----------|-------------|
| Main | `GET /` | Información del sistema |
| Main | `GET /health` | Verificación de salud |
| Alquileres | `GET /alquileres/` | Listado con filtros |
| Alquileres | `GET /alquileres/distribucion-matriz/` | Matriz con agregación |
| Alquileres | `GET /alquileres/totales-por-inmueble/` | Totales por inmueble |
| Estadísticas | `GET /estadisticas/generales` | Estadísticas del sistema |
| Importación | `POST /importar-excel/` | Importar archivo Excel |

### Uso

```bash
# Activar entorno virtual
source venv_scripts/bin/activate

# Iniciar servidor
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Verificar funcionamiento
curl http://192.168.0.7:8000/health
```

### Backup

El archivo original se conserva como `main_original.py` para referencia y rollback si es necesario.

---

**Fecha de Refactorización**: 27 de julio de 2025  
**Versión**: 2.0.0 (Modular)  
**Estado**: ✅ Funcionando y Compatible
