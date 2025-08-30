#!/usr/bin/env python3
"""
Configuración de la Base de Datos para Sistema de Alquileres V2
Gestión de conexiones, sesiones y operaciones CRUD especializadas
"""


import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool
from contextlib import contextmanager
import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuración de la base de datos
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://alquileresv2_user:alquileresv2_pass@192.168.0.7:5432/alquileresv2_db"
)

# Configuración del engine con pool de conexiones
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Reciclar conexiones cada hora
    echo=False  # Cambiar a True para debug SQL
)

# Configuración del sessionmaker
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base para los modelos
Base = declarative_base()

def get_database_url():
    """Obtener URL de conexión a la base de datos"""
    return DATABASE_URL

@contextmanager
def get_db_session():
    """
    Context manager para sesiones de base de datos
    Garantiza que las sesiones se cierren correctamente
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Error en la sesión de base de datos: {e}")
        raise
    finally:
        session.close()

def init_database():
    """
    Inicializa la base de datos creando todas las tablas
    """
    try:
        from .models import Base
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Base de datos inicializada correctamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error al inicializar la base de datos: {e}")
        return False

def test_connection():
    """
    Prueba la conexión a la base de datos
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version()"))
            version = result.scalar()
            logger.info(f"✅ Conexión exitosa a PostgreSQL: {version}")
            return True
    except Exception as e:
        logger.error(f"❌ Error de conexión: {e}")
        return False

class PropietarioService:
    """
    Servicio especializado para operaciones con propietarios
    """
    
    @staticmethod
    def crear_propietario(session: Session, datos: Dict[str, Any]) -> Any:
        """
        Crea un nuevo propietario
        """
        from .models import Propietario
        
        propietario = Propietario(
            nombre=datos['nombre'],
            apellido=datos['apellido'],
            nombre_completo=f"{datos['nombre']} {datos['apellido']}",
            email=datos.get('email'),
            telefono=datos.get('telefono'),
            direccion=datos.get('direccion'),
            documento=datos.get('documento'),
            tipo_documento=datos.get('tipo_documento'),
            banco=datos.get('banco'),
            agencia=datos.get('agencia'),
            cuenta=datos.get('cuenta'),
            tipo_cuenta=datos.get('tipo_cuenta')
        )
        
        session.add(propietario)
        session.flush()
        return propietario
    
    @staticmethod
    def buscar_por_nombre(session: Session, nombre_completo: str) -> Optional[Any]:
        """
        Busca un propietario por nombre completo
        """
        from .models import Propietario
        
        return session.query(Propietario).filter(
            Propietario.nombre_completo.ilike(f"%{nombre_completo}%")
        ).first()
    
    @staticmethod
    def listar_activos(session: Session) -> List[Any]:
        """
        Lista todos los propietarios activos
        """
        from .models import Propietario
        
        return session.query(Propietario).filter(
            Propietario.activo == True
        ).order_by(Propietario.nombre_completo).all()

class InmuebleService:
    """
    Servicio especializado para operaciones con inmuebles
    """
    
    @staticmethod
    def crear_inmueble(session: Session, datos: Dict[str, Any]) -> Any:
        """
        Crea un nuevo inmueble
        """
        from .models import Inmueble
        
        inmueble = Inmueble(
            nombre=datos['nombre'],
            direccion_completa=datos['direccion_completa'],
            calle=datos.get('calle'),
            numero=datos.get('numero'),
            apartamento=datos.get('apartamento'),
            barrio=datos.get('barrio'),
            ciudad=datos.get('ciudad'),
            estado=datos.get('estado'),
            cep=datos.get('cep'),
            tipo=datos.get('tipo'),
            area_total=datos.get('area_total'),
            area_construida=datos.get('area_construida'),
            dormitorios=datos.get('dormitorios'),
            banos=datos.get('banos'),
            garajes=datos.get('garajes'),
            valor_catastral=datos.get('valor_catastral'),
            valor_mercado=datos.get('valor_mercado'),
            iptu_anual=datos.get('iptu_anual'),
            condominio_mensual=datos.get('condominio_mensual'),
            observaciones=datos.get('observaciones')
        )
        
        session.add(inmueble)
        session.flush()
        return inmueble
    
    @staticmethod
    def buscar_por_nombre(session: Session, nombre: str) -> Optional[Any]:
        """
        Busca un inmueble por nombre
        """
        from .models import Inmueble
        
        return session.query(Inmueble).filter(
            Inmueble.nombre.ilike(f"%{nombre}%")
        ).first()
    
    @staticmethod
    def listar_activos(session: Session) -> List[Any]:
        """
        Lista todos los inmuebles activos
        """
        from .models import Inmueble
        
        return session.query(Inmueble).filter(
            Inmueble.activo == True
        ).order_by(Inmueble.nombre).all()

