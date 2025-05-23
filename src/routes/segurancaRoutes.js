const express = require('express');
const router = express.Router();
const DispositivosModel = require('../models/sessoesModel');
const auth = require('../middleware/auth');

// Listar dispositivos conectados
router.get('/dispositivos', auth, async (req, res) => {
  const dispositivos = await DispositivosModel.listarPorUsuario(req.usuario.id);
  res.json(dispositivos);
});

// Desconectar um dispositivo
router.post('/dispositivos/desconectar', auth, async (req, res) => {
  const { id } = req.body;
  await DispositivosModel.desconectar(id, req.usuario.id);
  res.json({ ok: true });
});

// Desconectar todos (menos o atual)
router.post('/dispositivos/desconectar-todos', auth, async (req, res) => {
  await DispositivosModel.desconectarTodos(req.usuario.id, req.token);
  res.json({ ok: true });
});

module.exports = router; 