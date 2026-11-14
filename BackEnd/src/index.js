import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('<h1>¡Hola Mundo desde Node.js y Express!</h1>');
});

app.get('/api/saludo', (req, res) => {
  res.json({
    message: '¡Hola Mundo desde la API de Node.js!',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Servidor Node.js corriendo exitosamente en http://localhost:${PORT}`);
});
