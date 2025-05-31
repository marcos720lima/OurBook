const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const preferenciasController = require('../controllers/preferenciasController');
const DispositivosModel = require('../models/sessoesModel');
const { v4: uuidv4 } = require('uuid');
const { enviarSMS } = require('../utils/sms');

console.log('[ROTA] Rotas de usuários carregadas');
router.use((req, res, next) => {
  console.log('[ROTA] Nova requisição:', req.method, req.originalUrl);
  next();
});

// Desativar 2FA (corrigido para não duplicar o prefixo)
router.post('/:id/2fa/desativar', async (req, res) => {
  console.log('[2FA][DEBUG] Desativar 2FA:', { params: req.params, body: req.body });
  const { id } = req.params;
  const { codigo } = req.body;
  try {
    // Verifica o código
    const result = await pool.query(
      `SELECT * FROM codigos_verificacao WHERE usuario_id = $1 AND codigo = $2 AND expiracao > NOW() AND usado = FALSE`,
      [id, codigo]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ erro: 'Código inválido ou expirado' });
    }
    // Marca o código como usado
    await pool.query(
      `UPDATE codigos_verificacao SET usado = TRUE WHERE id = $1`,
      [result.rows[0].id]
    );
    // Desativa o 2FA
    await pool.query(`UPDATE usuarios SET two_factor_enabled = FALSE WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[2FA][DEBUG] Erro ao desativar 2FA:', err);
    res.status(500).json({ erro: 'Erro ao desativar 2FA', detalhes: err.message });
  }
});

// 1. Registro de usuário
router.post("/register", async (req, res) => {
  const { 
    nome, 
    usuario, 
    email, 
    senha, 
    telefone,
    estado,
    cidade,
    mostrar_localizacao,
    generos,
    foto
  } = req.body;

  try {
    const novoUsuario = await pool.query(
      `INSERT INTO usuarios (
        nome, 
        usuario, 
        email, 
        senha, 
        telefone,
        estado,
        cidade,
        mostrar_localizacao,
        generos,
        foto
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos, foto]
    );
    res.status(201).json(novoUsuario.rows[0]);
  } catch (err) {
    console.error('Erro ao registrar:', err);
    res.status(500).json({ 
      erro: "Erro ao registrar usuário", 
      detalhes: err.message,
      stack: err.stack 
    });
  }
});

// 2. Login de usuário
router.post("/login", async (req, res) => {
  const { email, senha, device_name, so, ip } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1 AND senha = $2", [email, senha]);
    if (result.rows.length > 0) {
      const usuario = result.rows[0];

      // Registrar acesso no histórico
      try {
        await pool.query(
          `INSERT INTO historico_acessos (usuario_id, data_hora, device_name, so, ip)
           VALUES ($1, NOW(), $2, $3, $4)`,
          [usuario.id, device_name || null, so || null, ip || null]
        );
        // Registrar dispositivo conectado
        await pool.query(
          `INSERT INTO dispositivos_usuario (usuario_id, token, device_name, so, ip, ativo, created_at, last_access)
           VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
           ON CONFLICT (usuario_id, device_name, so, ip) DO UPDATE SET ativo = TRUE, last_access = NOW()`,
          [usuario.id, 'user_' + usuario.id, device_name || null, so || null, ip || null]
        );
      } catch (e) {
        console.error('Erro ao registrar histórico de acesso/dispositivo:', e);
      }

      // Se o usuário tem 2FA ativado
      if (usuario.two_factor_enabled) {
        // Gera um token temporário (pode ser mais seguro se quiser)
        return res.json({
          two_factor_required: true,
          temp_token: 'user_' + usuario.id,
          telefone: usuario.telefone,
          id: usuario.id
        });
      }

      // Login normal
      const token = uuidv4();
      res.status(200).json({ ...usuario, token });
    } else {
      res.status(401).json({ erro: "Email ou senha inválidos" });
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro ao fazer login", detalhes: err.message });
  }
});

// 3. Buscar todos os usuários
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar usuários", detalhes: err.message });
  }
});

// Buscar usuários por nome ou username
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }
  try {
    const result = await pool.query(
      `SELECT id, nome, usuario, foto FROM usuarios WHERE nome ILIKE $1 OR usuario ILIKE $1`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuários', detalhes: err.message });
  }
});

