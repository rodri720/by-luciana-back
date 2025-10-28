// routes/products.js - VERSIÓN CORREGIDA
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productsController = require('../controllers/productsController');

// ✅ CONFIGURAR MULTER DIRECTAMENTE EN LAS RUTAS
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// ✅ CONFIGURACIÓN SIMPLIFICADA DE MULTER
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
  // ❌ NO USAR fileFilter por ahora para debugging
});

// ✅ RUTAS CON MULTER
router.post('/', 
  upload.array('images', 5), // ✅ Esto procesa tanto archivos como campos
  productsController.createProduct
);

router.put('/:id', 
  upload.array('images', 5),
  productsController.updateProduct
);

// Las otras rutas...
router.get('/', productsController.getProducts);
router.get('/all', productsController.getAllProducts);
router.get('/:id', productsController.getProductById);
router.delete('/:id', productsController.deleteProduct);

module.exports = router;