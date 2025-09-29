-- SCRIPT DE INICIALIZAÇÃO OPTIMIZADO - SISTEMA DE ALUGUEIS V2
-- Versión actualizada com estrutura optimizada

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(128) NOT NULL,
    tipo_de_usuario VARCHAR(20) NOT NULL CHECK (tipo_de_usuario IN ('administrador', 'usuario')),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de proprietários (OPTIMIZADA - sin ativo, data_atualizacao)
CREATE TABLE IF NOT EXISTS proprietarios (
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
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de imóveis (OPTIMIZADA - sin ativo, iptu_anual→iptu_mensal, campos nuevos)
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
    iptu_mensal DECIMAL(10,2),
    condominio_mensal DECIMAL(10,2),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Campos nuevos optimizados
    numero_quartos INTEGER,
    numero_banheiros INTEGER,
    numero_vagas_garagem INTEGER DEFAULT 0,
    alugado BOOLEAN DEFAULT FALSE
);

-- Tabela de participações (OPTIMIZADA - sin ativo, observacoes)
CREATE TABLE IF NOT EXISTS participacoes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    porcentagem DECIMAL(10,8) NOT NULL CHECK (porcentagem >= 0 AND porcentagem <= 100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proprietario_id, imovel_id, data_registro)
);

-- Tabela de alugueis (OPTIMIZADA - sin data_atualizacao, observacoes)
CREATE TABLE IF NOT EXISTS alugueis (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2060),
    taxa_administracao_total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (taxa_administracao_total >= 0),
    taxa_administracao_proprietario DECIMAL(12,2) DEFAULT 0 CHECK (taxa_administracao_proprietario >= 0),
    valor_liquido_proprietario DECIMAL(12,2) DEFAULT 0,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(imovel_id, proprietario_id, mes, ano)
);

-- Tabela de alias (antes extras) - SISTEMA DE GRUPOS DE PROPRIETÁRIOS
CREATE TABLE IF NOT EXISTS alias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias VARCHAR(200) NOT NULL UNIQUE,
    id_proprietarios TEXT -- JSON array de IDs dos proprietários
);

-- Tabela de transferências
CREATE TABLE IF NOT EXISTS transferencias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias_id INTEGER NOT NULL REFERENCES alias(id) ON DELETE CASCADE,
    nome_transferencia VARCHAR(300) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    id_proprietarios TEXT, -- JSON: [{"id": 1, "valor": 100.50}]
    origem_id_proprietario INTEGER REFERENCES proprietarios(id),
    destino_id_proprietario INTEGER REFERENCES proprietarios(id),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP
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

-- Tabela de histórico de participações
CREATE TABLE IF NOT EXISTS historico_participacoes (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    versao_id VARCHAR(50) NOT NULL,
    data_versao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    porcentagem DECIMAL(10,8) NOT NULL DEFAULT 0.00000000,
    data_registro_original TIMESTAMP NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id),
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id)
);

