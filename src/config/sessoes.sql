CREATE TABLE sessoes (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  token TEXT NOT NULL,
  device_name TEXT,
  so TEXT,
  ip TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_access TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE
);