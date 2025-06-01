const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function enviarEmail({ to, subject, text }) {
  const msg = {
    to,
    from: 'ourbook.noreply@gmail.com',
    subject,
    text,
  };

  try {
    await sgMail.send(msg);
    console.log(`E-mail enviado para ${to}`);
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    throw error;
  }
}

module.exports = { enviarEmail }; 