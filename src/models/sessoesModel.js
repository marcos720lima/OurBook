const db = require('../config/db');
const pool = db;

const DispositivosModel = {
  async criar({ usuario_id, token, device_name, so, ip }) {
    const { rows } = await db.query(
      `INSERT INTO dispositivos_usuario (usuario_id, token, device_name, so, ip, ativo, created_at, last_access) VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW()) RETURNING *`,
      [usuario_id, token, device_name, so, ip]
    );
    return rows[0];
  },

  async listarPorUsuario(usuario_id) {
    const { rows } = await db.query(
      `SELECT * FROM dispositivos_usuario WHERE usuario_id = $1 AND ativo = TRUE ORDER BY last_access DESC`,
      [usuario_id]
    );
    return rows;
  },

  async desconectar(id, usuario_id) {
    await db.query(
      `UPDATE dispositivos_usuario SET ativo = FALSE WHERE id = $1 AND usuario_id = $2`,
      [id, usuario_id]
    );
  },

  async desconectarTodos(usuario_id, exceto_token) {
    await db.query(
      `UPDATE dispositivos_usuario SET ativo = FALSE WHERE usuario_id = $1 AND token <> $2`,
      [usuario_id, exceto_token]
    );
  }
};

module.exports = DispositivosModel; 