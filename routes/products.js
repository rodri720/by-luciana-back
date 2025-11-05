// routes/products.js - VERSIÓN CORREGIDA Y FUNCIONAL
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

// 🛠️ Ruta de DEBUG para verificar que las rutas funcionan
router.get('/debug/test', (req, res) => {
  res.json({ 
    message: '✅ Ruta products funcionando',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// 🖼️ Rutas con multer DESPUÉS de las GET
router.post('/', 
  upload.array('images', 5),
  productsController.createProduct
);

router.put('/:id', 
  upload.array('images', 5),
  productsController.updateProduct
);

// 🗑️ Rutas sin archivos
router.delete('/:id', productsController.deleteProduct);

module.exports = router;