-- ÍNDICES OPTIMIZADOS
CREATE INDEX IF NOT EXISTS idx_proprietarios_nome ON proprietarios(nome);
CREATE INDEX IF NOT EXISTS idx_proprietarios_documento ON proprietarios(documento);
CREATE INDEX IF NOT EXISTS idx_imoveis_nome ON imoveis(nome);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo_imovel);
CREATE INDEX IF NOT EXISTS idx_participacoes_proprietario ON participacoes(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_imovel ON participacoes(imovel_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_imovel ON alugueis(imovel_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_proprietario ON alugueis(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_data ON alugueis(ano, mes);
CREATE INDEX IF NOT EXISTS idx_historico_participacoes_versao_imovel ON historico_participacoes(versao_id, imovel_id);
CREATE INDEX IF NOT EXISTS idx_historico_participacoes_data ON historico_participacoes(data_versao);
CREATE INDEX IF NOT EXISTS idx_alias_alias ON alias(alias);
CREATE INDEX IF NOT EXISTS idx_transferencias_alias_id ON transferencias(alias_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_data_criacao ON transferencias(data_criacao);

-- COMENTÁRIOS
COMMENT ON TABLE alias IS 'Tabela para alias (grupos de proprietários) - antes extras';
COMMENT ON COLUMN alias.id_proprietarios IS 'JSON array com IDs dos proprietários pertencentes ao alias';
COMMENT ON TABLE transferencias IS 'Tabela para armazenar transferências cadastradas';
COMMENT ON COLUMN transferencias.id_proprietarios IS 'JSON array com objetos {id: number, valor: number}';

-- CONSTRAINT ÚNICA PARA HISTÓRICO DE PARTICIPAÇÕES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uniq_historico_participacao_versao'
        AND table_name = 'historico_participacoes'
    ) THEN
        ALTER TABLE historico_participacoes
        ADD CONSTRAINT uniq_historico_participacao_versao
        UNIQUE (versao_id, imovel_id, proprietario_id);
    END IF;
END $$;

-- FUNÇÃO OPTIMIZADA PARA CÁLCULO DE TAXA (sin usar campo ativo eliminado)
CREATE OR REPLACE FUNCTION calcular_taxa_proprietario_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Buscar a participação mais recente do proprietário no imóvel
    SELECT (porcentagem / 100.0) * NEW.taxa_administracao_total
    INTO NEW.taxa_administracao_proprietario
    FROM participacoes 
    WHERE proprietario_id = NEW.proprietario_id 
    AND imovel_id = NEW.imovel_id 
    ORDER BY data_registro DESC
    LIMIT 1;
    
    -- Se não encontrou participação, usar 100% (participação completa)
    IF NEW.taxa_administracao_proprietario IS NULL THEN
        NEW.taxa_administracao_proprietario := NEW.taxa_administracao_total;
    END IF;
    
    -- Calcular valor líquido

    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS OPTIMIZADOS
CREATE OR REPLACE TRIGGER trigger_calcular_taxa_proprietario_insert
    BEFORE INSERT ON alugueis
    FOR EACH ROW
    EXECUTE FUNCTION calcular_taxa_proprietario_automatico();

CREATE OR REPLACE TRIGGER trigger_calcular_taxa_proprietario_update
    BEFORE UPDATE OF taxa_administracao_total, proprietario_id, imovel_id ON alugueis
    FOR EACH ROW
    EXECUTE FUNCTION calcular_taxa_proprietario_automatico();

-- MENSAJE DE ÉXITO
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos optimizada creada correctamente - AlugueisV2';
END $$;

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

-- Tabela de alugueis
CREATE TABLE IF NOT EXISTS alugueis (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    imovel_id INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    proprietario_id INTEGER NOT NULL REFERENCES proprietarios(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2050),
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

-- Tabela de alias (grupos de proprietários)
CREATE TABLE IF NOT EXISTS alias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias VARCHAR(200) UNIQUE NOT NULL,
    id_proprietarios TEXT
);

-- Tabela de transferencias (separada dos aliases)
CREATE TABLE IF NOT EXISTS transferencias (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    alias_id INTEGER NOT NULL REFERENCES alias(id) ON DELETE CASCADE,
    nome_transferencia VARCHAR(300) NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    id_proprietarios TEXT, -- JSON con [{"id": 1, "valor": 100.50}, {"id": 2, "valor": 200.75}]
    origem_id_proprietario INTEGER REFERENCES proprietarios(id),
    destino_id_proprietario INTEGER REFERENCES proprietarios(id),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP
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
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alugueisv2_usuario;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alugueisv2_usuario;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO alugueisv2_usuario;

-- Índices
CREATE INDEX IF NOT EXISTS idx_proprietarios_nome ON proprietarios(nome);
CREATE INDEX IF NOT EXISTS idx_proprietarios_documento ON proprietarios(documento);
CREATE INDEX IF NOT EXISTS idx_imoveis_nome ON imoveis(nome);
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo_imovel);
CREATE INDEX IF NOT EXISTS idx_participacoes_proprietario ON participacoes(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_participacoes_imovel ON participacoes(imovel_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_imovel ON alugueis(imovel_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_proprietario ON alugueis(proprietario_id);
CREATE INDEX IF NOT EXISTS idx_alugueis_data ON alugueis(ano, mes);
CREATE INDEX IF NOT EXISTS idx_historico_participacoes_versao_imovel ON historico_participacoes(versao_id, imovel_id);
CREATE INDEX IF NOT EXISTS idx_historico_participacoes_data ON historico_participacoes(data_versao);
CREATE INDEX IF NOT EXISTS idx_alias_alias ON alias(alias);
CREATE INDEX IF NOT EXISTS idx_transferencias_alias_id ON transferencias(alias_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_data_criacao ON transferencias(data_criacao);

-- Comentários sobre campos das tabelas
COMMENT ON TABLE alias IS 'Tabela para alias (grupos de proprietários)';
COMMENT ON COLUMN alias.id_proprietarios IS 'JSON array com IDs dos proprietários pertencentes ao alias';

COMMENT ON TABLE transferencias IS 'Tabela para armazenar transferências cadastradas com IDs únicos';
COMMENT ON COLUMN transferencias.alias_id IS 'ID do alias (grupo de proprietários) ao qual a transferência pertence';
COMMENT ON COLUMN transferencias.nome_transferencia IS 'Nome identificador da transferência';
COMMENT ON COLUMN transferencias.valor_total IS 'Valor total da transferência (soma de todos os proprietários)';
COMMENT ON COLUMN transferencias.id_proprietarios IS 'JSON array com objetos {id: number, valor: number} dos proprietários e seus valores';
COMMENT ON COLUMN transferencias.origem_id_proprietario IS 'ID do proprietário origem para transferências individuais';
COMMENT ON COLUMN transferencias.destino_id_proprietario IS 'ID do proprietário destino para transferências individuais';
COMMENT ON COLUMN transferencias.data_criacao IS 'Data de criação da transferência';
COMMENT ON COLUMN transferencias.data_fim IS 'Data de fim ou conclusão da transferência';

-- =============================================
-- FUNÇÃO E TRIGGER PARA CÁLCULO AUTOMÁTICO DA TAXA DE ADMINISTRAÇÃO DO PROPRIETÁRIO
-- =============================================

-- Função para calcular automaticamente taxa_administracao_proprietario
CREATE OR REPLACE FUNCTION calcular_taxa_proprietario_automatico()
RETURNS TRIGGER AS $$
BEGIN
    -- Buscar a participação do proprietário no imóvel
    SELECT (porcentagem / 100.0) * NEW.taxa_administracao_total
    INTO NEW.taxa_administracao_proprietario
    FROM participacoes 
    WHERE proprietario_id = NEW.proprietario_id 
    AND imovel_id = NEW.imovel_id 
    LIMIT 1;
    
    -- Se não encontrou participação, usar 100% (participação completa)
    IF NEW.taxa_administracao_proprietario IS NULL THEN
        NEW.taxa_administracao_proprietario := NEW.taxa_administracao_total;
    END IF;
    
    -- Calcular valor líquido

    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE INSERT para calcular automaticamente a taxa
CREATE OR REPLACE TRIGGER trigger_calcular_taxa_proprietario_insert
    BEFORE INSERT ON alugueis
    FOR EACH ROW
    EXECUTE FUNCTION calcular_taxa_proprietario_automatico();

-- Trigger BEFORE UPDATE para recalcular quando necessário
CREATE OR REPLACE TRIGGER trigger_calcular_taxa_proprietario_update
    BEFORE UPDATE OF taxa_administracao_total, proprietario_id, imovel_id ON alugueis
    FOR EACH ROW
    EXECUTE FUNCTION calcular_taxa_proprietario_automatico();
