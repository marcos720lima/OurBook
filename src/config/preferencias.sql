-- Table: preferencias

DROP TABLE IF EXISTS preferencias CASCADE;

CREATE TABLE IF NOT EXISTS preferencias (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    notificacoes BOOLEAN DEFAULT true,
    tema_escuro BOOLEAN DEFAULT false,
    idioma VARCHAR(10) DEFAULT 'pt',
    criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expo_push_token VARCHAR(255),
    CONSTRAINT preferencias_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);