// Buscar usuário por telefone
router.get('/telefone/:telefone', async (req, res) => {
  const { telefone } = req.params;
  console.log('[ROTA] Buscando usuário por telefone:', telefone);
  
  if (!telefone) {
    return res.status(400).json({ erro: 'Telefone é obrigatório' });
  }
  
  try {
    // Limpa o telefone para buscar apenas os números
    const numeroLimpo = telefone.replace(/\D/g, '');
    console.log('[ROTA] Telefone limpo para busca:', numeroLimpo);
    
    // Busca com diferentes formatos possíveis
    const result = await pool.query(
      `SELECT id, nome, usuario, email, telefone FROM usuarios 
       WHERE telefone = $1 OR telefone = $2 OR telefone = $3 OR telefone LIKE $4`,
      [numeroLimpo, `+55${numeroLimpo}`, `+${numeroLimpo}`, `%${numeroLimpo}%`]
    );
    
    if (result.rows.length > 0) {
      console.log('[ROTA] Usuário encontrado:', result.rows[0].id);
      res.json({ usuario: result.rows[0] });
    } else {
      console.log('[ROTA] Usuário não encontrado para o telefone:', telefone);
      res.status(404).json({ erro: 'Usuário não encontrado' });
    }
  } catch (err) {
    console.error('[ROTA] Erro ao buscar usuário por telefone:', err);
    res.status(500).json({ erro: 'Erro ao buscar usuário', detalhes: err.message });
  }
});

// 4. Buscar usuário por ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE id = $1", [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ erro: "Usuário não encontrado" });
    }
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar usuário", detalhes: err.message });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos, foto } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuarios SET 
        nome = $1,
        usuario = $2,
        email = $3,
        senha = COALESCE($4, senha),
        telefone = $5,
        estado = $6,
        cidade = $7,
        mostrar_localizacao = $8,
        generos = $9,
        foto = $10
      WHERE id = $11
      RETURNING *`,
      [nome, usuario, email, senha, telefone, estado, cidade, mostrar_localizacao, generos, foto, id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ erro: "Usuário não encontrado" });
    }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err, 'Body:', req.body);
    res.status(500).json({ erro: "Erro ao atualizar usuário", detalhes: err.message, stack: err.stack });
  }
});

// Preferências do usuário
router.get('/:usuario_id/preferencias', preferenciasController.buscar);
router.put('/:usuario_id/preferencias', preferenciasController.atualizar);

// Função para formatar telefone para o formato internacional (Brasil)
function formatarTelefoneParaInternacional(telefone) {
  let numero = telefone.replace(/\D/g, '');
  if (numero.startsWith('0')) {
    numero = numero.substring(1);
  }
  if (numero.startsWith('55')) {
    return '+' + numero;
  }
  if (numero.length === 11 || numero.length === 10) {
    return '+55' + numero;
  }
  if (telefone.startsWith('+')) {
    return telefone;
  }
  return telefone;
}

// Enviar código 2FA por SMS
router.post('/2fa/enviar-codigo', async (req, res) => {
  const { telefone, usuario_id } = req.body;
  console.log('[2FA] Requisição para enviar código:', { telefone, usuario_id });
  if (!telefone || !usuario_id) {
    console.log('[2FA] Falta telefone ou usuario_id');
    return res.status(400).json({ erro: 'Telefone e usuário obrigatórios' });
  }

  // Gera código de 6 dígitos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expiracao = new Date(Date.now() + 5 * 60000); // 5 minutos
  console.log('[2FA] Código gerado:', codigo, 'Expira em:', expiracao);

  // Salva no banco
  try {
    await pool.query(
      `INSERT INTO codigos_verificacao (usuario_id, codigo, telefone, expiracao) VALUES ($1, $2, $3, $4)`,
      [usuario_id, codigo, telefone, expiracao]
    );
    console.log('[2FA] Código salvo no banco');
  } catch (e) {
    console.error('[2FA] Erro ao salvar código no banco:', e);
    return res.status(500).json({ erro: 'Erro ao salvar código no banco', detalhes: e.message });
  }

  // Formata o telefone para internacional
  const telefoneFormatado = formatarTelefoneParaInternacional(telefone);
  console.log('[2FA] Telefone formatado para internacional:', telefoneFormatado);

  // Envia SMS
  try {
    await enviarSMS(telefoneFormatado, `Seu código de verificação OurBook: ${codigo}`);
    console.log('[2FA] SMS enviado com sucesso');
    res.json({ ok: true, mensagem: 'Código enviado' });
  } catch (e) {
    console.error('[2FA] Erro ao enviar SMS:', e);
    res.status(500).json({ erro: 'Erro ao enviar SMS', detalhes: e.message });
  }
});

// Verificar código 2FA
router.post('/2fa/verificar', async (req, res) => {
  const { usuario_id, codigo } = req.body;
  console.log('[2FA][DEBUG] Tentando verificar código:', { usuario_id, codigo });
  if (!usuario_id || !codigo) return res.status(400).json({ erro: 'Dados obrigatórios' });

  const result = await pool.query(
    `SELECT * FROM codigos_verificacao WHERE usuario_id = $1 AND codigo = $2 AND expiracao > NOW() AND usado = FALSE`,
    [usuario_id, codigo]
  );
  console.log('[2FA][DEBUG] Resultado da busca:', result.rows);

  if (result.rows.length === 0) {
    return res.status(400).json({ erro: 'Código inválido ou expirado' });
  }

  // Marca como usado
  await pool.query(
    `UPDATE codigos_verificacao SET usado = TRUE WHERE id = $1`,
    [result.rows[0].id]
  );

  res.json({ ok: true, mensagem: 'Código verificado com sucesso' });
});

// Ativar 2FA
router.post('/:id/2fa/ativar', async (req, res) => {
  const { id } = req.params;
  console.log('[2FA] Requisição para ativar 2FA do usuário:', id);
  try {
    // Buscar telefone do usuário
    const result = await pool.query('SELECT telefone FROM usuarios WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      console.log('[2FA] Usuário não encontrado:', id);
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    let telefone = result.rows[0].telefone;
    // Formatar telefone para internacional
    const telefoneFormatado = formatarTelefoneParaInternacional(telefone);
    // Se o telefone salvo for diferente do formatado, atualize no banco
    if (telefoneFormatado !== telefone) {
      await pool.query('UPDATE usuarios SET telefone = $1 WHERE id = $2', [telefoneFormatado, id]);
      telefone = telefoneFormatado;
      console.log('[2FA] Telefone do usuário atualizado para internacional:', telefoneFormatado);
    }
    // Ativar 2FA
    await pool.query(`UPDATE usuarios SET two_factor_enabled = TRUE WHERE id = $1`, [id]);
    console.log('[2FA] 2FA ativado para o usuário:', id);
    res.json({ ok: true, telefone: telefoneFormatado });
  } catch (err) {
    console.error('[2FA] Erro ao ativar 2FA:', err);
    res.status(500).json({ erro: 'Erro ao ativar 2FA', detalhes: err.message });
  }
});

// Registrar novo dispositivo para o usuário
router.post('/:id/dispositivos', async (req, res) => {
  const { id } = req.params;
  const { token, device_name, so, ip } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO dispositivos_usuario (usuario_id, token, device_name, so, ip, ativo, created_at, last_access)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW()) RETURNING *`,
      [id, token, device_name, so, ip]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar dispositivo', detalhes: err.message });
  }
});

