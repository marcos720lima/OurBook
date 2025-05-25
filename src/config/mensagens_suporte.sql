-- Table: mensagens_suporte

DROP TABLE IF EXISTS mensagens_suporte CASCADE;

CREATE TABLE IF NOT EXISTS mensagens_suporte (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    assunto VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente',
    erro TEXT,
    email_info JSONB,
    resposta TEXT,
    respondido_em TIMESTAMPTZ,
    respondido_por VARCHAR(100),
    criada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT mensagens_suporte_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
