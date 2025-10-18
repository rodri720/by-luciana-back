const express = require('express');
const {
  getProducts,
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productsController'); // ✅ productsController (sin la "s" final)

const router = express.Router();

// GET /api/products - Obtener productos con paginación
router.get('/', getProducts);

// GET /api/products/all - Obtener todos los productos (sin paginación)
router.get('/all', getAllProducts);

// GET /api/products/:id - Obtener producto por ID
router.get('/:id', getProductById);

// POST /api/products - Crear nuevo producto
router.post('/', createProduct);

// PUT /api/products/:id - Actualizar producto
router.put('/:id', updateProduct);

// DELETE /api/products/:id - Eliminar producto
router.delete('/:id', deleteProduct);

module.exports = router;