const express = require("express");
const cors = require("cors");
const usuariosRoutes = require("./routes/usuarios");
const livrosRoutes = require("./routes/livrosRoutes");
const solicitacoesRoutes = require('./routes/solicitacoes');
const segurancaRoutes = require('./routes/segurancaRoutes');
const suporteRoutes = require('./routes/suporte');
const resetSenhaRoutes = require('./routes/resetSenhaRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:8081', // desenvolvimento web local
  'https://ourbook-j73l.onrender.com', // backend render
  'https://reset-senha-ourbook.onrender.com', // site de reset de senha
  'http://localhost:3000', // desenvolvimento local do site de reset
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.get("/", (req, res) => {
  res.json({ message: "API Our-Book está funcionando!" });
});

app.use("/usuarios", usuariosRoutes);
app.use("/livros", livrosRoutes);
app.use('/solicitacoes', solicitacoesRoutes);
app.use('/seguranca', segurancaRoutes);
app.use('/suporte', suporteRoutes);
app.use('/reset-senha', resetSenhaRoutes);

module.exports = app;
