const SolicitacoesModel = require('../models/solicitacoesModel');
const db = require('../config/db');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

const solicitacoesController = {
  async criar(req, res) {
    try {
      const { livro_id, solicitante_id, destinatario_id, mensagem } = req.body;
      const solicitacao = await SolicitacoesModel.criar({ livro_id, solicitante_id, destinatario_id, mensagem });

      // Buscar expo_push_token do destinatario
      const tokenResult = await db.query('SELECT expo_push_token FROM preferencias WHERE usuario_id = $1', [destinatario_id]);
      const expoPushToken = tokenResult.rows[0]?.expo_push_token;

      if (expoPushToken && Expo.isExpoPushToken(expoPushToken)) {
        const notificacao = {
          to: expoPushToken,
          sound: 'default',
          title: 'Nova solicitação de troca!',
          body: mensagem || 'Você recebeu uma nova solicitação de troca de livro.',
          data: { solicitacaoId: solicitacao.id },
        };
        try {
          await expo.sendPushNotificationsAsync([notificacao]);
        } catch (err) {
          console.error('Erro ao enviar notificação push:', err);
        }
      }

      res.status(201).json(solicitacao);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar solicitação', detalhes: error.message });
    }
  },

  async listarPorDestinatario(req, res) {
    try {
      const { destinatario_id } = req.params;
      const solicitacoes = await SolicitacoesModel.listarPorDestinatario(destinatario_id);
      res.json(solicitacoes);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao listar solicitações', detalhes: error.message });
    }
  },

  async atualizarStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const solicitacao = await SolicitacoesModel.atualizarStatus(id, status);
      res.json(solicitacao);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar status da solicitação', detalhes: error.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const solicitacao = await SolicitacoesModel.buscarPorId(id);
      if (solicitacao) {
        res.json(solicitacao);
      } else {
        res.status(404).json({ erro: 'Solicitação não encontrada' });
      }
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar solicitação', detalhes: error.message });
    }
  },

  async excluir(req, res) {
    try {
      const { id } = req.params;
      const ok = await SolicitacoesModel.excluir(id);
      if (ok) {
        res.status(204).send();
      } else {
        res.status(404).json({ erro: 'Solicitação não encontrada' });
      }
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao excluir solicitação', detalhes: error.message });
    }
  },
};

module.exports = solicitacoesController; 