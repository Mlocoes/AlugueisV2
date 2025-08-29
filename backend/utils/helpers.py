"""
Funciones auxiliares y utilidades
"""

def limpiar_nombre_propiedad(nombre):
    """Convierte direcciones en nombres más cortos y legibles"""
    if not nombre:
        return nombre
    
    # Remover prefijos comunes de direcciones
    nombre_limpio = nombre.replace("Rua ", "").replace("Av. ", "").replace("Avenida ", "")
    
    # Remover comas y espacios extra
    nombre_limpio = nombre_limpio.replace(",", "").strip()
    
    # Si es muy largo, tomar solo las primeras palabras importantes
    palabras = nombre_limpio.split()
    if len(palabras) > 3:
        # Mantener las primeras 2-3 palabras más significativas
        nombre_limpio = " ".join(palabras[:3])
    
    return nombre_limpio

def formatear_periodo_label(ano, mes):
    """Formatear etiqueta de período para gráficos"""
    meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    
    mes_nombre = meses[mes] if 1 <= mes <= 12 else str(mes)
    return f"{mes_nombre} {ano}"
