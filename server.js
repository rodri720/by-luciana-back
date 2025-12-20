const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Inicializar app
const app = express();

// Configurar CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🆕 SERVIR ARCHIVOS ESTÁTICOS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Carpeta uploads creada:', uploadsDir);
}

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas');
    console.log(`📊 Base de datos: ${mongoose.connection.db.databaseName}`);
  })
  .catch(err => {
    console.error('❌ Error conectando a MongoDB Atlas:', err.message);
    process.exit(1);
  });

// Middleware de logs para desarrollo
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url}`);
    next();
  });
}

// Importar rutas
console.log('🔍 Configurando rutas...');

// 1. Products
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
}

// 3. Auth
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth route OK');
  app.use('/api/auth', authRoutes);
} catch (error) {
  console.log('❌ Error en auth:', error.message);
}

// 4. Cart
try {
  const cartRoutes = require('./routes/cart');
  console.log('✅ Cart route OK');
  app.use('/api/cart', cartRoutes);
} catch (error) {
  console.log('❌ Error en cart:', error.message);
}

// 5. Newsletter
try {
  const newsletterRoutes = require('./routes/newsletter');
  console.log('✅ Newsletter route OK');
  app.use('/api/newsletter', newsletterRoutes);
} catch (error) {
  console.log('❌ Error en newsletter:', error.message);
}

// 6. 🆕 MERCADO PAGO ROUTES (NUEVO)
try {
  const paymentRoutes = require('./routes/paymentRoutes');
  console.log('✅ MercadoPago routes OK');
  app.use('/api/payments', paymentRoutes);
  console.log(`💰 Webhook configurado en: ${process.env.MP_WEBHOOK_URL}`);
} catch (error) {
  console.error('❌ Error en paymentRoutes:', error.message);
  console.error(error.stack);
  
  // Crear ruta temporal para pagos
  const tempPaymentRouter = express.Router();
  tempPaymentRouter.get('/', (req, res) => res.json({ 
    message: 'Sistema de pagos temporal',
    note: 'Configura las rutas de MercadoPago'
  }));
  app.use('/api/payments', tempPaymentRouter);
}

// 7. 🆕 ORDERS ROUTES
try {
  const orderRoutes = require('./routes/orders');
  console.log('✅ Orders route OK');
  app.use('/api/orders', orderRoutes);
} catch (error) {
  console.log('❌ Error en orders:', error.message);
  // Crear ruta básica para orders si no existe
  const tempOrderRouter = express.Router();
  tempOrderRouter.get('/', (req, res) => res.json({ 
    message: 'Sistema de órdenes temporal',
    note: 'Configura las rutas de órdenes'
  }));
  app.use('/api/orders', tempOrderRouter);
}

// 8. TEST EMAIL ROUTE
app.get('/api/test/email', async (req, res) => {
  try {
    const { sendInvoiceEmail } = require('./utils/emailService');
    
    // Crear una orden de prueba
    const testOrder = {
      _id: 'test_' + Date.now(),
      orderNumber: 'TEST-' + Date.now().toString().slice(-6),
      customer: {
        name: 'Cliente de Prueba',
        email: 'bylualiendo@gmail.com'
      },
      items: [
        {
          name: 'Producto de Prueba',
          price: 1500,
          quantity: 2,
          subtotal: 3000
        }
      ],
      subtotal: 3000,
      shippingCost: 500,
      discount: 0,
      tax: 0,
      total: 3500,
      shipping: {
        method: 'standard',
        address: 'Calle Falsa 123',
        city: 'Buenos Aires'
      },
      createdAt: new Date(),
      calculateTotals: function() { return this.total; }
    };

    // Datos de pago de prueba
    const testPayment = {
      id: 'test_payment_' + Date.now(),
      status: 'approved',
      payment_method_id: 'visa',
      installments: 1,
      transaction_amount: 3500,
      date_approved: new Date().toISOString()
    };

    // Enviar email de prueba
    const result = await sendInvoiceEmail(testOrder, testPayment);
    
    res.json({
      success: true,
      message: '✅ Email de prueba procesado',
      result,
      order: testOrder.orderNumber,
      emailSentTo: testOrder.customer.email,
      checkMailtrap: 'https://mailtrap.io/inboxes'
    });
    
  } catch (error) {
    console.error('Error en prueba de email:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// Ruta principal - ACTUALIZADA con info de pagos
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de By Luciana funcionando!',
    version: '2.0.0',
    features: {
      database: 'MongoDB Atlas Cloud',
      uploads: 'Sistema de imágenes activado',
      payments: 'MercadoPago integrado ✅',
      email: 'Sistema de facturas activo',
      environment: process.env.NODE_ENV,
      mercadoPago: process.env.MP_PRODUCTION_MODE === 'true' ? 'Producción' : 'Sandbox (Pruebas)'
    },
    endpoints: {
      auth: '/api/auth',
      cart: '/api/cart',
      products: '/api/products',
      categories: '/api/categories',
      newsletter: '/api/newsletter',
      payments: '/api/payments',
      orders: '/api/orders'
    },
    paymentEndpoints: {
      createPreference: 'POST /api/payments/create-preference',
      success: 'GET /api/payments/success',
      failure: 'GET /api/payments/failure',
      pending: 'GET /api/payments/pending',
      webhook: 'POST /api/payments/webhook',
      methods: 'GET /api/payments/methods',
      orderStatus: 'GET /api/payments/order/:id'
    },
    storeInfo: {
      name: process.env.STORE_NAME || 'LUTEST',
      email: process.env.STORE_EMAIL,
      whatsapp: process.env.STORE_WHATSAPP
    }
  });
});

// Ruta de salud - ACTUALIZADA
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? '✅ Conectado' : '❌ Desconectado',
      uploads: fs.existsSync(uploadsDir) ? '✅ Disponible' : '❌ No disponible',
      mercadoPago: process.env.MP_ACCESS_TOKEN ? '✅ Configurado' : '❌ No configurado',
      email: process.env.EMAIL_USER ? '✅ Configurado' : '❌ No configurado',
      ngrok: process.env.NGROK_URL ? '✅ Activo' : '❌ Inactivo'
    },
    environment: process.env.NODE_ENV,
    mercadoPagoMode: process.env.MP_PRODUCTION_MODE === 'true' ? 'Producción' : 'Sandbox'
  });
});

// Ruta para verificar configuración de MercadoPago
app.get('/api/config/mp', (req, res) => {
  // No exponer el access token completo por seguridad
  const maskedToken = process.env.MP_ACCESS_TOKEN ? 
    process.env.MP_ACCESS_TOKEN.substring(0, 10) + '...' : 
    'No configurado';
  
  res.json({
    mercadoPago: {
      configured: !!process.env.MP_ACCESS_TOKEN,
      tokenPreview: maskedToken,
      publicKey: process.env.MP_PUBLIC_KEY ? '✅ Configurado' : '❌ No configurado',
      mode: process.env.MP_PRODUCTION_MODE === 'true' ? 'Producción' : 'Sandbox',
      webhookUrl: process.env.MP_WEBHOOK_URL,
      paymentMethods: {
        creditCards: process.env.MP_ENABLE_CREDIT_CARDS === 'true',
        debitCards: process.env.MP_ENABLE_DEBIT_CARDS === 'true',
        pagoFacil: process.env.MP_ENABLE_PAGOFACIL === 'true',
        westernUnion: process.env.MP_ENABLE_WESTERN_UNION === 'true',
        rapipago: process.env.MP_ENABLE_RAPIPAGO === 'true',
        transfer: process.env.MP_ENABLE_TRANSFER === 'true'
      }
    },
    store: {
      name: process.env.STORE_NAME,
      email: process.env.STORE_EMAIL
    }
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

  try {
    const testFile = path.join(uploadsDir, 'test.txt');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    uploadsStatus.writable = true;
  } catch (error) {
    uploadsStatus.writable = false;
    uploadsStatus.error = error.message;
  }

  try {
    uploadsStatus.files = fs.readdirSync(uploadsDir);
  } catch (error) {
    uploadsStatus.filesError = error.message;
  }

  res.json(uploadsStatus);
});

// Ruta de prueba para MercadoPago
app.get('/api/test/mp', (req, res) => {
  res.json({
    message: 'MercadoPago Test Endpoint',
    instructions: 'Use POST /api/payments/create-preference para crear un pago',
    testData: {
      items: [
        { name: 'Producto Test', price: 100, quantity: 1 }
      ],
      customer: {
        name: 'Cliente Test',
        email: 'test@example.com'
      }
    }
  });
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
      'GET /api/config/mp',
      'GET /api/test/mp',
      'GET /api/uploads/status',
      'POST /api/payments/create-preference',
      'GET /api/payments/success',
      'GET /api/payments/methods',
      'GET /api/products',
      'GET /api/categories'
    ]
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('🔴 Error Global:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(error.status || 500).json({ 
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal. Por favor, intente nuevamente.',
    requestId: req.headers['x-request-id'] || Date.now()
  });
});

// Configurar puerto
const PORT = process.env.PORT || 5000;

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║    🚀 BY LUCIANA E-COMMERCE API                      ║
║    Versión: 2.0.0 (Con MercadoPago)                  ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║    ✅ Servidor corriendo en: http://localhost:${PORT}   ║
║    📁 Uploads: ${uploadsDir}                           ║
║    💳 MercadoPago: ${process.env.MP_PRODUCTION_MODE === 'true' ? 'PRODUCCIÓN' : 'SANDBOX (Pruebas)'} ║
║    📧 Email: ${process.env.EMAIL_USER ? 'Configurado' : 'No configurado'} ║
║    🌐 Ngrok: ${process.env.NGROK_URL || 'No configurado'} ║
║                                                       ║
║    🔗 Verificar: http://localhost:${PORT}/api/health    ║
║    💰 MP Config: http://localhost:${PORT}/api/config/mp ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
  
  // Verificar configuraciones críticas
  if (!process.env.MP_ACCESS_TOKEN) {
    console.warn('⚠️  ADVERTENCIA: MP_ACCESS_TOKEN no configurado en .env');
  }
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  ADVERTENCIA: Credenciales de email no configuradas');
  }
  
  if (process.env.NGROK_URL) {
    console.log(`🔗 Webhook URL: ${process.env.MP_WEBHOOK_URL}`);
    console.log(`📞 Ngrok activo: ${process.env.NGROK_URL}`);
  }
});

// Manejo de cierre elegante
process.on('SIGINT', () => {
  console.log('\n👋 Apagando servidor...');
  server.close(() => {
    console.log('✅ Servidor apagado correctamente');
    process.exit(0);
  });
});

module.exports = app;