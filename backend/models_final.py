"""
Modelos SQLAlchemy para a Estrutura Final Simplificada
Sistema de Aluguéis V2 - Migrado para Português
"""
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Numeric, Boolean, ForeignKey, func, UniqueConstraint, Interval, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field, validator
from typing import Optional, List

Base = declarative_base()

# ============================================
# USUÁRIOS
# ============================================

class Usuario(Base):
    """Tabela de Usuários para Autenticação"""
    __tablename__ = 'usuarios'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    usuario = Column(String(50), unique=True, nullable=False)
    senha = Column(String(128), nullable=False)
    tipo_de_usuario = Column(String(20), nullable=False)
    data_criacao = Column(DateTime, default=func.current_timestamp())
    
    def __repr__(self):
        return f"<Usuario(usuario='{self.usuario}', tipo='{self.tipo_de_usuario}')>"

    def to_dict(self):
        return {
            'id': self.id,
            'usuario': self.usuario,
            'tipo_de_usuario': self.tipo_de_usuario,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }

# ============================================
# IMÓVEIS
# ============================================

class Imovel(Base):
    """Tabela de Imóveis"""
    __tablename__ = 'imoveis'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    nome = Column(String(200), nullable=False, unique=True)
    endereco = Column(String(300), nullable=False)
    tipo_imovel = Column(String(50), nullable=True)
    area_total = Column(Numeric(10,2), nullable=True)
    area_construida = Column(Numeric(10,2), nullable=True)
    valor_cadastral = Column(Numeric(15,2), nullable=True)
    valor_mercado = Column(Numeric(15,2), nullable=True)
    iptu_mensal = Column(Numeric(10,2), nullable=True)
    condominio_mensal = Column(Numeric(10,2), nullable=True)
    data_cadastro = Column(DateTime, default=func.current_timestamp())
    # Campos nuevos
    numero_quartos = Column(Integer, nullable=True)
    numero_banheiros = Column(Integer, nullable=True)
    numero_vagas_garagem = Column(Integer, default=0)
    alugado = Column(Boolean, default=False)
    
    # Relacionamentos
    alugueis = relationship('AluguelSimples', back_populates='imovel')
    participacoes = relationship('Participacao', back_populates='imovel')

    def __repr__(self):
        return f"<Imovel(nome='{self.nome}')>"

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': str(self.uuid) if self.uuid else None,
            'nome': self.nome,
            'endereco': self.endereco,
            'tipo_imovel': self.tipo_imovel,
            'area_total': float(self.area_total) if self.area_total else None,
            'area_construida': float(self.area_construida) if self.area_construida else None,
            'valor_cadastral': float(self.valor_cadastral) if self.valor_cadastral else None,
            'valor_mercado': float(self.valor_mercado) if self.valor_mercado else None,
            'iptu_mensal': float(self.iptu_mensal) if self.iptu_mensal else None,
            'condominio_mensal': float(self.condominio_mensal) if self.condominio_mensal else None,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None,
            'numero_quartos': self.numero_quartos,
            'numero_banheiros': self.numero_banheiros,
            'numero_vagas_garagem': self.numero_vagas_garagem,
            'alugado': self.alugado
        }

# ============================================
# PROPRIETÁRIOS
# ============================================

class Proprietario(Base):
    """Tabela de Proprietários"""
    __tablename__ = 'proprietarios'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    nome = Column(String(150), nullable=False)  # Ajustado para coincidir con la BD
    sobrenome = Column(String(150), nullable=True)  # Ajustado para coincidir con la BD
    documento = Column(String(50), nullable=True, unique=True)
    tipo_documento = Column(String(20), nullable=True)  # CPF, CNPJ, RG, etc.
    endereco = Column(Text, nullable=True)
    telefone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    banco = Column(String(100), nullable=True)
    agencia = Column(String(20), nullable=True)
    conta = Column(String(30), nullable=True)
    tipo_conta = Column(String(20), nullable=True)  # Corrente, Poupança
    observacoes = Column(Text, nullable=True)
    data_cadastro = Column(DateTime, default=func.current_timestamp())
    
    # Relacionamentos
    alugueis = relationship('AluguelSimples', back_populates='proprietario')
    participacoes = relationship('Participacao', back_populates='proprietario')

    def __repr__(self):
        return f"<Proprietario(nome='{self.nome} {self.sobrenome}', documento='{self.documento}')>"

    def to_dict(self):
        try:
            return {
                'id': self.id,
                'uuid': str(self.uuid) if self.uuid else None,
                'nome': self.nome if hasattr(self, 'nome') else None,
                'sobrenome': self.sobrenome if hasattr(self, 'sobrenome') else None,
                'documento': self.documento if hasattr(self, 'documento') else None,
                'tipo_documento': self.tipo_documento if hasattr(self, 'tipo_documento') else None,
                'endereco': self.endereco if hasattr(self, 'endereco') else None,
                'telefone': self.telefone if hasattr(self, 'telefone') else None,
                'email': self.email if hasattr(self, 'email') else None,
                'banco': self.banco if hasattr(self, 'banco') else None,
                'agencia': self.agencia if hasattr(self, 'agencia') else None,
                'conta': self.conta if hasattr(self, 'conta') else None,
                'tipo_conta': self.tipo_conta if hasattr(self, 'tipo_conta') else None,
                'observacoes': self.observacoes if hasattr(self, 'observacoes') else None,
                'data_cadastro': self.data_cadastro.isoformat() if hasattr(self, 'data_cadastro') and self.data_cadastro else None
            }
        except Exception as e:
            return {'id': self.id, 'erro': str(e)}

