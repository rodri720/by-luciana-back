const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Inicializar app PRIMERO
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

// Importar y verificar rutas una por una
console.log('🔍 Verificando rutas...');

// 1. Products (este sabemos que funciona)
try {
  const productRoutes = require('./routes/products');
  console.log('✅ Products route OK');
  app.use('/api/products', productRoutes);
} catch (error) {
  console.log('❌ Error en products:', error.message);
}

// 2. Categories
try {
  const categoryRoutes = require('./routes/categories');
  console.log('✅ Categories route OK');
  app.use('/api/categories', categoryRoutes);
} catch (error) {
  console.log('❌ Error en categories:', error.message);
  console.log('💡 Creando ruta temporal para categories...');
  const tempRouter = express.Router();
  tempRouter.get('/', (req, res) => res.json({ message: 'Categories temporal' }));
  app.use('/api/categories', tempRouter);
}

// 3. Auth
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth route OK');
  app.use('/api/auth', authRoutes);
} catch (error) {
  console.log('❌ Error en auth:', error.message);
  console.log('💡 Creando ruta temporal para auth...');
  const tempRouter = express.Router();
  tempRouter.post('/login', (req, res) => res.json({ message: 'Login temporal' }));
  app.use('/api/auth', tempRouter);
}

// 4. Cart
try {
  const cartRoutes = require('./routes/cart');
  console.log('✅ Cart route OK');
  app.use('/api/cart', cartRoutes);
} catch (error) {
  console.log('❌ Error en cart:', error.message);
  console.log('💡 Creando ruta temporal para cart...');
  const tempRouter = express.Router();
  tempRouter.get('/', (req, res) => res.json({ message: 'Cart temporal' }));
  app.use('/api/cart', tempRouter);
}

// 5. Newsletter - AGREGAR DESPUÉS DE app = express()
try {
  const newsletterRoutes = require('./routes/newsletter');
  console.log('✅ Newsletter route OK');
  app.use('/api/newsletter', newsletterRoutes);
} catch (error) {
  console.log('❌ Error en newsletter:', error.message);
  console.log('💡 Creando ruta temporal para newsletter...');
  const tempRouter = express.Router();
  tempRouter.post('/subscribe', (req, res) => res.json({ message: 'Newsletter temporal' }));
  app.use('/api/newsletter', tempRouter);
}

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de By Luciana funcionando!',
    database: 'MongoDB Atlas Cloud',
    endpoints: {
      auth: '/api/auth',
      cart: '/api/cart',
      products: '/api/products',
      categories: '/api/categories',
      newsletter: '/api/newsletter'
    }
  });
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
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
});