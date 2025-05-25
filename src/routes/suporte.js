const express = require('express');
const router = express.Router();
const suporteController = require('../controllers/suporteController');

// Enviar mensagem de suporte
router.post('/', suporteController.enviarMensagem);

// Listar mensagens de suporte de um usuário
router.get('/usuario/:usuario_id', suporteController.listarMensagens);

// Obter detalhes de uma mensagem específica
router.get('/:id', suporteController.obterMensagem);

module.exports = router;