# ============================================
# ALUGUÉIS SIMPLES
# ============================================

class AluguelSimples(Base):
    """Tabela de Aluguéis Simplificada - Estrutura otimizada"""
    __tablename__ = 'alugueis'
    __table_args__ = (
        UniqueConstraint('imovel_id', 'proprietario_id', 'mes', 'ano', name='uq_aluguel_simples_periodo'),
        CheckConstraint('mes >= 1 AND mes <= 12', name='alugueis_simples_mes_check'),
        CheckConstraint('ano >= 2020 AND ano <= 2060', name='alugueis_simples_ano_check'),
        CheckConstraint('taxa_administracao_total >= 0 AND taxa_administracao_proprietario >= 0', name='alugueis_simples_taxa_check'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    imovel_id = Column(Integer, ForeignKey('imoveis.id'), nullable=False)
    proprietario_id = Column(Integer, ForeignKey('proprietarios.id'), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    taxa_administracao_total = Column(Numeric(12,2), nullable=False, default=0)
    taxa_administracao_proprietario = Column(Numeric(12,2), nullable=False, default=0)
    valor_liquido_proprietario = Column(Numeric(12,2), nullable=False, default=0)
    data_cadastro = Column(DateTime, default=func.current_timestamp())
    
    # Relacionamentos
    imovel = relationship('Imovel', back_populates='alugueis')
    proprietario = relationship('Proprietario', back_populates='alugueis')

    def __repr__(self):
        return f"<AluguelSimples(imovel_id={self.imovel_id}, proprietario_id={self.proprietario_id}, periodo='{self.mes}/{self.ano}')>"

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': str(self.uuid) if self.uuid else None,
            'imovel_id': self.imovel_id,
            'proprietario_id': self.proprietario_id,
            'nome_imovel': self.imovel.nome if self.imovel else None,
            'nome_proprietario': f"{self.proprietario.nome} {self.proprietario.sobrenome}".strip() if self.proprietario else None,
            'mes': self.mes,
            'ano': self.ano,
            'periodo': f"{self.mes:02d}/{self.ano}",
            'taxa_administracao_total': float(self.taxa_administracao_total) if self.taxa_administracao_total else 0,
            'taxa_administracao_proprietario': float(self.taxa_administracao_proprietario) if self.taxa_administracao_proprietario else 0,
            'valor_liquido_proprietario': float(self.valor_liquido_proprietario) if self.valor_liquido_proprietario else 0,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None,
            # Campo calculado estimado basado en taxas + valor liquido
            'valor_total_estimado': float(self.taxa_administracao_total) + float(self.valor_liquido_proprietario) if self.taxa_administracao_total and self.valor_liquido_proprietario else 0
        }

# ============================================
# PARTICIPAÇÕES
# ============================================

class Participacao(Base):
    """Tabela de Participações - Relação proprietários e imóveis"""
    __tablename__ = 'participacoes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    porcentagem = Column(Numeric(5,2), nullable=False, default=0.00)  # 0.00 a 100.00
    data_registro = Column(DateTime, nullable=False, default=func.current_timestamp())
    
    __table_args__ = (
        # Constraint única para mesmo imóvel, proprietário e data_registro
        UniqueConstraint('proprietario_id', 'imovel_id', 'data_registro', name='uniq_participacao_data'),
        # Validação de porcentagem
        CheckConstraint('porcentagem >= 0 AND porcentagem <= 100', name='participacoes_porcentagem_check'),
    )
    
    # Chaves estrangeiras
    imovel_id = Column(Integer, ForeignKey('imoveis.id'), nullable=False)
    proprietario_id = Column(Integer, ForeignKey('proprietarios.id'), nullable=False)
    
    # Relacionamentos
    imovel = relationship('Imovel', back_populates='participacoes')
    proprietario = relationship('Proprietario', back_populates='participacoes')

    def __repr__(self):
        return f"<Participacao(imovel_id={self.imovel_id}, proprietario_id={self.proprietario_id}, porcentagem={self.porcentagem}%)>"

    def to_dict(self):
        return {
            'id': self.id,
            'uuid': str(self.uuid) if self.uuid else None,
            'porcentagem': float(self.porcentagem) if self.porcentagem else 0.00,
            'data_registro': self.data_registro.isoformat() if self.data_registro else None,
            'imovel_id': self.imovel_id,
            'proprietario_id': self.proprietario_id
        }

# ============================================
# LOG DE IMPORTAÇÕES
# ============================================

class LogImportacao(Base):
    """Tabela de log de importações"""
    __tablename__ = 'log_importacoes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nome_arquivo = Column(String(255), nullable=False)
    data_importacao = Column(DateTime, default=func.current_timestamp())
    registros_processados = Column(Integer, default=0)
    registros_sucesso = Column(Integer, default=0)
    registros_erro = Column(Integer, default=0)
    detalhes_erro = Column(Text, nullable=True)
    estado = Column(String(50), default='INICIADO')
    tempo_processamento = Column(Interval, nullable=True)
    
    def __repr__(self):
        return f"<LogImportacao(arquivo='{self.nome_arquivo}', estado='{self.estado}')>"

    def to_dict(self):
        return {
            'id': self.id,
            'nome_arquivo': self.nome_arquivo,
            'data_importacao': self.data_importacao.isoformat() if self.data_importacao else None,
            'registros_processados': self.registros_processados,
            'registros_sucesso': self.registros_sucesso,
            'registros_erro': self.registros_erro,
            'detalhes_erro': self.detalhes_erro,
            'estado': self.estado,
            'tempo_processamento': str(self.tempo_processamento) if self.tempo_processamento else None
        }

# ============================================
# SCHEMAS PYDANTIC PARA VALIDAÇÃO
# ============================================

class ImovelSchema(BaseModel):
    nome: str
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None
    tipo_imovel: Optional[str] = None
    area_total: Optional[float] = None
    area_construida: Optional[float] = None
    quartos: Optional[int] = None
    banheiros: Optional[int] = None
    garagem: Optional[int] = None
    valor_referencia: Optional[float] = None
    observacoes: Optional[str] = None
    ativo: bool = True

class ProprietarioSchema(BaseModel):
    nome: str
    sobrenome: Optional[str] = None
    documento: Optional[str] = None
    tipo_documento: Optional[str] = None
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    tipo_conta: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True

class AluguelSimplesSchema(BaseModel):
    nome_imovel: str
    nome_proprietario: str
    mes: int = Field(..., ge=1, le=12, description="Mês (1-12)")
    ano: int = Field(..., ge=2020, le=2060, description="Ano (2020-2060)")
    taxa_administracao_total: Optional[float] = Field(default=0, ge=0, description="Taxa de administração total")
    taxa_administracao_proprietario: Optional[float] = Field(default=0, ge=0, description="Taxa de administração do proprietário")
    valor_liquido_proprietario: Optional[float] = Field(default=0, ge=0, description="Valor líquido para o proprietário")
    proprietario_id: Optional[int] = Field(default=None, gt=0, description="ID do proprietário")
    imovel_id: Optional[int] = Field(default=None, gt=0, description="ID do imóvel")
    
    class Config:
        from_attributes = True

class ParticipacaoSchema(BaseModel):
    porcentagem: float = Field(..., ge=0.0, le=100.0, description="Porcentagem de participação (0.0 a 100.0)")
    imovel_id: int = Field(..., gt=0, description="ID do imóvel")
    proprietario_id: int = Field(..., gt=0, description="ID do proprietário")
    
    class Config:
        from_attributes = True

# ============================================
# VALIDADORES E UTILITÁRIOS
# ============================================

class AluguelSimplesValidator:
    """Validador para dados de aluguéis"""
    
    @staticmethod
    def validar_mes(mes: int) -> bool:
        return 1 <= mes <= 12
    
    @staticmethod
    def validar_ano(ano: int) -> bool:
        return 2000 <= ano <= 2050
    
    @staticmethod
    def validar_valor(valor: float) -> bool:
        return valor >= 0
    
    @staticmethod
    def calcular_valor_liquido(valor_aluguel: float, taxa_admin: float) -> float:
        return valor_aluguel - taxa_admin

# ============================================
# EXTRAS - SISTEMA DE ALIAS
# ============================================

class Alias(Base):
    """Tabela de Alias - Sistema de Grupos de Proprietários"""
    __tablename__ = 'alias'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    alias = Column(String(200), nullable=False, unique=True)
    id_proprietarios = Column(Text, nullable=True)  # JSON array de IDs dos proprietários
    
    def __repr__(self):
        return f"<Alias(alias='{self.alias}')>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': str(self.uuid),
            'alias': self.alias,
            'id_proprietarios': self.id_proprietarios
        }

# ============================================
# TRANSFERENCIAS
# ============================================

class Transferencia(Base):
    """Tabela de Transferências"""
    __tablename__ = 'transferencias'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    alias_id = Column(Integer, ForeignKey('alias.id'), nullable=False)
    nome_transferencia = Column(String(300), nullable=False)
    valor_total = Column(Numeric(10, 2), nullable=False, default=0.0)
    id_proprietarios = Column(Text, nullable=True)  # JSON: [{"id": 1, "valor": 100.50}]
    origem_id_proprietario = Column(Integer, ForeignKey('proprietarios.id'), nullable=True)
    destino_id_proprietario = Column(Integer, ForeignKey('proprietarios.id'), nullable=True)
    data_criacao = Column(DateTime, default=func.current_timestamp())
    data_fim = Column(DateTime, nullable=True)
    
    # Relacionamentos
    alias = relationship("Alias", backref="transferencias")
    proprietario_origem = relationship("Proprietario", foreign_keys=[origem_id_proprietario])
    proprietario_destino = relationship("Proprietario", foreign_keys=[destino_id_proprietario])
    
    def __repr__(self):
        return f"<Transferencia(nome='{self.nome_transferencia}', valor={self.valor_total})>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': str(self.uuid),
            'alias_id': self.alias_id,
            'alias': self.alias.alias if self.alias else None,
            'nome_transferencia': self.nome_transferencia,
            'valor_total': float(self.valor_total) if self.valor_total else 0.0,
            'id_proprietarios': self.id_proprietarios,
            'origem_id_proprietario': self.origem_id_proprietario,
            'destino_id_proprietario': self.destino_id_proprietario,
            'proprietario_origem': self.proprietario_origem.nome if self.proprietario_origem else None,
            'proprietario_destino': self.proprietario_destino.nome if self.proprietario_destino else None,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None,
            'data_fim': self.data_fim.isoformat() if self.data_fim else None
        }

