const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER; // Ex: '+5511999999999'

const client = twilio(accountSid, authToken);

async function enviarSMS(telefone, mensagem) {
  // O número deve estar no formato internacional, ex: +5511999999999
  try {
    await client.messages.create({
      body: mensagem,
      from: fromNumber,
      to: telefone
    });
    console.log(`SMS enviado para ${telefone}`);
  } catch (error) {
    console.error('Erro ao enviar SMS:', error);
    throw error;
  }
}

module.exports = { enviarSMS }; 