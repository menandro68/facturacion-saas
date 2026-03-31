require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/db');
const createTables = require('./config/database');
const authRoutes = require('./routes/auth');

const app = express();

// Seguridad
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Rutas
app.use('/auth', authRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Facturación funcionando ✅' });
});

// Ruta de prueba de base de datos
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as fecha');
    res.json({ 
      mensaje: 'Base de datos conectada ✅', 
      fecha: result.rows[0].fecha 
    });
  } catch (error) {
    res.status(500).json({ 
      mensaje: 'Error de conexión ❌', 
      error: error.message 
    });
  }
});

// Crear tablas al iniciar
createTables();

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});