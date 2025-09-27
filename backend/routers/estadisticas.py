"""
Router para endpoints de estadísticas y reportes
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from config import get_db
from models_final import AluguelSimples, LogImportacao, ResumenCalculator, Imovel as Inmueble, Usuario
from .auth import verify_token_flexible

router = APIRouter(prefix="/api/estadisticas", tags=["estadísticas"])

@router.get("/generales")
async def estadisticas_generales(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtener estadísticas generales del sistema"""
    try:
        # Consultas agregadas
        total_alquileres = db.query(func.count(AluguelSimples.id)).scalar()
        # Contar propiedades distintas por nombre de inmueble
        total_propiedades = db.query(func.count(func.distinct(Inmueble.nome))).select_from(AluguelSimples).join(Inmueble, AluguelSimples.imovel_id == Inmueble.id).scalar()
        total_propietarios = db.query(func.count(func.distinct(AluguelSimples.proprietario_id))).scalar()

        suma_valores = db.query(func.sum(AluguelSimples.valor_aluguel_proprietario)).scalar() or 0
        suma_tasas = db.query(func.sum(AluguelSimples.taxa_administracao_proprietario)).scalar() or 0
        suma_liquido = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)).scalar() or 0

        # Últimas importaciones
        ultimas_importaciones = db.query(LogImportacao)\
            .order_by(desc(LogImportacao.data_importacao))\
            .limit(5).all()

        return {
            "totales": {
                "alquileres": total_alquileres,
                "propiedades": total_propiedades,
                "propietarios": total_propietarios
            },
            "valores_monetarios": {
                "total_alquileres": float(suma_valores),
                "total_tasas_administracion": float(suma_tasas),
                "total_valores_liquidos": float(suma_liquido)
            },
            "ultimas_importaciones": [imp.to_dict() for imp in ultimas_importaciones]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estadísticas: {str(e)}")

@router.get("/resumen/por-propiedad")
async def resumen_por_propiedad(
    ano: Optional[int] = Query(None, description="Año para el resumen"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mes para el resumen"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Obtener resumen agrupado por propiedad"""
    try:
        query = db.query(AluguelSimples)

        if ano:
            query = query.filter(AluguelSimples.ano == ano)
        if mes:
            query = query.filter(AluguelSimples.mes == mes)
        
        alquileres = query.all()
        
        # Agrupar por propiedad y período
        resumenes = {}
        for alquiler in alquileres:
            clave = f"{alquiler.inmueble.nombre if alquiler.inmueble else 'SIN_NOMBRE'}_{alquiler.ano}_{alquiler.mes}"
            if clave not in resumenes:
                resumenes[clave] = []
            resumenes[clave].append(alquiler)

        # Calcular resúmenes
        resultado = []
        for grupo_alquileres in resumenes.values():
            resumen = ResumenCalculator.calcular_resumen_propiedad(grupo_alquileres)
            resultado.append(resumen)

        # Ordenar por período descendente
        resultado.sort(key=lambda x: (x.get('periodo', ''), x.get('nombre_inmueble', '')), reverse=True)

        return resultado
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")

@router.get("/resumen/por-propietario")
async def resumen_por_propietario(
    ano: Optional[int] = Query(None, description="Año para el resumen"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Mes para el resumen"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_token_flexible)
):
    """Obtener resumen agrupado por propietario"""
    try:
        query = db.query(AluguelSimples)

        if ano:
            query = query.filter(AluguelSimples.ano == ano)
        if mes:
            query = query.filter(AluguelSimples.mes == mes)
        
        alquileres = query.all()
        
        # Agrupar por propietario y período
        resumenes = {}
        for alquiler in alquileres:
            clave = f"{alquiler.nombre_propietario}_{alquiler.ano}_{alquiler.mes}"
            if clave not in resumenes:
                resumenes[clave] = []
            resumenes[clave].append(alquiler)

        # Calcular resúmenes
        resultado = []
        for grupo_alquileres in resumenes.values():
            resumen = ResumenCalculator.calcular_resumen_propietario(grupo_alquileres)
            resultado.append(resumen)

        # Ordenar por período descendente
        resultado.sort(key=lambda x: (x.get('periodo', ''), x.get('nombre_propietario', '')), reverse=True)

        return resultado
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar resumen: {str(e)}")

@router.get("/resumen-mensual")
async def resumen_mensual(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Obtener resumen del último mes con métricas detalladas"""
    try:
        from datetime import datetime, timedelta
        
        # Obtener fecha actual
        ahora = datetime.now()
        mes_actual = ahora.month
        ano_actual = ahora.year
        
        # Calcular mes anterior
        if mes_actual == 1:
            mes_anterior = 12
            ano_anterior = ano_actual - 1
        else:
            mes_anterior = mes_actual - 1
            ano_anterior = ano_actual
        
        # 1. Ingresos del mes actual - CON DEBUG
        query_mes_actual = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
            .filter(
                AluguelSimples.mes == mes_actual,
                AluguelSimples.ano == ano_actual
            )
        
        # Debug: contar registros del mes actual
        count_mes_actual = db.query(func.count(AluguelSimples.id))\
            .filter(
                AluguelSimples.mes == mes_actual,
                AluguelSimples.ano == ano_actual
            ).scalar() or 0
        
        ingresos_mes_actual = query_mes_actual.scalar() or 0
        
        # 2. Ingresos del mes anterior
        ingresos_mes_anterior = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
            .filter(
                AluguelSimples.mes == mes_anterior,
                AluguelSimples.ano == ano_anterior
            ).scalar() or 0
        
        # 3. Total acumulado del año actual
        total_ano_actual = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
            .filter(AluguelSimples.ano == ano_actual)\
            .scalar() or 0
        
        # 4. Calcular media mensual del año actual
        meses_con_datos = db.query(func.count(func.distinct(AluguelSimples.mes)))\
            .filter(AluguelSimples.ano == ano_actual)\
            .scalar() or 1
        
        media_mensual = total_ano_actual / meses_con_datos if meses_con_datos > 0 else 0
        
        # 5. Calcular variación mensual
        if ingresos_mes_anterior > 0:
            variacion_absoluta = ingresos_mes_actual - ingresos_mes_anterior
            variacion_porcentual = (variacion_absoluta / ingresos_mes_anterior) * 100
        else:
            variacion_absoluta = ingresos_mes_actual
            variacion_porcentual = 100 if ingresos_mes_actual > 0 else 0
        
        # Determinar tipo de variación
        if variacion_absoluta > 0:
            tipo_variacion = "positiva"
            icono_variacion = "fas fa-arrow-up"
            clase_color = "text-success"
        elif variacion_absoluta < 0:
            tipo_variacion = "negativa" 
            icono_variacion = "fas fa-arrow-down"
            clase_color = "text-danger"
        else:
            tipo_variacion = "neutra"
            icono_variacion = "fas fa-minus"
            clase_color = "text-secondary"
        
        return {
            "periodo": {
                "mes_actual": f"{mes_actual:02d}/{ano_actual}",
                "mes_anterior": f"{mes_anterior:02d}/{ano_anterior}",
                "ano_actual": ano_actual
            },
            "metricas": {
                "ingresos_mes_actual": float(ingresos_mes_actual),
                "total_ano_actual": float(total_ano_actual),
                "media_mensual": float(media_mensual),
                "variacion": {
                    "absoluta": float(variacion_absoluta),
                    "porcentual": float(variacion_porcentual),
                    "tipo": tipo_variacion,
                    "icono": icono_variacion,
                    "clase_color": clase_color,
                    "mes_anterior": float(ingresos_mes_anterior)
                }
            },
            "detalles": {
                "meses_con_datos": meses_con_datos,
                "timestamp": datetime.now().isoformat(),
                "debug": {
                    "count_mes_actual": count_mes_actual,
                    "mes_consultado": mes_actual,
                    "ano_consultado": ano_actual
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener resumen mensual: {str(e)}")

@router.get("/debug/mes")
async def debug_mes(mes: int = 7, ano: int = 2025, db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Debug: verificar datos de un mes específico"""
    
    # Contar registros
    count = db.query(func.count(AluguelSimples.id))\
        .filter(AluguelSimples.mes == mes, AluguelSimples.ano == ano)\
        .scalar()
    
    # Sumar valores
    suma = db.query(func.sum(AluguelSimples.valor_alquiler_propietario))\
        .filter(AluguelSimples.mes == mes, AluguelSimples.ano == ano)\
        .scalar() or 0
    
    # Primeros 5 registros para muestra
    registros = db.query(AluguelSimples.nombre_propietario, AluguelSimples.valor_alquiler_propietario)\
        .filter(AluguelSimples.mes == mes, AluguelSimples.ano == ano)\
        .limit(5).all()
    
    return {
        "mes": mes,
        "ano": ano,
        "count_registros": count,
        "suma_total": float(suma),
        "promedio": float(suma / count) if count > 0 else 0,
        "muestra_registros": [
            {"propietario": r.nombre_propietario, "valor": float(r.valor_alquiler_propietario)}
            for r in registros
        ]
    }

# Endpoint de compatibilidad
@router.get("/")
async def estadisticas_compatibilidad(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Endpoint de compatibilidad para el frontend"""
    # This endpoint calls an already secured function, but it's good practice
    # to secure the entry point as well.
    return await estadisticas_generales(db)
