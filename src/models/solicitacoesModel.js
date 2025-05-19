const db = require('../config/db');

const SolicitacoesModel = {
  async criar({ livro_id, solicitante_id, destinatario_id, mensagem }) {
    const { rows } = await db.query(
      `INSERT INTO solicitacoes (livro_id, solicitante_id, destinatario_id, mensagem)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [livro_id, solicitante_id, destinatario_id, mensagem]
    );
    return rows[0];
  },

  async listarPorDestinatario(destinatario_id) {
    const { rows } = await db.query(
      `SELECT * FROM solicitacoes WHERE destinatario_id = $1 ORDER BY criada_em DESC`,
      [destinatario_id]
    );
    return rows;
  },

  async atualizarStatus(id, status) {
    const { rows } = await db.query(
      `UPDATE solicitacoes SET status = $1, atualizada_em = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return rows[0];
  },

  async buscarPorId(id) {
    const { rows } = await db.query(
      `SELECT * FROM solicitacoes WHERE id = $1`,
      [id]
    );
    return rows[0];
  },

  async excluir(id) {
    const { rowCount } = await db.query(
      `DELETE FROM solicitacoes WHERE id = $1`,
      [id]
    );
    return rowCount > 0;
  },
};

module.exports = SolicitacoesModel; 