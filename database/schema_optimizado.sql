-- ============================================
-- ESTRUTURA OTIMIZADA DA BASE DE DADOS
-- Sistema de Aluguéis V2 - Versão Final
-- Data: 2025-09-03
-- ============================================

-- Eliminar tabelas existentes (se existirem)
DROP TABLE IF EXISTS transferencias CASCADE;
DROP TABLE IF EXISTS alias CASCADE;
DROP TABLE IF EXISTS log_importacoes CASCADE;
DROP TABLE IF EXISTS participacoes CASCADE;
DROP TABLE IF EXISTS alugueis CASCADE;
DROP TABLE IF EXISTS proprietarios CASCADE;
DROP TABLE IF EXISTS imoveis CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(128) NOT NULL,
    tipo_de_usuario VARCHAR(20) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: imoveis (SIN campo ativo - optimizado)
-- ============================================
CREATE TABLE imoveis (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nome VARCHAR(200) UNIQUE NOT NULL,
    endereco VARCHAR(300) NOT NULL,
    tipo_imovel VARCHAR(50),
    area_total NUMERIC(10,2),
    area_construida NUMERIC(10,2),
    valor_cadastral NUMERIC(15,2),
    valor_mercado NUMERIC(15,2),
    iptu_anual NUMERIC(10,2),
    condominio_mensal NUMERIC(10,2),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Campos detalhados
    numero_quartos INTEGER,
    numero_banheiros INTEGER,
    numero_vagas_garagem INTEGER DEFAULT 0,
    alugado BOOLEAN DEFAULT FALSE
);

-- Índices para imoveis
CREATE INDEX idx_imoveis_nome ON imoveis(nome);
CREATE INDEX idx_imoveis_cidade ON imoveis(cidade);

-- ============================================
-- TABELA: proprietarios (SIN campos ativo, data_atualizacao - optimizado)
-- ============================================
CREATE TABLE proprietarios (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    sobrenome VARCHAR(150),
    documento VARCHAR(50) UNIQUE,
    tipo_documento VARCHAR(20),
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(100),
    banco VARCHAR(100),
    agencia VARCHAR(20),
    conta VARCHAR(30),
    tipo_conta VARCHAR(20),
    observacoes TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para proprietarios
CREATE INDEX idx_proprietarios_nome ON proprietarios(nome);
CREATE INDEX idx_proprietarios_documento ON proprietarios(documento);

-- ============================================
-- TABELA: alugueis (estrutura optimizada)
-- ============================================
CREATE TABLE alugueis (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id),
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2060),
    taxa_administracao_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (taxa_administracao_total >= 0),
    taxa_administracao_proprietario NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (taxa_administracao_proprietario >= 0),
    valor_liquido_proprietario NUMERIC(12,2) NOT NULL DEFAULT 0,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraint unique para período
    UNIQUE(imovel_id, proprietario_id, mes, ano)
);

-- Índices para alugueis
CREATE INDEX idx_alugueis_periodo ON alugueis(ano, mes);
CREATE INDEX idx_alugueis_imovel ON alugueis(imovel_id);
CREATE INDEX idx_alugueis_proprietario ON alugueis(proprietario_id);

-- ============================================
-- TABELA: participacoes
-- ============================================
CREATE TABLE participacoes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id),
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id),
    porcentagem NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (porcentagem >= 0 AND porcentagem <= 100),
    data_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Constraint unique para mesmo proprietario, imovel e data_registro
    UNIQUE(proprietario_id, imovel_id, data_registro)
);

-- Índices para participacoes
CREATE INDEX idx_participacoes_proprietario ON participacoes(proprietario_id);
CREATE INDEX idx_participacoes_imovel ON participacoes(imovel_id);

-- ============================================
-- TABELA: alias (antes extras - renomeada)
-- ============================================
CREATE TABLE alias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias VARCHAR(200) UNIQUE NOT NULL,
    id_proprietarios TEXT  -- JSON array de IDs
);

-- Índice para alias
CREATE INDEX idx_alias_nome ON alias(alias);

-- ============================================
-- TABELA: transferencias
-- ============================================
CREATE TABLE transferencias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias_id INTEGER NOT NULL REFERENCES alias(id),
    nome_transferencia VARCHAR(300) NOT NULL,
    valor_total NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    id_proprietarios TEXT,  -- JSON: [{"id": 1, "valor": 100.50}]
    origem_id_proprietario INTEGER REFERENCES proprietarios(id),
    destino_id_proprietario INTEGER REFERENCES proprietarios(id),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP
);

-- Índices para transferencias
CREATE INDEX idx_transferencias_alias ON transferencias(alias_id);
CREATE INDEX idx_transferencias_data ON transferencias(data_criacao);

-- ============================================
-- TABELA: log_importacoes
-- ============================================
CREATE TABLE log_importacoes (
    id SERIAL PRIMARY KEY,
    nome_arquivo VARCHAR(255) NOT NULL,
    data_importacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registros_processados INTEGER DEFAULT 0,
    registros_sucesso INTEGER DEFAULT 0,
    registros_erro INTEGER DEFAULT 0,
    detalhes_erro TEXT,
    estado VARCHAR(50) DEFAULT 'INICIADO',
    tempo_processamento INTERVAL
);

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Usuário administrador padrão
INSERT INTO usuarios (usuario, senha, tipo_de_usuario) 
VALUES ('admin', 'pbkdf2:sha256:260000$Q8KJ5s0IjmH2k8G9$8b3b8e9f1c3d2a7e6f5g4h3i2j1k0l9m8n7o6p5q4r3s2t1u0v9w8x7y6z5a4b3c2d1e0f', 'administrador')
ON CONFLICT (usuario) DO NOTHING;

-- ============================================
-- COMENTÁRIOS DAS TABELAS
-- ============================================
COMMENT ON TABLE usuarios IS 'Usuários do sistema para autenticação';
COMMENT ON TABLE imoveis IS 'Imóveis - estrutura optimizada sin campo ativo';
COMMENT ON TABLE proprietarios IS 'Proprietários - estrutura optimizada sin campos desnecessários';
COMMENT ON TABLE alugueis IS 'Aluguéis simplificados com constraints de validação';
COMMENT ON TABLE participacoes IS 'Participações de proprietários em imóveis';
COMMENT ON TABLE alias IS 'Sistema de grupos de proprietários (antes extras)';
COMMENT ON TABLE transferencias IS 'Transferências entre proprietários via alias';
COMMENT ON TABLE log_importacoes IS 'Log de importações de arquivos Excel/CSV';

-- ============================================
-- GRANTS E PERMISSÕES
-- ============================================
-- Usuário da aplicação já tem acesso via DATABASE_URL

COMMIT;
