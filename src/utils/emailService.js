const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ourbook.noreply@gmail.com',
    pass: 'pvwx wsnt euvr rltz', // Use senha de app, não sua senha normal!
  },
});

async function sendResetEmail(to, token) {
  const resetLink = `https://reset-password-page-ten.vercel.app/?token=${token}`; // Troque pelo seu domínio real!
  const mailOptions = {
    from: 'ourbook.noreply@gmail.com',
    to,
    subject: 'Redefinição de senha - Our Book',
    html: `
      <p>Você solicitou a redefinição de senha.</p>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Se não foi você, ignore este e-mail.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendResetEmail };
