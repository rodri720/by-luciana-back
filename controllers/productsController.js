const Product = require('../models/Product');
const upload = require('../middleware/upload');
const multer = require('multer');
const path = require('path');

// Configuración de multer para upload individual (compatible con tu middleware existente)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const singleUpload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)'));
    }
  }
}).single('image');

// 🟡 TUS FUNCIONES EXISTENTES (se mantienen igual)
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

exports.createProduct = async (req, res) => {
  try {
    upload.array('images', 5)(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: 'Error al subir imágenes: ' + err.message });
      }

      try {
        const productData = { ...req.body };
        
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

exports.updateProduct = async (req, res) => {
  try {
    upload.array('images', 5)(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: 'Error al subir imágenes: ' + err.message });
      }

      try {
        const updateData = { ...req.body };

        if (req.files && req.files.length > 0) {
          const newImages = req.files.map(file => `/uploads/${file.filename}`);
          
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

// 🆕 NUEVAS FUNCIONES PARA UPLOAD INDIVIDUAL
exports.uploadProductImage = async (req, res) => {
  try {
    singleUpload(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ error: 'Error al subir imagen: ' + err.message });
      }

      // Verificar que se subió un archivo
      if (!req.file) {
        return res.status(400).json({ error: 'No se seleccionó ninguna imagen' });
      }

      try {
        const product = await Product.findById(req.params.id);
        if (!product) {
          return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // Agregar la nueva imagen al array de imágenes
        const newImage = `/uploads/${req.file.filename}`;
        if (!product.images) {
          product.images = [newImage];
        } else {
          product.images.push(newImage);
        }
        
        await product.save();

        res.json({ 
          message: 'Imagen subida correctamente',
          imageUrl: newImage,
          images: product.images // Devolver todas las imágenes
        });
      } catch (error) {
        res.status(500).json({ error: 'Error al guardar la imagen: ' + error.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🆕 ELIMINAR IMAGEN ESPECÍFICA
exports.deleteProductImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL de imagen no proporcionada' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Filtrar la imagen a eliminar
    if (product.images && product.images.length > 0) {
      product.images = product.images.filter(img => img !== imageUrl);
      await product.save();
    }

    res.json({ 
      message: 'Imagen eliminada correctamente',
      images: product.images
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🆕 ESTABLECER IMAGEN PRINCIPAL
exports.setMainImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL de imagen no proporcionada' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Verificar que la imagen existe en el array
    if (!product.images || !product.images.includes(imageUrl)) {
      return res.status(400).json({ error: 'La imagen no existe en el producto' });
    }

    // Mover la imagen principal al inicio del array
    product.images = product.images.filter(img => img !== imageUrl);
    product.images.unshift(imageUrl);
    
    await product.save();

    res.json({ 
      message: 'Imagen principal establecida correctamente',
      images: product.images
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};