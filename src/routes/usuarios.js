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
  const { email, senha, device_name, so } = req.body;
  try {
    const result = await pool.query("SELECT * FROM usuarios WHERE email = $1 AND senha = $2", [email, senha]);
    if (result.rows.length > 0) {
      const usuario = result.rows[0];

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

// Desativar 2FA
router.post('/usuarios/:id/2fa/desativar', async (req, res) => {
  const { id } = req.params;
  await pool.query(`UPDATE usuarios SET two_factor_enabled = FALSE WHERE id = $1`, [id]);
  res.json({ ok: true });
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
  if (!usuario_id || !telefone) return res.status(400).json({ erro: 'Dados obrigatórios' });

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expiracao = new Date(Date.now() + 5 * 60000); // 5 minutos

  try {
    await pool.query(
      `INSERT INTO codigos_verificacao (usuario_id, codigo, telefone, expiracao, tipo, usado)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [usuario_id, codigo, telefone, expiracao, 'senha']
    );
    // Envie o SMS com Twilio aqui
    await enviarSMS(telefone, `Seu código para alterar a senha: ${codigo}`);
    res.json({ ok: true, mensagem: 'Código enviado' });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao enviar código', detalhes: e.message });
  }
});

// Verificar código para alteração de senha
router.post('/verificar-codigo-alterar-senha', async (req, res) => {
  const { usuario_id, codigo } = req.body;
  if (!usuario_id || !codigo) return res.status(400).json({ erro: 'Dados obrigatórios' });

  const result = await pool.query(
    `SELECT * FROM codigos_verificacao
     WHERE usuario_id = $1 AND codigo = $2 AND tipo = $3 AND expiracao > NOW() AND usado = FALSE`,
    [usuario_id, codigo, 'senha']
  );

  if (result.rows.length === 0) {
    return res.json({ success: false });
  }

  await pool.query(
    `UPDATE codigos_verificacao SET usado = TRUE WHERE id = $1`,
    [result.rows[0].id]
  );

  res.json({ success: true });
});

// Alterar senha
router.put('/:id/alterar-senha', async (req, res) => {
  const { id } = req.params;
  const { senha } = req.body;
  if (!senha) return res.status(400).json({ erro: 'Senha obrigatória' });

  try {
    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senha, id]);
    res.json({ ok: true, mensagem: 'Senha alterada com sucesso' });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao alterar senha', detalhes: e.message });
  }
});

module.exports = router;