class ParticipacionService:
    """
    Servicio especializado para operaciones con participaciones
    """
    
    @staticmethod
    def crear_participacion(session: Session, propietario_id: int, inmueble_id: int, porcentaje: float) -> Any:
        """
        Crea una nueva participación
        """
        from .models import Participacion
        
        participacion = Participacion(
            propietario_id=propietario_id,
            inmueble_id=inmueble_id,
            porcentaje=Decimal(str(porcentaje)),
            porcentaje_decimal=Decimal(str(porcentaje)) / 100
        )
        
        session.add(participacion)
        session.flush()
        return participacion
    
    @staticmethod
    def validar_suma_porcentajes(session: Session, inmueble_id: int) -> Dict[str, Any]:
        """
        Valida que la suma de porcentajes de un inmueble sea 100%
        """
        from .models import Participacion
        
        suma = session.query(func.sum(Participacion.porcentaje)).filter(
            Participacion.inmueble_id == inmueble_id,
            Participacion.activo == True,
            Participacion.fecha_fin.is_(None)
        ).scalar() or Decimal('0')
        
        return {
            'suma_porcentajes': float(suma),
            'es_valido': abs(float(suma) - 100.0) < 0.01,  # Tolerancia de 0.01%
            'diferencia': 100.0 - float(suma)
        }
    
    @staticmethod
    def obtener_participaciones_inmueble(session: Session, inmueble_id: int) -> List[Any]:
        """
        Obtiene todas las participaciones activas de un inmueble
        """
        from .models import Participacion, Propietario
        
        return session.query(Participacion).join(Propietario).filter(
            Participacion.inmueble_id == inmueble_id,
            Participacion.activo == True,
            Participacion.fecha_fin.is_(None)
        ).order_by(Propietario.nombre_completo).all()

class AlquilerService:
    """
    Servicio especializado para operaciones con alquileres
    """
    
    @staticmethod
    def crear_alquiler_mensual(session: Session, datos: Dict[str, Any]) -> Any:
        """
        Crea un nuevo alquiler mensual
        """
        from .models import AlquilerMensual
        
        alquiler = AlquilerMensual(
            inmueble_id=datos['inmueble_id'],
            ano=datos['ano'],
            mes=datos['mes'],
            fecha_referencia=datos['fecha_referencia'],
            valor_alquiler_bruto=Decimal(str(datos['valor_alquiler_bruto'])),
            taxa_administracao=Decimal(str(datos.get('taxa_administracao', 0))),
            valor_alquiler_liquido=Decimal(str(datos['valor_alquiler_liquido'])),
            inquilino=datos.get('inquilino'),
            contrato_numero=datos.get('contrato_numero'),
            observaciones=datos.get('observaciones')
        )
        
        session.add(alquiler)
        session.flush()
        return alquiler
    
    @staticmethod
    def calcular_distribuciones(session: Session, alquiler_mensual_id: int):
        """
        Calcula automáticamente las distribuciones para cada propietario
        """
        from .models import AlquilerMensual, AlquilerDetalle, Participacion, Propietario
        
        # Obtener el alquiler mensual
        alquiler = session.query(AlquilerMensual).get(alquiler_mensual_id)
        if not alquiler:
            raise ValueError("Alquiler mensual no encontrado")
        
        # Obtener participaciones activas del inmueble
        participaciones = session.query(Participacion).filter(
            Participacion.inmueble_id == alquiler.inmueble_id,
            Participacion.activo == True,
            Participacion.fecha_fin.is_(None)
        ).all()
        
        if not participaciones:
            raise ValueError("No hay participaciones activas para este inmueble")
        
        # Validar que la suma sea 100%
        suma_porcentajes = sum(p.porcentaje for p in participaciones)
        if abs(float(suma_porcentajes) - 100.0) > 0.01:
            raise ValueError(f"La suma de participaciones ({suma_porcentajes}%) no es 100%")
        
        # Crear detalles para cada propietario
        detalles_creados = []
        for participacion in participaciones:
            valor_bruto = alquiler.valor_alquiler_bruto * participacion.porcentaje_decimal
            taxa_propietario = alquiler.taxa_administracao * participacion.porcentaje_decimal
            valor_liquido = valor_bruto - taxa_propietario
            
            detalle = AlquilerDetalle(
                alquiler_mensual_id=alquiler_mensual_id,
                propietario_id=participacion.propietario_id,
                participacion_id=participacion.id,
                porcentaje_participacion=participacion.porcentaje,
                valor_bruto_propietario=valor_bruto,
                taxa_administracao_propietario=taxa_propietario,
                valor_liquido_propietario=valor_liquido
            )
            
            session.add(detalle)
            detalles_creados.append(detalle)
        
        session.flush()
        return detalles_creados
    
    @staticmethod
    def obtener_alquileres_periodo(session: Session, ano: int, mes: int = None) -> List[Any]:
        """
        Obtiene alquileres de un período específico
        """
        from .models import AlquilerMensual, Inmueble
        
        query = session.query(AlquilerMensual).join(Inmueble).filter(
            AlquilerMensual.ano == ano
        )
        
        if mes:
            query = query.filter(AlquilerMensual.mes == mes)
        
        return query.order_by(
            AlquilerMensual.ano.desc(),
            AlquilerMensual.mes.desc(),
            Inmueble.nombre
        ).all()

