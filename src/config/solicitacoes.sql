-- Table: solicitacoes

DROP TABLE IF EXISTS solicitacoes CASCADE;

CREATE TABLE IF NOT EXISTS solicitacoes (
    id SERIAL PRIMARY KEY,
    livro_id INTEGER NOT NULL,
    solicitante_id INTEGER NOT NULL,
    destinatario_id INTEGER NOT NULL,
    mensagem TEXT,
    status VARCHAR(20) DEFAULT 'pendente',
    criada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT solicitacoes_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT solicitacoes_livro_id_fkey FOREIGN KEY (livro_id) REFERENCES livros(id) ON DELETE CASCADE,
    CONSTRAINT solicitacoes_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES usuarios(id) ON DELETE CASCADE
);