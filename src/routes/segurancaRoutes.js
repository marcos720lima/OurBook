const express = require('express');
const router = express.Router();
const SessoesModel = require('../models/sessoesModel');
const auth = require('../middleware/auth');

// Listar dispositivos conectados
router.get('/dispositivos', auth, async (req, res) => {
  const dispositivos = await SessoesModel.listarPorUsuario(req.usuario.id);
  res.json(dispositivos);
});

// Desconectar um dispositivo
router.post('/dispositivos/desconectar', auth, async (req, res) => {
  const { id } = req.body;
  await SessoesModel.desconectar(id, req.usuario.id);
  res.json({ ok: true });
});

// Desconectar todos (menos o atual)
router.post('/dispositivos/desconectar-todos', auth, async (req, res) => {
  await SessoesModel.desconectarTodos(req.usuario.id, req.token);
  res.json({ ok: true });
});

module.exports = router; 