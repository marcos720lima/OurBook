const express = require("express");
const cors = require("cors");
const usuariosRoutes = require("./routes/usuarios");
const livrosRoutes = require("./routes/livrosRoutes");
const solicitacoesRoutes = require('./routes/solicitacoes');

const app = express();

const allowedOrigins = [
  'http://localhost:8081', // desenvolvimento web local
  'https://ourbook-j73l.onrender.com', // backend render
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

module.exports = app;