# Pydantic models para Extra
class AliasBase(BaseModel):
    alias: str
    id_proprietarios: Optional[str] = None

class AliasCreate(AliasBase):
    pass

class AliasUpdate(AliasBase):
    alias: Optional[str] = None

class AliasResponse(BaseModel):
    id: int
    uuid: str
    alias: str
    id_proprietarios: Optional[str] = None

    class Config:
        from_attributes = True

# Pydantic models para Transferencia
class TransferenciaBase(BaseModel):
    alias_id: int
    nome_transferencia: str
    valor_total: Optional[float] = 0.0
    id_proprietarios: Optional[str] = None
    origem_id_proprietario: Optional[int] = None
    destino_id_proprietario: Optional[int] = None
    data_criacao: Optional[str] = None
    data_fim: Optional[str] = None

class TransferenciaCreate(TransferenciaBase):
    pass

class TransferenciaUpdate(TransferenciaBase):
    alias_id: Optional[int] = None
    nome_transferencia: Optional[str] = None

class TransferenciaResponse(BaseModel):
    id: int
    uuid: str
    alias_id: int
    alias: Optional[str] = None
    nome_transferencia: str
    valor_total: float
    id_proprietarios: Optional[str] = None
    origem_id_proprietario: Optional[int] = None
    destino_id_proprietario: Optional[int] = None
    proprietario_origem: Optional[str] = None
    proprietario_destino: Optional[str] = None
    data_criacao: Optional[str] = None
    data_fim: Optional[str] = None

    class Config:
        from_attributes = True

