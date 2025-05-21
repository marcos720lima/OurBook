const express = require('express');
const router = express.Router();
const solicitacoesController = require('../controllers/solicitacoesController');

// Criar solicitação de troca
router.post('/', solicitacoesController.criar);

// Listar solicitações recebidas por destinatário
router.get('/destinatario/:destinatario_id', solicitacoesController.listarPorDestinatario);

// Atualizar status da solicitação (aceitar/recusar)
router.put('/:id/status', solicitacoesController.atualizarStatus);

// Buscar solicitação por ID
router.get('/:id', solicitacoesController.buscarPorId);

// Excluir solicitação
router.delete('/:id', solicitacoesController.excluir);

// Listar solicitações feitas por solicitante
router.get('/solicitante/:solicitante_id', solicitacoesController.listarPorSolicitante);

module.exports = router; 