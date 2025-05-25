const sgMail = require('@sendgrid/mail');
const db = require('../config/db');

if (process.env.SENDGRID_API_KEY) {
  console.log('Configurando SendGrid com API key:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY não configurada. O envio de emails não funcionará.');
}

const EMAIL_FROM = process.env.EMAIL_FROM; 
const EMAIL_TO = process.env.EMAIL_TO;

console.log('Emails configurados - FROM:', EMAIL_FROM, 'TO:', EMAIL_TO);

const suporteController = {
  async enviarMensagem(req, res) {
    try {
      const { assunto, mensagem, usuario_id } = req.body;
      
      if (!assunto || !mensagem) {
        return res.status(400).json({ erro: 'Assunto e mensagem são obrigatórios' });
      }
      
      const { rows } = await db.query('SELECT nome, email, usuario FROM usuarios WHERE id = $1', [usuario_id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Usuário não encontrado' });
      }
      
      const usuario = rows[0];
      
      const mensagemResult = await db.query(
        `INSERT INTO mensagens_suporte (usuario_id, assunto, mensagem, status, criada_em)
         VALUES ($1, $2, $3, 'pendente', NOW())
         RETURNING id`,
        [usuario_id, assunto, mensagem]
      );
      
      const mensagemId = mensagemResult.rows[0].id;
      
      const mailOptions = {
        from: EMAIL_FROM,
        to: EMAIL_TO,
        subject: `[Suporte #${mensagemId}] ${assunto}`,
        text: `
Nova mensagem de suporte:

ID: ${mensagemId}
Assunto: ${assunto}
Usuário: ${usuario.nome} (${usuario.usuario})
Email: ${usuario.email}
Data: ${new Date().toLocaleString('pt-BR')}

Mensagem:
${mensagem}
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
  <h2 style="color: #55828B;">Nova mensagem de suporte</h2>
  <p><strong>ID:</strong> ${mensagemId}</p>
  <p><strong>Assunto:</strong> ${assunto}</p>
  <p><strong>Usuário:</strong> ${usuario.nome} (${usuario.usuario})</p>
  <p><strong>Email:</strong> ${usuario.email}</p>
  <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  
  <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
    <h3 style="margin-top: 0; color: #3B6064;">Mensagem:</h3>
    <p style="white-space: pre-line;">${mensagem}</p>
  </div>
  
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #777;">
    <p>Este é um email automático do sistema de suporte do Our Book. Por favor, não responda diretamente a este email.</p>
  </div>
</div>
        `
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Email simulado:', mailOptions);
        
        await db.query(
          'UPDATE mensagens_suporte SET status = $1 WHERE id = $2',
          ['enviada', mensagemId]
        );
        
        return res.status(200).json({ 
          mensagem: 'Mensagem registrada com sucesso', 
          id: mensagemId 
        });
      }
      
      try {
        console.log('Tentando enviar email com SendGrid...');
        
        if (!process.env.SENDGRID_API_KEY) {
          console.log('SendGrid não configurado. Simulando envio de email:', mailOptions);
          
          await db.query(
            'UPDATE mensagens_suporte SET status = $1 WHERE id = $2',
            ['enviada', mensagemId]
          );
          
          return res.status(200).json({ 
            mensagem: 'Mensagem registrada com sucesso (email simulado)', 
            id: mensagemId 
          });
        }
        
        console.log('Enviando email via SendGrid para:', mailOptions.to);
        const info = await sgMail.send(mailOptions);
        console.log('Email enviado com sucesso! Resposta:', JSON.stringify(info).substring(0, 100) + '...');
        
        await db.query(
          'UPDATE mensagens_suporte SET status = $1, email_info = $2 WHERE id = $3',
          ['enviada', JSON.stringify(info), mensagemId]
        );
        
        res.status(200).json({ 
          mensagem: 'Mensagem enviada com sucesso', 
          id: mensagemId 
        });
      } catch (error) {
        console.error('Erro ao enviar email:', error);
        console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
        if (error.response) {
          console.error('Resposta de erro do SendGrid:', error.response.body);
        }
        
        await db.query(
          'UPDATE mensagens_suporte SET status = $1, erro = $2 WHERE id = $3',
          ['erro', error.message || JSON.stringify(error), mensagemId]
        );
        
        return res.status(500).json({ 
          erro: 'Erro ao enviar mensagem', 
          detalhes: error.message || 'Erro desconhecido no envio de email' 
        });
      }
      
    } catch (error) {
      console.error('Erro no suporte:', error);
      res.status(500).json({ 
        erro: 'Erro ao processar mensagem de suporte', 
        detalhes: error.message 
      });
    }
  },
  
  async listarMensagens(req, res) {
    try {
      const { usuario_id } = req.params;
      
      const { rows } = await db.query(
        `SELECT id, assunto, mensagem, status, criada_em, atualizada_em
         FROM mensagens_suporte
         WHERE usuario_id = $1
         ORDER BY criada_em DESC`,
        [usuario_id]
      );
      
      res.json(rows);
    } catch (error) {
      console.error('Erro ao listar mensagens de suporte:', error);
      res.status(500).json({ 
        erro: 'Erro ao listar mensagens', 
        detalhes: error.message 
      });
    }
  },
  
  async obterMensagem(req, res) {
    try {
      const { id } = req.params;
      
      const { rows } = await db.query(
        `SELECT m.*, u.nome, u.email, u.usuario
         FROM mensagens_suporte m
         JOIN usuarios u ON m.usuario_id = u.id
         WHERE m.id = $1`,
        [id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ erro: 'Mensagem não encontrada' });
      }
      
      res.json(rows[0]);
    } catch (error) {
      console.error('Erro ao obter mensagem de suporte:', error);
      res.status(500).json({ 
        erro: 'Erro ao obter mensagem', 
        detalhes: error.message 
      });
    }
  }
};

module.exports = suporteController;
