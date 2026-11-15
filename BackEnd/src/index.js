import express from 'express';
import cors from 'cors';
import mapaRoutes from './routes/mapaRoutes.js';
import {
  CAPAS_MARTE,
  PUNTOS_MARTE
} from './constants/marsConstants.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Ruta principal de bienvenida
app.get('/', (req, res) => {
  res.send('<h1>Servidor de Control y Cartografia Marciana - API Activa</h1>');
});

// Endpoint de verificacion de salud
app.get('/api/saludo', (req, res) => {
  res.json({
    message: 'Servidor de telemetria y cartografia marciana operativo',
    status: 'success',
    timestamp: new Date().toISOString()
  });
});

// Rutas de mapa y navegacion
app.use('/api/mapa', mapaRoutes);

// Rutas directas retrocompatibles
app.get('/api/puntos', (req, res) => {
  res.json({ puntos: PUNTOS_MARTE });
});

app.get('/api/capas', (req, res) => {
  res.json({ capas: CAPAS_MARTE });
});

app.listen(PORT, () => {
  console.log(`Servidor Node.js corriendo exitosamente en http://localhost:${PORT}`);
});
