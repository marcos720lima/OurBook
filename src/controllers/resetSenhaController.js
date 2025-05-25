const sgMail = require('@sendgrid/mail');
const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

// Configuração do SendGrid (reutilizando a configuração do suporteController)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'ourbook.noreply@gmail.com';

// URL do site de reset de senha no Render
const RESET_SITE_URL = 'https://reset-senha-ourbook.onrender.com';

// Função para gerar um token aleatório
const gerarToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const resetSenhaController = {
  // Solicitar reset de senha
  async solicitarReset(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ erro: 'Email é obrigatório' });
      }
      
      // Verificar se o usuário existe
      const { rows } = await db.query('SELECT id, nome, usuario FROM usuarios WHERE email = $1', [email]);
      
      if (rows.length === 0) {
        // Por segurança, não informamos que o email não existe
        return res.status(200).json({ 
          mensagem: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.' 
        });
      }
      
      const usuario = rows[0];
      
      // Gerar token e definir expiração (24 horas)
      const token = gerarToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Remover tokens antigos deste usuário
      await db.query('DELETE FROM reset_tokens WHERE usuario_id = $1', [usuario.id]);
      
      // Salvar o novo token
      await db.query(
        'INSERT INTO reset_tokens (usuario_id, token, expires_at) VALUES ($1, $2, $3)',
        [usuario.id, token, expiresAt]
      );
      
      // Construir o link de reset para o site externo
      const resetLink = `${RESET_SITE_URL}?token=${token}`;
      
      // Configurar o email
      const mailOptions = {
        from: EMAIL_FROM,
        to: email,
        subject: 'Redefinição de senha - Our Book',
        text: `
Olá ${usuario.nome},

Recebemos uma solicitação para redefinir sua senha no Our Book.

Para redefinir sua senha, clique no link abaixo ou copie e cole no seu navegador:
${resetLink}

Este link expira em 24 horas.

Se você não solicitou esta redefinição, por favor ignore este email.

Atenciosamente,
Equipe Our Book
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
  <h2 style="color: #55828B;">Redefinição de Senha</h2>
  
  <p>Olá ${usuario.nome},</p>
  
  <p>Recebemos uma solicitação para redefinir sua senha no Our Book.</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="${resetLink}" style="background-color: #3B6064; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
      Redefinir Minha Senha
    </a>
  </div>
  
  <p>Ou copie e cole o link abaixo no seu navegador:</p>
  <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all;">
    ${resetLink}
  </p>
  
  <p><strong>Este link expira em 24 horas.</strong></p>
  
  <p>Se você não solicitou esta redefinição, por favor ignore este email.</p>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
    <p>Atenciosamente,<br>Equipe Our Book</p>
  </div>
</div>
        `
      };
      
      // Enviar email
      if (!process.env.SENDGRID_API_KEY || process.env.NODE_ENV === 'development') {
        console.log('Email de reset simulado:', mailOptions);
      } else {
        try {
          await sgMail.send(mailOptions);
          console.log('Email de reset enviado para:', email);
        } catch (error) {
          console.error('Erro ao enviar email de reset:', error);
          if (error.response) {
            console.error('Resposta de erro do SendGrid:', error.response.body);
          }
          
          // Não retornamos erro para o cliente por segurança
        }
      }
      
      // Retornar sucesso (mesmo se o email falhar, por segurança)
      return res.status(200).json({ 
        mensagem: 'Se o email estiver cadastrado, você receberá as instruções para redefinir sua senha.' 
      });
      
    } catch (error) {
      console.error('Erro ao solicitar reset de senha:', error);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  },
  
  // Verificar token de reset
  async verificarToken(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ erro: 'Token é obrigatório' });
      }
      
      // Verificar se o token existe e não expirou
      const { rows } = await db.query(
        'SELECT rt.id, rt.usuario_id, u.nome, u.email FROM reset_tokens rt ' +
        'JOIN usuarios u ON rt.usuario_id = u.id ' +
        'WHERE rt.token = $1 AND rt.expires_at > NOW()',
        [token]
      );
      
      if (rows.length === 0) {
        return res.status(400).json({ erro: 'Token inválido ou expirado' });
      }
      
      // Retornar informações básicas do usuário (sem dados sensíveis)
      return res.status(200).json({ 
        valido: true,
        usuario: {
          id: rows[0].usuario_id,
          nome: rows[0].nome,
          email: rows[0].email
        }
      });
      
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  },
  
  // Redefinir senha com token
  async redefinirSenha(req, res) {
    try {
      const { token } = req.params;
      const { novaSenha } = req.body;
      
      if (!token || !novaSenha) {
        return res.status(400).json({ erro: 'Token e nova senha são obrigatórios' });
      }
      
      // Verificar se o token existe e não expirou
      const { rows } = await db.query(
        'SELECT rt.id, rt.usuario_id FROM reset_tokens rt ' +
        'WHERE rt.token = $1 AND rt.expires_at > NOW()',
        [token]
      );
      
      if (rows.length === 0) {
        return res.status(400).json({ erro: 'Token inválido ou expirado' });
      }
      
      const tokenId = rows[0].id;
      const usuarioId = rows[0].usuario_id;
      
      // Hash da nova senha
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(novaSenha, saltRounds);
      
      // Atualizar a senha do usuário
      await db.query(
        'UPDATE usuarios SET senha = $1, atualizado_em = NOW() WHERE id = $2',
        [hashedPassword, usuarioId]
      );
      
      // Remover o token usado
      await db.query('DELETE FROM reset_tokens WHERE id = $1', [tokenId]);
      
      return res.status(200).json({ 
        mensagem: 'Senha redefinida com sucesso' 
      });
      
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
  }
};

module.exports = resetSenhaController;
