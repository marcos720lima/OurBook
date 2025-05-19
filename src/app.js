const express = require("express");
const cors = require("cors");
const usuariosRoutes = require("./routes/usuarios");
const livrosRoutes = require("./routes/livrosRoutes");
const solicitacoesRoutes = require('./routes/solicitacoes');

const app = express();

app.use(cors());
app.use(express.json());

// Rota raiz
app.get("/", (req, res) => {
  res.json({ message: "API Our-Book está funcionando!" });
});

app.use("/usuarios", usuariosRoutes);
app.use("/livros", livrosRoutes);
app.use('/solicitacoes', solicitacoesRoutes);

module.exports = app;
