const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const preferenciasController = require('../controllers/preferenciasController');

// 1. Registro de usuário
router.post("/register", async (req, res) => {
  const { 
    nome, 
    usuario, 
    email, 
    senha, 
    telefone,
    estado,
    cidade,
    mostrar_localizacao,
    generos,
    foto
  } = req.body;

  try {
    const novoUsuario = await pool.query(
      `INSERT INTO usuarios (
        nome, 
        usuario, 
        email, 
        senha, 
        telefone,
        estado,
        cidade,
        mostrar_localizacao,
        generos,
        foto
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos, foto]
    );
    res.status(201).json(novoUsuario.rows[0]);
  } catch (err) {
    console.error('Erro ao registrar:', err);
    res.status(500).json({ 
      erro: "Erro ao registrar usuário", 
      detalhes: err.message,
      stack: err.stack 
    });
  }
});

// 2. Login de usuário
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1 AND senha = $2", [email, senha]);
    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(401).json({ erro: "Email ou senha inválidos" });
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro ao fazer login", detalhes: err.message });
  }
});

// 3. Buscar todos os usuários
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar usuários", detalhes: err.message });
  }
});

// 4. Buscar usuário por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ erro: "Usuário não encontrado" });
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar usuário", detalhes: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos, foto } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuarios SET 
        nome = $1,
        usuario = $2,
        email = $3,
        senha = COALESCE($4, senha),
        telefone = $5,
        estado = $6,
        cidade = $7,
        mostrar_localizacao = $8,
        generos = $9,
        foto = $10
      WHERE id = $11
      RETURNING *`,
      [nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos, foto, id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ erro: "Usuário não encontrado" });
    }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err, 'Body:', req.body);
    res.status(500).json({ erro: "Erro ao atualizar usuário", detalhes: err.message, stack: err.stack });
  }
});

// Preferências do usuário
router.get('/:usuario_id/preferencias', preferenciasController.buscar);
router.put('/:usuario_id/preferencias', preferenciasController.atualizar);

// Buscar usuários por nome ou username
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }
  try {
    const result = await pool.query(
      `SELECT id, nome, usuario, foto FROM usuarios WHERE nome ILIKE $1 OR usuario ILIKE $1`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuários', detalhes: err.message });
  }
});

module.exports = router;
