const express = require('express');
const router = express.Router();
const resetSenhaController = require('../controllers/resetSenhaController');

// Rota para solicitar reset de senha
router.post('/solicitar', resetSenhaController.solicitarReset);

// Rota para verificar token
router.get('/verificar/:token', resetSenhaController.verificarToken);

// Rota para redefinir senha com token
router.post('/redefinir/:token', resetSenhaController.redefinirSenha);

module.exports = router;