class ResumenCalculator:
    """Calculadora de resumos e estatísticas"""
    
    @staticmethod
    def calcular_resumen_propriedad(alquileres: list[AluguelSimples]) -> dict:
        if not alquileres:
            return {
                'total_alquileres': 0,
                'valor_total': 0,
                'valor_promedio': 0,
                'taxa_total': 0,
                'liquido_total': 0
            }
        
        total = len(alquileres)
        valor_total = sum(float(a.valor_aluguel_proprietario or 0) for a in alquileres)
        taxa_total = sum(float(a.taxa_administracao_proprietario or 0) for a in alquileres)
        liquido_total = sum(float(a.valor_liquido_proprietario or 0) for a in alquileres)
        
        return {
            'total_alquileres': total,
            'valor_total': valor_total,
            'valor_promedio': valor_total / total if total > 0 else 0,
            'taxa_total': taxa_total,
            'liquido_total': liquido_total
        }

class ProprietarioUpdateSchema(BaseModel):
    nome: Optional[str] = None
    sobrenome: Optional[str] = None
    documento: Optional[str] = None
    tipo_documento: Optional[str] = None
    endereco: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    tipo_conta: Optional[str] = None
    observacoes: Optional[str] = None

    @validator('documento', pre=True, always=True)
    def clean_documento(cls, v):
        if isinstance(v, str) and v.strip() == '':
            return None
        return v