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
      `SELECT 
        s.*, 
        l.titulo AS livro_titulo, 
        l.fotos AS livro_fotos, 
        u.nome AS solicitante_nome, 
        u.foto AS solicitante_foto
      FROM solicitacoes s
      JOIN livros l ON l.id = s.livro_id
      JOIN usuarios u ON u.id = s.solicitante_id
      WHERE s.destinatario_id = $1
      ORDER BY s.criada_em DESC`,
      [destinatario_id]
    );
    // Converter fotos para base64
    return rows.map(row => ({
      ...row,
      livro_fotos: row.livro_fotos ? row.livro_fotos.map(foto => foto ? foto.toString('base64') : null) : []
    }));
  },

  async listarPorSolicitante(solicitante_id) {
    const { rows } = await db.query(
      `SELECT 
        s.*, 
        l.titulo AS livro_titulo, 
        l.fotos AS livro_fotos, 
        u.nome AS destinatario_nome, 
        u.foto AS destinatario_foto
      FROM solicitacoes s
      JOIN livros l ON l.id = s.livro_id
      JOIN usuarios u ON u.id = s.destinatario_id
      WHERE s.solicitante_id = $1
      ORDER BY s.criada_em DESC`,
      [solicitante_id]
    );
    // Converter fotos para base64
    return rows.map(row => ({
      ...row,
      livro_fotos: row.livro_fotos ? row.livro_fotos.map(foto => foto ? foto.toString('base64') : null) : []
    }));
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