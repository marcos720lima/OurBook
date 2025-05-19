const pool = require('../config/db');

// Adicionar logs para depuração
console.log('Modelo de livros carregado');

const livrosModel = {
  // Buscar todos os livros
  getAllLivros: async () => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.nome as usuario_nome, u.usuario as usuario_username
        FROM livros l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE l.disponivel = true
        ORDER BY l.data_cadastro DESC
      `);
      // Conversão para base64
      const livros = result.rows.map(livro => ({
        ...livro,
        fotos: livro.fotos ? livro.fotos.map(foto => foto ? foto.toString('base64') : null) : []
      }));
      return livros;
    } catch (error) {
      throw error;
    }
  },

  // Buscar livros por gênero
  getLivrosByGenero: async (genero) => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.nome as usuario_nome, u.usuario as usuario_username
        FROM livros l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE l.genero = $1 AND l.disponivel = true
        ORDER BY l.data_cadastro DESC
      `, [genero]);
      // Conversão para base64
      const livros = result.rows.map(livro => ({
        ...livro,
        fotos: livro.fotos ? livro.fotos.map(foto => foto ? foto.toString('base64') : null) : []
      }));
      return livros;
    } catch (error) {
      throw error;
    }
  },

  // Buscar livros por usuário
  getLivrosByUsuario: async (usuarioId) => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.nome as usuario_nome, u.usuario as usuario_username
        FROM livros l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE l.usuario_id = $1
        ORDER BY l.data_cadastro DESC
      `, [usuarioId]);
      // Conversão para base64
      const livros = result.rows.map(livro => ({
        ...livro,
        fotos: livro.fotos ? livro.fotos.map(foto => foto ? foto.toString('base64') : null) : []
      }));
      return livros;
    } catch (error) {
      throw error;
    }
  },

  // Buscar livros por termo de pesquisa (título, autor ou gênero)
  searchLivros: async (searchTerm) => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.nome as usuario_nome, u.usuario as usuario_username
        FROM livros l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE 
          (l.titulo ILIKE $1 OR 
          l.autor ILIKE $1 OR 
          l.genero ILIKE $1) AND
          l.disponivel = true
        ORDER BY l.data_cadastro DESC
      `, [`%${searchTerm}%`]);
      // Conversão para base64
      const livros = result.rows.map(livro => ({
        ...livro,
        fotos: livro.fotos ? livro.fotos.map(foto => foto ? foto.toString('base64') : null) : []
      }));
      return livros;
    } catch (error) {
      throw error;
    }
  },

  // Adicionar um novo livro
  addLivro: async (livroData) => {
    const { titulo, autor, estado_livro, genero, fotos, usuario_id } = livroData;
    
    try {
      // Converter as imagens base64 para Buffer antes de salvar
      const fotosBuffer = fotos.map(foto => Buffer.from(foto, 'base64'));
      
      const result = await pool.query(`
        INSERT INTO livros (titulo, autor, estado_livro, genero, fotos, usuario_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [titulo, autor, estado_livro, genero, fotosBuffer, usuario_id]);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Atualizar um livro existente
  updateLivro: async (id, livroData) => {
    const { titulo, autor, estado_livro, genero, fotos, disponivel } = livroData;
    
    try {
      const result = await pool.query(`
        UPDATE livros
        SET 
          titulo = $1,
          autor = $2,
          estado_livro = $3,
          genero = $4,
          fotos = $5,
          disponivel = $6
        WHERE id = $7
        RETURNING *
      `, [titulo, autor, estado_livro, genero, fotos, disponivel, id]);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Excluir um livro
  deleteLivro: async (id) => {
    try {
      const result = await pool.query('DELETE FROM livros WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Buscar livros por preferências do usuário
  getLivrosByPreferencias: async (generos) => {
    try {
      // Converter array de gêneros para formato adequado para consulta SQL
      const generosQuery = generos.map((_, index) => `$${index + 1}`).join(', ');
      const result = await pool.query(`
        SELECT l.*, u.nome as usuario_nome, u.usuario as usuario_username
        FROM livros l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE l.genero IN (${generosQuery}) AND l.disponivel = true
        ORDER BY l.data_cadastro DESC
      `, generos);
      // Conversão para base64
      const livros = result.rows.map(livro => ({
        ...livro,
        fotos: livro.fotos ? livro.fotos.map(foto => foto ? foto.toString('base64') : null) : []
      }));
      return livros;
    } catch (error) {
      throw error;
    }
  },

  // Buscar livro por ID
  getLivroById: async (id) => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.nome as usuario_nome, u.usuario as usuario_username
        FROM livros l
        JOIN usuarios u ON l.usuario_id = u.id
        WHERE l.id = $1
      `, [id]);
      if (result.rows.length === 0) return null;
      const livro = result.rows[0];
      return {
        id: livro.id,
        titulo: livro.titulo,
        autor: livro.autor,
        estado_livro: livro.estado_livro,
        genero: livro.genero,
        fotos: livro.fotos ? livro.fotos.map(foto => foto ? foto.toString('base64') : null) : [],
        usuario: {
          id: livro.usuario_id,
          nome: livro.usuario_nome,
          username: livro.usuario_username,
          foto: null,
          email: null,
          telefone: null,
          localizacao: null
        },
        descricao: livro.descricao || null
      };
    } catch (error) {
      throw error;
    }
  }
};

module.exports = livrosModel;
