const db = require('../config/db');

const PreferenciasModel = {
  async buscarPorUsuarioId(usuario_id) {
    const { rows } = await db.query('SELECT * FROM preferencias WHERE usuario_id = $1', [usuario_id]);
    return rows[0];
  },

  async atualizar(usuario_id, dados) {
    const { notificacoes, tema_escuro, idioma, expo_push_token } = dados;
    const { rows } = await db.query(
      `UPDATE preferencias SET notificacoes = $1, tema_escuro = $2, idioma = $3, expo_push_token = $4, atualizado_em = NOW()
       WHERE usuario_id = $5 RETURNING *`,
      [notificacoes, tema_escuro, idioma, expo_push_token, usuario_id]
    );
    return rows[0];
  },

  async criarPadrao(usuario_id) {
    const { rows } = await db.query(
      `INSERT INTO preferencias (usuario_id) VALUES ($1) RETURNING *`,
      [usuario_id]
    );
    return rows[0];
  }
};

module.exports = PreferenciasModel; 