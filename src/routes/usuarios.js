const express = require("express");
const router = express.Router();
const pool = require("../config/db");

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
    generos 
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
        generos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos]
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

module.exports = router;
