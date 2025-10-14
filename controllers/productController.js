const Product = require('../models/Product');

// Obtener todos los productos con paginación
exports.getProducts = async (req, res) => {
  try {
    const { category, featured, page = 1, limit = 12 } = req.query;
    
    let filter = { active: true };
    
    if (category) filter.category = category;
    if (featured) filter.featured = featured === 'true';
    
    const products = await Product.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los productos (sin paginación)
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ active: true })
      .sort({ createdAt: -1 })
      .select('name price category images sku stock featured sizes colors');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear nuevo producto
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    
    // Generar SKU automático si no se proporciona
    if (!product.sku) {
      const count = await Product.countDocuments();
      product.sku = `BL${String(count + 1).padStart(4, '0')}`;
    }
    
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar producto (soft delete)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};