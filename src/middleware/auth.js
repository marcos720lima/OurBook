const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Middleware de autenticação
const auth = async (req, res, next) => {
  try {
    console.log('Middleware de autenticação iniciado');
    console.log('Headers recebidos:', req.headers);
    
    // Obter o token do header Authorization
    const authHeader = req.headers.authorization;
    console.log('Header de autorização:', authHeader);
    
    if (!authHeader) {
      console.log('Token não fornecido no header');
      return res.status(401).json({ message: 'Token de autenticação não fornecido' });
    }
    
    // Verificar se o formato do token é Bearer token ou nosso formato temporário user_ID
    let token;
    let userId;
    
    if (authHeader.startsWith('Bearer ')) {
      // Formato padrão JWT
      token = authHeader.replace('Bearer ', '');
      console.log('Token extraído:', token);
      
      try {
        // Verificar o token JWT (quando implementado)
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // userId = decoded.id;
        
        // Como não temos JWT implementado ainda, vamos extrair o ID do token temporário
        if (token.startsWith('user_')) {
          userId = Number(token.split('_')[1]);
          console.log('ID do usuário extraído:', userId);
        } else {
          console.log('Formato de token inválido:', token);
          throw new Error('Formato de token inválido');
        }
      } catch (error) {
        console.error('Erro ao processar token:', error);
        return res.status(401).json({ message: 'Token inválido' });
      }
    } else if (authHeader.startsWith('user_')) {
      // Formato temporário: user_ID
      userId = Number(authHeader.split('_')[1]);
      console.log('ID do usuário extraído (formato direto):', userId);
    } else {
      console.log('Formato de token inválido:', authHeader);
      return res.status(401).json({ message: 'Formato de token inválido' });
    }
    
    // Verificar se o usuário existe no banco de dados
    console.log('Buscando usuário no banco de dados:', userId);
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      console.log('Usuário não encontrado:', userId);
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }
    
    // Adicionar o usuário ao objeto de requisição
    req.usuario = result.rows[0];
    console.log('Usuário autenticado:', req.usuario);
    
    // Continuar para o próximo middleware ou rota
    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

module.exports = auth;
