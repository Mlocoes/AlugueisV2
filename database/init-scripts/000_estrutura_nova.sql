-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS - SISTEMA DE ALUGUEIS V2
-- Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(128) NOT NULL,
    tipo_de_usuario VARCHAR(20) NOT NULL CHECK (tipo_de_usuario IN ('administrador', 'usuario')),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Todas as tabelas e campos em português

-- Criação do usuário de banco

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'alquileresv2_user') THEN
        CREATE ROLE alquileresv2_user LOGIN PASSWORD 'alquileresv2_pass';
    END IF;
END$$;

-- Garantir que o banco existe e dar permissões

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de proprietários
CREATE TABLE IF NOT EXISTS proprietarios (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    sobrenome VARCHAR(150),
    documento VARCHAR(20),
    tipo_documento VARCHAR(10),
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(100),
    banco VARCHAR(100),
    agencia VARCHAR(20),
    conta VARCHAR(30),
    tipo_conta VARCHAR(20),
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de imóveis
CREATE TABLE IF NOT EXISTS imoveis (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL UNIQUE,
    endereco VARCHAR(300) NOT NULL,
    tipo_imovel VARCHAR(50),
    area_total DECIMAL(10,2),
    area_construida DECIMAL(10,2),
    valor_cadastral DECIMAL(15,2),
    valor_mercado DECIMAL(15,2),
    iptu_anual DECIMAL(10,2),
    condominio_mensal DECIMAL(10,2),
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT
);

-- Tabela de participações
CREATE TABLE IF NOT EXISTS participacoes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    porcentagem DECIMAL(5,2) NOT NULL CHECK (porcentagem > 0 AND porcentagem <= 100),
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de alugueis simples
CREATE TABLE IF NOT EXISTS alugueis_simples (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2050),
    valor_aluguel_proprietario DECIMAL(12,2) NOT NULL,
    taxa_administracao_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    taxa_administracao_proprietario DECIMAL(12,2) DEFAULT 0,
    valor_liquido_proprietario DECIMAL(12,2) DEFAULT 0,
    observacoes TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(imovel_id, proprietario_id, mes, ano)
);

-- Tabela de log de importações
CREATE TABLE IF NOT EXISTS log_importacoes (
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

-- Tabela de extras (aliases de propietários)
CREATE TABLE IF NOT EXISTS extras (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias VARCHAR(200) UNIQUE NOT NULL,
    id_proprietarios TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE NOT NULL
);

-- Tabela de transferencias (separada dos aliases)
CREATE TABLE IF NOT EXISTS transferencias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias_id INTEGER NOT NULL REFERENCES extras(id) ON DELETE CASCADE,
    nome_transferencia VARCHAR(300) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    id_proprietarios TEXT, -- JSON con [{"id": 1, "valor": 100.50}, {"id": 2, "valor": 200.75}]
    origem_id_proprietario INTEGER REFERENCES proprietarios(id),
    destino_id_proprietario INTEGER REFERENCES proprietarios(id),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Eliminar restrição única antiga
ALTER TABLE participacoes DROP CONSTRAINT IF EXISTS participacoes_proprietario_id_imovel_id_key;
-- Criar restrição única nova para versões históricas
ALTER TABLE participacoes ADD CONSTRAINT uniq_participacao_data UNIQUE (proprietario_id, imovel_id, data_registro);

-- Eliminar restrição CHECK antiga
ALTER TABLE participacoes DROP CONSTRAINT IF EXISTS participacoes_porcentagem_check;
-- Criar restrição CHECK nova para permitir porcentagem >= 0
ALTER TABLE participacoes ADD CONSTRAINT participacoes_porcentagem_check CHECK (porcentagem >= 0::numeric AND porcentagem <= 100::numeric);

-- Permissões
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alquileresv2_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alquileresv2_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO alquileresv2_user;

-- Índices
CREATE INDEX IF NOT EXISTS idx_proprietarios_nome ON proprietarios(nome);
CREATE INDEX IF NOT EXISTS idx_proprietarios_documento ON proprietarios(documento);
CREATE INDEX IF NOT EXISTS idx_imoveis_nome ON imoveis(nome);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo_imovel);
CREATE INDEX IF NOT EXISTS idx_participacoes_proprietario ON participacoes(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_imovel ON participacoes(imovel_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_simples_imovel ON alugueis_simples(imovel_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_simples_proprietario ON alugueis_simples(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_simples_data ON alugueis_simples(ano, mes);
CREATE INDEX IF NOT EXISTS idx_extras_alias ON extras(alias);
CREATE INDEX IF NOT EXISTS idx_transferencias_alias_id ON transferencias(alias_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_data_criacao ON transferencias(data_criacao);
CREATE INDEX IF NOT EXISTS idx_transferencias_ativo ON transferencias(ativo);

-- Comentários sobre campos das tabelas
COMMENT ON TABLE extras IS 'Tabela para aliases (grupos de proprietários)';
COMMENT ON COLUMN extras.id_proprietarios IS 'JSON array com IDs dos proprietários pertencentes ao alias';

COMMENT ON TABLE transferencias IS 'Tabela para armazenar transferências cadastradas com IDs únicos';
COMMENT ON COLUMN transferencias.alias_id IS 'ID do alias (grupo de proprietários) ao qual a transferência pertence';
COMMENT ON COLUMN transferencias.nome_transferencia IS 'Nome identificador da transferência';
COMMENT ON COLUMN transferencias.valor_total IS 'Valor total da transferência (soma de todos os proprietários)';
COMMENT ON COLUMN transferencias.id_proprietarios IS 'JSON array com objetos {id: number, valor: number} dos proprietários e seus valores';
COMMENT ON COLUMN transferencias.origem_id_proprietario IS 'ID do proprietário origem para transferências individuais';
COMMENT ON COLUMN transferencias.destino_id_proprietario IS 'ID do proprietário destino para transferências individuais';
COMMENT ON COLUMN transferencias.data_criacao IS 'Data de criação da transferência';
COMMENT ON COLUMN transferencias.data_fim IS 'Data de fim ou conclusão da transferência';
CREATE INDEX IF NOT EXISTS idx_extras_origem ON extras(origem_id_proprietario);
CREATE INDEX IF NOT EXISTS idx_extras_destino ON extras(destino_id_proprietario);

-- Comentários sobre campos da tabela extras
COMMENT ON COLUMN extras.id_proprietarios IS 'JSON array com IDs dos proprietários pertencentes ao alias';
COMMENT ON COLUMN extras.valor_transferencia IS 'Valor total da transferência cadastrada';
COMMENT ON COLUMN extras.nome_transferencia IS 'Nome identificador da transferência cadastrada';
COMMENT ON COLUMN extras.origem_id_proprietario IS 'ID do proprietário origem para transferências individuais';
COMMENT ON COLUMN extras.destino_id_proprietario IS 'ID do proprietário destino para transferências individuais';
COMMENT ON COLUMN extras.data_fim IS 'Data de fim ou última atualização da transferência';
