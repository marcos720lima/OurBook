-- Table: livros

DROP TABLE IF EXISTS livros CASCADE;

CREATE TABLE IF NOT EXISTS livros (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255) NOT NULL,
    estado_livro VARCHAR(50) NOT NULL,
    genero VARCHAR(100) NOT NULL,
    fotos BYTEA[],
    usuario_id INTEGER NOT NULL,
    disponivel BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'disponivel',
    data_cadastro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT livros_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_livros_genero ON livros(genero);
CREATE INDEX IF NOT EXISTS idx_livros_usuario_id ON livros(usuario_id);