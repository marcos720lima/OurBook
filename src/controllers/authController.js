// src/controllers/authController.js
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

exports.registerUser = async (req, res) => {
  const {
    nome,
    usuario,
    email,
    telefone,
    senha,
    estado,
    cidade,
    mostrar_localizacao,
    generos
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO usuarios 
        (nome, usuario, email, telefone, senha, estado, cidade, mostrar_localizacao, generos) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING id, nome, email`,
      [nome, usuario, email, telefone, hashedPassword, estado, cidade, mostrar_localizacao, generos]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso!", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      res.status(400).json({ error: "Email ou usuário já cadastrado." });
    } else {
      res.status(500).json({ error: "Erro ao cadastrar usuário." });
    }
  }
};
