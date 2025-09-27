from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, String
from datetime import datetime, timedelta
from models_final import Proprietario, Imovel, AluguelSimples, Usuario
from config import get_db
from .auth import verify_token_flexible

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: Usuario = Depends(verify_token_flexible)):
    """Retorna um resumo de dados agregados para o dashboard."""
    
    # 1. Contagens totais
    total_proprietarios = db.query(func.count(Proprietario.id)).scalar()
    total_imoveis = db.query(func.count(Imovel.id)).scalar()

    # 2. Valor total de aluguéis no ano corrente
    current_year = datetime.now().year
    total_alugueis_ano_corrente = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)) \
        .filter(AluguelSimples.ano == current_year) \
        .scalar() or 0

    # 3. Receitas do último mês com dados
    last_month_data = db.query(AluguelSimples.ano, AluguelSimples.mes) \
        .order_by(AluguelSimples.ano.desc(), AluguelSimples.mes.desc()) \
        .first()
    
    receitas_ultimo_mes = 0
    if last_month_data:
        last_year, last_month = last_month_data
        receitas_ultimo_mes = db.query(func.sum(AluguelSimples.valor_liquido_proprietario)) \
            .filter(AluguelSimples.ano == last_year, AluguelSimples.mes == last_month) \
            .scalar() or 0

    # 4. Dados para o gráfico de receitas (últimos 12 meses)
    twelve_months_ago = datetime.now() - timedelta(days=365)
    income_data = db.query(
            AluguelSimples.ano,
            AluguelSimples.mes,
            func.sum(AluguelSimples.valor_liquido_proprietario)
        ).group_by(AluguelSimples.ano, AluguelSimples.mes).order_by(AluguelSimples.ano, AluguelSimples.mes).all()

    chart_labels = []
    chart_values = []
    for year, month, total in income_data:
        # Formatação do label para o gráfico
        date_obj = datetime(year, month, 1)
        chart_labels.append(date_obj.strftime("%b/%y"))
        chart_values.append(float(total))

    return {
        "total_proprietarios": total_proprietarios,
        "total_imoveis": total_imoveis,
        "total_alugueis_ano_corrente": float(total_alugueis_ano_corrente),
        "receitas_ultimo_mes": float(receitas_ultimo_mes),
        "income_chart_data": {
            "labels": chart_labels,
            "values": chart_values
        }
    }
