-- Table: usuarios

DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    senha TEXT NOT NULL,
    estado TEXT,
    cidade TEXT,
    mostrar_localizacao BOOLEAN,
    generos TEXT[],
    firebase_uid VARCHAR(128),
    foto TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_firebase_uid ON usuarios(firebase_uid);