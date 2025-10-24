const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Inicializar app PRIMERO
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🆕 SERVIR ARCHIVOS ESTÁTICOS (IMPORTANTE para las imágenes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Carpeta uploads creada:', uploadsDir);
}

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => {
    console.log('❌ Error conectando a MongoDB Atlas:', err.message);
    process.exit(1);
  });

// Importar y verificar rutas una por una
console.log('🔍 Verificando rutas...');

// 1. Products (con upload de imágenes)
try {
  const productRoutes = require('./routes/products');
  console.log('✅ Products route OK - con upload de imágenes');
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

// 5. Newsletter
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

// Ruta principal - ACTUALIZADA con info de uploads
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de By Luciana funcionando!',
    database: 'MongoDB Atlas Cloud',
    uploads: 'Sistema de imágenes activado',
    endpoints: {
      auth: '/api/auth',
      cart: '/api/cart',
      products: '/api/products',
      categories: '/api/categories',
      newsletter: '/api/newsletter'
    },
    imageUploads: {
      multiple: 'POST /api/products (con campo "images")',
      single: 'POST /api/products/:id/image',
      delete: 'DELETE /api/products/:id/image',
      setMain: 'PATCH /api/products/:id/image/main'
    }
  });
});

// Ruta de salud - ACTUALIZADA
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    uploads: fs.existsSync(uploadsDir) ? 'Disponible' : 'No disponible',
    timestamp: new Date().toISOString()
  });
});

// Ruta para verificar el sistema de uploads
app.get('/api/uploads/status', (req, res) => {
  const uploadsStatus = {
    directory: uploadsDir,
    exists: fs.existsSync(uploadsDir),
    writable: false,
    files: []
  };

  // Verificar permisos de escritura
  try {
    const testFile = path.join(uploadsDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    uploadsStatus.writable = true;
  } catch (error) {
    uploadsStatus.writable = false;
    uploadsStatus.error = error.message;
  }

  // Listar archivos en uploads
  try {
    uploadsStatus.files = fs.readdirSync(uploadsDir);
  } catch (error) {
    uploadsStatus.filesError = error.message;
  }

  res.json(uploadsStatus);
});

// Manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/uploads/status',
      'GET /api/products',
      'POST /api/products',
      'POST /api/products/:id/image',
      'GET /api/categories',
      'POST /api/auth/login',
      'POST /api/newsletter/subscribe'
    ]
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
    uploadsPath: process.env.NODE_ENV === 'development' ? uploadsDir : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎯 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Sistema de uploads activo en: ${uploadsDir}`);
  console.log(`🌐 Acceso a imágenes: http://localhost:${PORT}/uploads/nombre-imagen.jpg`);
  console.log(`🔍 Verificar status: http://localhost:${PORT}/api/uploads/status`);
});