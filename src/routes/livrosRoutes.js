const express = require('express');
const router = express.Router();
const livrosModel = require('../models/livrosModel');
const auth = require('../middleware/auth');

// Rota para obter todos os livros
router.get('/', async (req, res) => {
  try {
    const livros = await livrosModel.getAllLivros();
    res.json(livros);
  } catch (error) {
    console.error('Erro ao buscar livros:', error);
    res.status(500).json({ message: 'Erro ao buscar livros' });
  }
});

// Rota para obter livros por gênero
router.get('/genero/:genero', async (req, res) => {
  try {
    const livros = await livrosModel.getLivrosByGenero(req.params.genero);
    res.json(livros);
  } catch (error) {
    console.error('Erro ao buscar livros por gênero:', error);
    res.status(500).json({ message: 'Erro ao buscar livros por gênero' });
  }
});

// Rota para obter livros por usuário
router.get('/usuario/:id', async (req, res) => {
  try {
    const livros = await livrosModel.getLivrosByUsuario(req.params.id);
    res.json(livros);
  } catch (error) {
    console.error('Erro ao buscar livros do usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar livros do usuário' });
  }
});

// Rota para pesquisar livros
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: 'Termo de pesquisa não fornecido' });
  }

  try {
    const livros = await livrosModel.searchLivros(q);
    res.json(livros);
  } catch (error) {
    console.error('Erro ao pesquisar livros:', error);
    res.status(500).json({ message: 'Erro ao pesquisar livros' });
  }
});

// Rota para obter livros por preferências do usuário
router.post('/preferencias', auth, async (req, res) => {
  const { generos } = req.body;
  if (!generos || !Array.isArray(generos) || generos.length === 0) {
    return res.status(400).json({ message: 'Gêneros não fornecidos corretamente' });
  }

  try {
    const livros = await livrosModel.getLivrosByPreferencias(generos);
    res.json(livros);
  } catch (error) {
    console.error('Erro ao buscar livros por preferências:', error);
    res.status(500).json({ message: 'Erro ao buscar livros por preferências' });
  }
});

// Rota para adicionar um novo livro (protegida por autenticação)
router.post('/', auth, async (req, res) => {
  console.log('Recebendo requisição para adicionar livro');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Usuário autenticado:', req.usuario);
  
  const { titulo, autor, estado_livro, genero, fotos, status } = req.body;
  
  // Validação básica
  if (!titulo || !autor || !estado_livro || !genero) {
    console.log('Campos obrigatórios faltando:', { titulo, autor, estado_livro, genero });
    return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos' });
  }

  try {
    const livroData = {
      titulo,
      autor,
      estado_livro,
      genero,
      fotos: fotos || [],
      usuario_id: req.usuario.id,
      status: status || 'disponivel'
    };
    
    console.log('Dados do livro a serem salvos:', livroData);
    
    const novoLivro = await livrosModel.addLivro(livroData);
    console.log('Livro salvo com sucesso:', novoLivro);
    
    res.status(201).json(novoLivro);
  } catch (error) {
    console.error('Erro ao adicionar livro:', error);
    res.status(500).json({ message: 'Erro ao adicionar livro' });
  }
});

// Rota para atualizar um livro (protegida por autenticação)
router.put('/:id', auth, async (req, res) => {
  const livroId = req.params.id;
  const { titulo, autor, estado_livro, genero, fotos, disponivel, status } = req.body;
  
  try {
    // Verificar se o livro pertence ao usuário
    const livrosDoUsuario = await livrosModel.getLivrosByUsuario(req.usuario.id);
    const livroExistente = livrosDoUsuario.find(livro => livro.id == livroId);
    
    if (!livroExistente) {
      return res.status(403).json({ message: 'Você não tem permissão para editar este livro' });
    }
    
    const livroData = {
      titulo: titulo || livroExistente.titulo,
      autor: autor || livroExistente.autor,
      estado_livro: estado_livro || livroExistente.estado_livro,
      genero: genero || livroExistente.genero,
      fotos: fotos || livroExistente.fotos,
      disponivel: disponivel !== undefined ? disponivel : livroExistente.disponivel,
      status: status || livroExistente.status
    };
    
    const livroAtualizado = await livrosModel.updateLivro(livroId, livroData);
    res.json(livroAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar livro:', error);
    res.status(500).json({ message: 'Erro ao atualizar livro' });
  }
});

// Rota para excluir um livro (protegida por autenticação)
router.delete('/:id', auth, async (req, res) => {
  const livroId = req.params.id;
  
  try {
    // Verificar se o livro pertence ao usuário
    const livrosDoUsuario = await livrosModel.getLivrosByUsuario(req.usuario.id);
    const livroExistente = livrosDoUsuario.find(livro => livro.id == livroId);
    
    if (!livroExistente) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir este livro' });
    }
    
    const livroExcluido = await livrosModel.deleteLivro(livroId);
    res.json({ message: 'Livro excluído com sucesso', livro: livroExcluido });
  } catch (error) {
    console.error('Erro ao excluir livro:', error);
    res.status(500).json({ message: 'Erro ao excluir livro' });
  }
});

// Rota para obter livro por ID
router.get('/:id', async (req, res) => {
  try {
    const livro = await livrosModel.getLivroById(req.params.id);
    if (!livro) {
      return res.status(404).json({ message: 'Livro não encontrado' });
    }
    res.json(livro);
  } catch (error) {
    console.error('Erro ao buscar livro por ID:', error);
    res.status(500).json({ message: 'Erro ao buscar livro por ID' });
  }
});

module.exports = router;
