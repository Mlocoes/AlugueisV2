-- Migration: Adiciona constraint única para histórico de aluguéis
ALTER TABLE alugueis_simples
ADD CONSTRAINT uq_aluguel_periodo UNIQUE (imovel_id, proprietario_id, mes, ano);
