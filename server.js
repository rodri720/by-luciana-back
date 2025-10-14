const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.log('❌ Error conectando a MongoDB Atlas:', err.message);
    process.exit(1);
  });

// Importar rutas
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const authRoutes = require('./routes/auth');
const cartRoutes = require('./routes/cart'); // Nueva ruta del carrito

// Usar rutas
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes); // Agregar esta línea DESPUÉS de definir app

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de By Luciana con Carrito!',
    database: 'MongoDB Atlas Cloud',
    endpoints: {
      auth: '/api/auth',
      cart: '/api/cart',
      products: '/api/products',
      categories: '/api/categories'
    }
  });
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    authentication: 'JWT Configurado',
    cart: 'Sistema de carrito activo',
    timestamp: new Date().toISOString()
  });
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎯 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔐 Autenticación JWT configurada`);
  console.log(`🛒 Sistema de carrito activo`);
});