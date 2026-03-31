const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/database');

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'API de Facturación funcionando ✅' });
});

// Rutas
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenant');
const customerRoutes = require('./routes/customers');
const productRoutes = require('./routes/products');

app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 3000;

const start = async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
};

start();