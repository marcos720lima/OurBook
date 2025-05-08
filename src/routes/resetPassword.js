const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendResetEmail } = require('../utils/emailService');

// 1. Solicitar reset de senha
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (!userResult.rows.length) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const usuarioId = userResult.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hora
    await pool.query(
      'INSERT INTO reset_tokens (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
      [usuarioId, token, expiresAt]
    );
    // Enviar o e-mail de reset
    await sendResetEmail(email, token);
    res.json({ message: 'Se o e-mail existir, um link de redefinição foi enviado.' });
  } catch (err) {
    console.error('Erro ao solicitar reset de senha:', err);
    res.status(500).json({ error: 'Erro ao solicitar reset de senha' });
  }
});

// 2. Resetar senha com token
router.post('/reset-password', async (req, res) => {
  const { token, novaSenha } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    if (!result.rows.length) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }
    const usuarioId = result.rows[0].usuario_id;
    const hash = await bcrypt.hash(novaSenha, 10);
    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [hash, usuarioId]);
    await pool.query('DELETE FROM reset_tokens WHERE token = $1', [token]);
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

module.exports = router; 