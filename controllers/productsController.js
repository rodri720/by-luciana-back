const Product = require('../models/Product');
const upload = require('../middleware/upload');

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

// Crear nuevo producto CON SUBIDA DE IMÁGENES
exports.createProduct = async (req, res) => {
  try {
    // Usar multer para manejar la subida de archivos
    upload.array('images', 5)(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: 'Error al subir imágenes: ' + err.message });
      }

      try {
        const productData = { ...req.body };
        
        // Procesar imágenes si se subieron
        if (req.files && req.files.length > 0) {
          productData.images = req.files.map(file => `/uploads/${file.filename}`);
        }

        // Procesar arrays si vienen como strings
        if (productData.sizes && typeof productData.sizes === 'string') {
          productData.sizes = productData.sizes.split(',').map(s => s.trim()).filter(s => s);
        }
        if (productData.colors && typeof productData.colors === 'string') {
          productData.colors = productData.colors.split(',').map(c => c.trim()).filter(c => c);
        }
        if (productData.tags && typeof productData.tags === 'string') {
          productData.tags = productData.tags.split(',').map(t => t.trim()).filter(t => t);
        }

        // Convertir tipos numéricos
        if (productData.price) productData.price = parseFloat(productData.price);
        if (productData.comparePrice) productData.comparePrice = parseFloat(productData.comparePrice);
        if (productData.stock) productData.stock = parseInt(productData.stock);
        
        // Convertir booleanos
        if (productData.featured) productData.featured = productData.featured === 'true';
        if (productData.active) productData.active = productData.active !== 'false';

        const product = new Product(productData);
        
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
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar producto CON SUBIDA DE IMÁGENES
exports.updateProduct = async (req, res) => {
  try {
    // Usar multer para manejar la subida de archivos
    upload.array('images', 5)(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: 'Error al subir imágenes: ' + err.message });
      }

      try {
        const updateData = { ...req.body };

        // Procesar nuevas imágenes si se subieron
        if (req.files && req.files.length > 0) {
          const newImages = req.files.map(file => `/uploads/${file.filename}`);
          
          // Si se quiere reemplazar todas las imágenes, usar solo las nuevas
          // Si se quiere agregar a las existentes, obtener el producto actual primero
          if (updateData.replaceImages === 'true') {
            updateData.images = newImages;
          } else {
            const currentProduct = await Product.findById(req.params.id);
            if (currentProduct && currentProduct.images) {
              updateData.images = [...currentProduct.images, ...newImages];
            } else {
              updateData.images = newImages;
            }
          }
        }

        // Procesar arrays si vienen como strings
        if (updateData.sizes && typeof updateData.sizes === 'string') {
          updateData.sizes = updateData.sizes.split(',').map(s => s.trim()).filter(s => s);
        }
        if (updateData.colors && typeof updateData.colors === 'string') {
          updateData.colors = updateData.colors.split(',').map(c => c.trim()).filter(c => c);
        }
        if (updateData.tags && typeof updateData.tags === 'string') {
          updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(t => t);
        }

        // Convertir tipos numéricos
        if (updateData.price) updateData.price = parseFloat(updateData.price);
        if (updateData.comparePrice) updateData.comparePrice = parseFloat(updateData.comparePrice);
        if (updateData.stock) updateData.stock = parseInt(updateData.stock);
        
        // Convertir booleanos
        if (updateData.featured) updateData.featured = updateData.featured === 'true';
        if (updateData.active) updateData.active = updateData.active !== 'false';

        const product = await Product.findByIdAndUpdate(
          req.params.id,
          updateData,
          { new: true, runValidators: true }
        );
        
        if (!product) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(product);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar producto (soft delete) - SIN CAMBIOS
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