class LogService:
    """
    Servicio para gestión de logs de importación
    """
    
    @staticmethod
    def crear_log_importacion(session: Session, datos: Dict[str, Any]) -> Any:
        """
        Crea un nuevo log de importación
        """
        from .models import LogImportacion
        
        log = LogImportacion(
            nombre_archivo=datos['nombre_archivo'],
            ruta_archivo=datos.get('ruta_archivo'),
            tamano_archivo=datos.get('tamano_archivo'),
            hash_archivo=datos.get('hash_archivo'),
            tipo_importacion=datos['tipo_importacion'],
            usuario_importacion=datos.get('usuario_importacion'),
            ip_origen=datos.get('ip_origen'),
            observaciones=datos.get('observaciones')
        )
        
        session.add(log)
        session.flush()
        return log
    
    @staticmethod
    def actualizar_resultado_importacion(session: Session, log_id: int, resultados: Dict[str, Any]):
        """
        Actualiza los resultados de una importación
        """
        from .models import LogImportacion
        
        log = session.query(LogImportacion).get(log_id)
        if log:
            log.registros_procesados = resultados.get('procesados', 0)
            log.registros_insertados = resultados.get('insertados', 0)
            log.registros_actualizados = resultados.get('actualizados', 0)
            log.registros_con_error = resultados.get('errores', 0)
            log.estado = resultados.get('estado', 'COMPLETADO')
            log.errores_detalle = resultados.get('errores_detalle')
            log.fecha_fin = datetime.utcnow()
            
            if log.fecha_inicio:
                duracion = log.fecha_fin - log.fecha_inicio
                log.duracion_segundos = int(duracion.total_seconds())
            
            session.flush()
            return log
        return None

# Función para verificar integridad de datos
def verificar_integridad_participaciones():
    """
    Verifica que todas las participaciones de inmuebles sumen 100%
    """
    with get_db_session() as session:
        from .models import Inmueble
        
        inmuebles_problematicos = []
        inmuebles = InmuebleService.listar_activos(session)
        
        for inmueble in inmuebles:
            validacion = ParticipacionService.validar_suma_porcentajes(session, inmueble.id)
            if not validacion['es_valido']:
                inmuebles_problematicos.append({
                    'inmueble': inmueble.nombre,
                    'suma_actual': validacion['suma_porcentajes'],
                    'diferencia': validacion['diferencia']
                })
        
        return inmuebles_problematicos

if __name__ == "__main__":
    # Test de conexión y inicialización
    if test_connection():
        print("🔗 Conexión a la base de datos exitosa")
        if init_database():
            print("🗄️ Base de datos inicializada correctamente")
        else:
            print("❌ Error al inicializar la base de datos")
    else:
        print("❌ Error de conexión a la base de datos")
