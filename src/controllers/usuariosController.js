const { enviarEmail } = require('../utils/email');

// Função para enviar aviso de novo login por e-mail
async function enviarAvisoNovoLogin(email, device, so, ip, localizacao) {
  const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const mensagem = `
    Olá,
    
    Um novo login foi detectado na sua conta OurBook:
    - Data e hora: ${dataHora}
    - Dispositivo: ${device}
    - Sistema operacional: ${so}
    - IP: ${ip}
    - Localização: ${localizacao}

    Se não foi você, recomendamos alterar sua senha imediatamente.
  `;

  try {
    await enviarEmail({
      to: email,
      subject: 'Novo login detectado na sua conta OurBook',
      text: mensagem
    });
    console.log(`Aviso de novo login enviado para ${email}`);
  } catch (error) {
    console.error('Erro ao enviar aviso de novo login:', error);
  }
}

// Endpoint de login
async function login(req, res) {
  const { email, senha, device, so, ip, localizacao } = req.body;

  try {
    // Autenticar usuário (exemplo simplificado)
    const usuario = await autenticarUsuario(email, senha);
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Enviar aviso de novo login por e-mail
    await enviarAvisoNovoLogin(email, device, so, ip, localizacao);

    // Retornar dados do usuário e token
    res.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      },
      token: gerarToken(usuario)
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 