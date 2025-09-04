"""
Serviço para cálculos de taxas e distribuições
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_
from models_final import AluguelSimples

class CalculoService:
    
    @staticmethod
    def calcular_taxas_imovel(self, db: Session, imovel_id: int, mes: int, ano: int):
        """
        Calcula e distribui as taxas de administração de um imóvel entre os proprietários
        baseado em suas participações.
        """
        try:
            # Obter todos os aluguéis da propriedade no período
            alugueis = db.query(AluguelSimples).filter(
                and_(
                    AluguelSimples.imovel_id == imovel_id,
                    AluguelSimples.mes == mes,
                    AluguelSimples.ano == ano
                )
            ).all()
            
            if not alugueis:
                return
            
            # Calcular total de valor bruto de aluguéis
            total_valor_bruto = sum(alq.valor_aluguel_proprietario for alq in alugueis)
            
            if total_valor_bruto <= 0:
                return
            
            # Obtener tasa total (debe ser la misma para todos)
            taxa_total = alugueis[0].taxa_administracao_total
            
            # Calcular y actualizar tasa proporcional para cada propietario
            for aluguel in alugueis:
                # Calcular participación del propietario
                participacao = aluguel.valor_aluguel_proprietario / total_valor_bruto
                
                # Calcular tasa proporcional
                taxa_proprietario = taxa_total * participacao
                
                # Calcular valor líquido
                valor_liquido = aluguel.valor_aluguel_proprietario - taxa_proprietario
                
                # Actualizar registro
                aluguel.taxa_administracao_proprietario = round(float(taxa_proprietario), 2)
                aluguel.valor_liquido_propietario = round(float(valor_liquido), 2)
            
            # Guardar cambios
            db.commit()
            
        except Exception as e:
            db.rollback()
            raise Exception(f"Erro ao calcular taxas para {nome_imovel} {mes}/{ano}: {str(e)}")
    
    @staticmethod
    def recalcular_todas_las_tasas(db: Session):
        """Recalcula todas las tasas de administración por propietario"""
        # Obtener todos los períodos únicos (propiedad + mes + año)
        query_periodos = db.query(
            AlquilerSimple.nombre_propiedad,
            AlquilerSimple.mes,
            AlquilerSimple.ano
        ).distinct()
        
        periodos = query_periodos.all()
        
        total_periodos = len(periodos)
        periodos_procesados = 0
        errores = []
        
        for periodo in periodos:
            try:
                CalculoService.calcular_tasas_administracion_propietario(
                    db, 
                    periodo.nombre_propiedad, 
                    periodo.mes, 
                    periodo.ano
                )
                periodos_procesados += 1
            except Exception as e:
                error_msg = f"Error en {periodo.nombre_propiedad} {periodo.mes}/{periodo.ano}: {str(e)}"
                errores.append(error_msg)
        
        return {
            "total_periodos": total_periodos,
            "periodos_procesados": periodos_procesados,
            "periodos_con_error": len(errores),
            "tasa_exito": f"{(periodos_procesados/total_periodos*100):.1f}%" if total_periodos > 0 else "0%",
            "errores": errores
        }
