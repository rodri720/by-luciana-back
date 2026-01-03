// routes/products.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productsController = require('../controllers/productsController');

// ✅ CONFIGURAR MULTER
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 🔥 ORDEN CORRECTO: Rutas GET PRIMERO (sin multer)
router.get('/', productsController.getProducts);
router.get('/all', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.get('/sku/:sku', productsController.getProductBySku);
router.get('/category/:category/filtered', productsController.getProductsByCategory);

// 🛠️ Ruta de DEBUG
router.get('/debug/test', (req, res) => {
  res.json({ 
    message: '✅ Ruta products funcionando',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// 🔄 MIDDLEWARE INTELIGENTE: Maneja JSON y FormData
const handleProductUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Si es JSON (con imágenes como URLs)
  if (contentType.includes('application/json')) {
    console.log('📦 Recibiendo JSON con URLs de imágenes');
    express.json({ limit: '50mb' })(req, res, next);
  }
  // Si es FormData (con archivos)
  else if (contentType.includes('multipart/form-data')) {
    console.log('📤 Recibiendo FormData con archivos');
    upload.array('images', 5)(req, res, next);
  }
  // Por defecto JSON
  else {
    express.json({ limit: '50mb' })(req, res, next);
  }
};

// 🖼️ Rutas con middleware inteligente
router.post('/', handleProductUpload, productsController.createProduct);
router.put('/:id', handleProductUpload, productsController.updateProduct);

// 🗑️ Rutas sin archivos
router.delete('/:id', productsController.deleteProduct);

// 🔄 Ruta para eliminar imágenes específicas
router.delete('/:id/images', express.json(), async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Se requiere imageUrl' });
    }
    
    const result = await productsController.removeProductImage(req.params.id, imageUrl);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;