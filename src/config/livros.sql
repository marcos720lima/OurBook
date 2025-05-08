CREATE TABLE IF NOT EXISTS livros (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(255) NOT NULL,
    estado_livro VARCHAR(50) NOT NULL, -- Novo, Usado em bom estado, Usado com marcações, etc.
    genero VARCHAR(100) NOT NULL,
    fotos BYTEA[], -- Array de dados binários das fotos
    usuario_id INTEGER NOT NULL,
    disponivel BOOLEAN DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_livros_genero ON livros(genero);
CREATE INDEX IF NOT EXISTS idx_livros_usuario_id ON livros(usuario_id);
