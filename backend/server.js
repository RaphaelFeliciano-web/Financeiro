const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Importa o módulo 'path' do Node.js

// Supondo que seu arquivo de rotas esteja em ./routes/api.js
const transactionRoutes = require('./routes/api.js');

// Inicializa a aplicação Express
const app = express();
const PORT = process.env.PORT || 3000; // A porta DENTRO do contêiner

// Middlewares
app.use(cors()); // Habilita CORS para permitir requisições do frontend
app.use(express.json()); // Permite que o Express entenda JSON no corpo das requisições

// --- Servir Arquivos Estáticos ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Conexão com o Banco de Dados ---
// Esta é a correção principal.
// Dentro do Docker, usamos o nome do serviço 'mongo' como hostname, não 'localhost'.
const mongoURI = process.env.MONGO_URI || 'mongodb://mongo:27017/financeiro';

mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB conectado com sucesso!'))
  .catch(err => {
    console.error('ERRO DE CONEXÃO COM MONGODB:', err);
    // Em caso de falha na conexão, o processo é encerrado para que o Docker possa reiniciá-lo.
    process.exit(1);
  });

// Rotas da API
app.use('/api/transactions', transactionRoutes);

// Rota raiz para verificar se a API está no ar
app.get('/', (req, res) => {
    res.send('API do Gerenciador Financeiro está no ar!');
});

// Rota catch-all para servir o index.html para qualquer requisição que não seja de API
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});