// Remover um dispositivo do usuário
router.delete('/:usuario_id/dispositivos/:dispositivo_id', async (req, res) => {
  const { usuario_id, dispositivo_id } = req.params;
  try {
    await pool.query(
      'DELETE FROM dispositivos_usuario WHERE id = $1 AND usuario_id = $2',
      [dispositivo_id, usuario_id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover dispositivo', detalhes: err.message });
  }
});

// Enviar código para alteração de senha
router.post('/enviar-codigo-alterar-senha', async (req, res) => {
  const { usuario_id, telefone } = req.body;
  console.log('[RESET SENHA] Requisição para enviar código:', { usuario_id, telefone });
  
  if (!usuario_id || !telefone) {
    console.log('[RESET SENHA] Dados obrigatórios faltando');
    return res.status(400).json({ erro: 'Dados obrigatórios' });
  }

  // Verificar se o usuário existe
  try {
    const userCheck = await pool.query('SELECT * FROM usuarios WHERE id = $1', [usuario_id]);
    if (userCheck.rows.length === 0) {
      console.log('[RESET SENHA] Usuário não encontrado:', usuario_id);
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
  } catch (err) {
    console.error('[RESET SENHA] Erro ao verificar usuário:', err);
    return res.status(500).json({ erro: 'Erro ao verificar usuário', detalhes: err.message });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expiracao = new Date(Date.now() + 5 * 60000); // 5 minutos
  console.log('[RESET SENHA] Código gerado:', codigo, 'Expira em:', expiracao);

  // Limpar telefone para garantir formato correto
  const numeroLimpo = telefone.replace(/\D/g, '');
  const telefoneFormatado = formatarTelefoneParaInternacional(numeroLimpo);
  console.log('[RESET SENHA] Telefone formatado:', telefoneFormatado);

  try {
    // Primeiro, invalidar códigos anteriores para este usuário
    await pool.query(
      `UPDATE codigos_verificacao SET usado = TRUE 
       WHERE usuario_id = $1 AND tipo = 'senha' AND usado = FALSE`,
      [usuario_id]
    );
    
    // Inserir novo código
    await pool.query(
      `INSERT INTO codigos_verificacao (usuario_id, codigo, telefone, expiracao, tipo, usado)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [usuario_id, codigo, telefoneFormatado, expiracao, 'senha']
    );
    console.log('[RESET SENHA] Código salvo no banco');
    
    // Enviar SMS
    await enviarSMS(telefoneFormatado, `Seu código OurBook para alterar a senha: ${codigo}`);
    console.log('[RESET SENHA] SMS enviado com sucesso');
    
    res.json({ ok: true, mensagem: 'Código enviado' });
  } catch (e) {
    console.error('[RESET SENHA] Erro ao processar solicitação:', e);
    res.status(500).json({ erro: 'Erro ao enviar código', detalhes: e.message });
  }
});

// Verificar código para alteração de senha
router.post('/verificar-codigo-alterar-senha', async (req, res) => {
  const { usuario_id, codigo } = req.body;
  console.log('[RESET SENHA] Verificando código:', { usuario_id, codigo });
  
  if (!usuario_id || !codigo) {
    console.log('[RESET SENHA] Dados obrigatórios faltando');
    return res.status(400).json({ erro: 'Dados obrigatórios' });
  }

  try {
    // Verificar se o código existe, é válido e não expirou
    const result = await pool.query(
      `SELECT * FROM codigos_verificacao
       WHERE usuario_id = $1 AND codigo = $2 AND tipo = $3 AND expiracao > NOW() AND usado = FALSE`,
      [usuario_id, codigo, 'senha']
    );
    console.log('[RESET SENHA] Resultado da verificação:', result.rows.length > 0 ? 'Código válido' : 'Código inválido');

    if (result.rows.length === 0) {
      // Verificar se o código existe mas expirou
      const expiredCheck = await pool.query(
        `SELECT * FROM codigos_verificacao
         WHERE usuario_id = $1 AND codigo = $2 AND tipo = $3 AND expiracao <= NOW()`,
        [usuario_id, codigo, 'senha']
      );
      
      if (expiredCheck.rows.length > 0) {
        console.log('[RESET SENHA] Código expirado');
        return res.json({ success: false, message: 'Código expirado' });
      }
      
      // Verificar se o código já foi usado
      const usedCheck = await pool.query(
        `SELECT * FROM codigos_verificacao
         WHERE usuario_id = $1 AND codigo = $2 AND tipo = $3 AND usado = TRUE`,
        [usuario_id, codigo, 'senha']
      );
      
      if (usedCheck.rows.length > 0) {
        console.log('[RESET SENHA] Código já utilizado');
        return res.json({ success: false, message: 'Código já utilizado' });
      }
      
      console.log('[RESET SENHA] Código inválido');
      return res.json({ success: false, message: 'Código inválido' });
    }

    // Marcar código como usado
    await pool.query(
      `UPDATE codigos_verificacao SET usado = TRUE WHERE id = $1`,
      [result.rows[0].id]
    );
    console.log('[RESET SENHA] Código marcado como usado');

    res.json({ success: true });
  } catch (err) {
    console.error('[RESET SENHA] Erro ao verificar código:', err);
    res.status(500).json({ success: false, erro: 'Erro ao verificar código', detalhes: err.message });
  }
});

// Alterar senha
router.put('/:id/alterar-senha', async (req, res) => {
  const { id } = req.params;
  const { senha } = req.body;
  console.log('[RESET SENHA] Alterando senha para usuário:', id);
  
  if (!senha) {
    console.log('[RESET SENHA] Senha não fornecida');
    return res.status(400).json({ erro: 'Senha obrigatória' });
  }

  // Validar a senha (pelo menos 6 caracteres, uma maiúscula, um número e um caractere especial)
  const senhaRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{6,}$/;
  if (!senhaRegex.test(senha)) {
    console.log('[RESET SENHA] Senha não atende aos requisitos');
    return res.status(400).json({ 
      erro: 'Senha não atende aos requisitos', 
      detalhes: 'A senha deve conter pelo menos 6 caracteres, uma letra maiúscula, um número e um caractere especial.' 
    });
  }

  try {
    // Verificar se o usuário existe
    const userCheck = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      console.log('[RESET SENHA] Usuário não encontrado:', id);
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    // Atualizar a senha
    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senha, id]);
    console.log('[RESET SENHA] Senha alterada com sucesso para usuário:', id);
    
    // Invalidar todos os códigos de verificação pendentes para este usuário
    await pool.query(
      `UPDATE codigos_verificacao SET usado = TRUE 
       WHERE usuario_id = $1 AND tipo = 'senha' AND usado = FALSE`,
      [id]
    );
    console.log('[RESET SENHA] Códigos de verificação pendentes invalidados');
    
    res.json({ ok: true, mensagem: 'Senha alterada com sucesso' });
  } catch (e) {
    console.error('[RESET SENHA] Erro ao alterar senha:', e);
    res.status(500).json({ erro: 'Erro ao alterar senha', detalhes: e.message });
  }
});

// Histórico de acessos do usuário
router.get('/:id/historico-acessos', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT data_hora, device_name, so, ip, localizacao
       FROM historico_acessos
       WHERE usuario_id = $1
       ORDER BY data_hora DESC
       LIMIT 5`,
      [id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao buscar histórico de acessos', detalhes: e.message });
  }
});

module.exports = router;
