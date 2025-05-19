const PreferenciasModel = require('../models/preferenciasModel');

const preferenciasController = {
  async buscar(req, res) {
    try {
      const usuario_id = parseInt(req.params.usuario_id, 10);
      let preferencias = await PreferenciasModel.buscarPorUsuarioId(usuario_id);
      if (!preferencias) {
        preferencias = await PreferenciasModel.criarPadrao(usuario_id);
      }
      res.json(preferencias);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar preferências', detalhes: error.message });
    }
  },

  async atualizar(req, res) {
    try {
      const usuario_id = parseInt(req.params.usuario_id, 10);
      const { notificacoes, tema_escuro, idioma, expo_push_token } = req.body;
      const preferencias = await PreferenciasModel.atualizar(usuario_id, { notificacoes, tema_escuro, idioma, expo_push_token });
      res.json(preferencias);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar preferências', detalhes: error.message });
    }
  },
};

module.exports = preferenciasController; 