"""
Modelos SQLAlchemy para a Estrutura Final Simplificada
Sistema de Aluguéis V2 - Migrado para Português
"""
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Numeric, Boolean, ForeignKey, func, UniqueConstraint, Interval
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel
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
    iptu_anual = Column(Numeric(10,2), nullable=True)
    condominio_mensal = Column(Numeric(10,2), nullable=True)
    ativo = Column(Boolean, default=True)
    data_cadastro = Column(DateTime, default=func.current_timestamp())
    observacoes = Column(Text, nullable=True)
    
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
            'iptu_anual': float(self.iptu_anual) if self.iptu_anual else None,
            'condominio_mensal': float(self.condominio_mensal) if self.condominio_mensal else None,
            'ativo': self.ativo,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None,
            'observacoes': self.observacoes
        }

# ============================================
# PROPRIETÁRIOS
# ============================================

class Proprietario(Base):
    """Tabela de Proprietários"""
    __tablename__ = 'proprietarios'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    nome = Column(String(100), nullable=False)
    sobrenome = Column(String(100), nullable=True)
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
    ativo = Column(Boolean, default=True)
    data_cadastro = Column(DateTime, default=func.current_timestamp())
    data_atualizacao = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
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
                'ativo': self.ativo if hasattr(self, 'ativo') else None,
                'data_cadastro': self.data_cadastro.isoformat() if hasattr(self, 'data_cadastro') and self.data_cadastro else None,
                'data_atualizacao': self.data_atualizacao.isoformat() if hasattr(self, 'data_atualizacao') and self.data_atualizacao else None
            }
        except Exception as e:
            return {'id': self.id, 'erro': str(e)}

# ============================================
# ALUGUÉIS SIMPLES
# ============================================

class AluguelSimples(Base):
    """Tabela de Aluguéis Simplificada"""
    __tablename__ = 'alugueis_simples'
    __table_args__ = (
        UniqueConstraint('imovel_id', 'proprietario_id', 'mes', 'ano', name='uq_aluguel_simples_periodo'),
    )
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    imovel_id = Column(Integer, ForeignKey('imoveis.id'), nullable=False)
    proprietario_id = Column(Integer, ForeignKey('proprietarios.id'), nullable=False)
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    valor_aluguel_proprietario = Column(Numeric(12,2), nullable=False, default=0)
    taxa_administracao_total = Column(Numeric(12,2), nullable=False, default=0)
    taxa_administracao_proprietario = Column(Numeric(12,2), nullable=False, default=0)
    valor_liquido_proprietario = Column(Numeric(12,2), nullable=False, default=0)
    observacoes = Column(Text, nullable=True)
    data_cadastro = Column(DateTime, default=func.current_timestamp())
    data_atualizacao = Column(DateTime, default=func.current_timestamp(), onupdate=func.current_timestamp())
    
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
            'valor_aluguel_proprietario': float(self.valor_aluguel_proprietario) if self.valor_aluguel_proprietario else 0,
            'taxa_administracao_total': float(self.taxa_administracao_total) if self.taxa_administracao_total else 0,
            'taxa_administracao_proprietario': float(self.taxa_administracao_proprietario) if self.taxa_administracao_proprietario else 0,
            'valor_liquido_proprietario': float(self.valor_liquido_proprietario) if self.valor_liquido_proprietario else 0,
            'observacoes': self.observacoes,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

# ============================================
# PARTICIPAÇÕES
# ============================================

class Participacao(Base):
    """Tabela de Participações (relação muitos para muitos)"""
    __tablename__ = 'participacoes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=func.uuid_generate_v4(), unique=True, nullable=False)
    porcentagem = Column(Numeric(8,6), nullable=False, default=0.00)  # 0.00 a 100.00
    observacoes = Column(Text, nullable=True)
    data_registro = Column(DateTime(timezone=True), nullable=False, default=func.now())
    __table_args__ = (
        # Garante que não existam participações duplicadas para mesmo imóvel, proprietário e data_registro
        UniqueConstraint('imovel_id', 'proprietario_id', 'data_registro', name='uniq_participacao_data'),
    )
    ativo = Column(Boolean, default=True)
    # Campos removidos: data_inicio, data_fim, data_criacao, data_atualizacao
    
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
            'porcentagem': float(self.porcentagem) if self.porcentagem else 0,
            'observacoes': self.observacoes,
            'ativo': self.ativo,
            # Campos removidos: data_inicio, data_fim, data_criacao, data_atualizacao
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
    mes: int
    ano: int
    valor_aluguel_proprietario: float
    taxa_administracao_total: Optional[float] = 0
    taxa_administracao_proprietario: Optional[float] = 0
    valor_liquido_proprietario: Optional[float] = 0
    observacoes: Optional[str] = None
    proprietario_id: Optional[int] = None
    imovel_id: Optional[int] = None

class ParticipacaoSchema(BaseModel):
    porcentagem: float
    observacoes: Optional[str] = None
    ativo: bool = True
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    imovel_id: int
    proprietario_id: int

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

class ResumenCalculator:
    """Calculadora de resumos e estatísticas"""
    
    @staticmethod
    def calcular_resumen_propiedad(alquileres: list[AluguelSimples]) -> dict:
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
