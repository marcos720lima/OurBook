-- Table: reset_tokens

DROP TABLE IF EXISTS reset_tokens CASCADE;

CREATE TABLE IF NOT EXISTS reset_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT reset_tokens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);