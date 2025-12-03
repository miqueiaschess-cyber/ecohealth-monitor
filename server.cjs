const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();

// LE OS CERTIFICADOS
const options = {
  key: fs.readFileSync("./key.pem"),
  cert: fs.readFileSync("./cert.pem"),
};

// SERVE A PASTA DIST
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

// INICIA HTTPS
https.createServer(options, app).listen(443, () => {
  console.log("Servidor HTTPS rodando em https://seu-ip");
});
