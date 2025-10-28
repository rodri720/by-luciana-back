const Product = require('../models/Product');
const upload = require('../middleware/upload');
const multer = require('multer');
const path = require('path');

// Configuración de multer para upload individual
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

// 🟡 FUNCIONES EXISTENTES
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

// 🟡 FUNCIÓN CREATE PRODUCT CORREGIDA - VERSIÓN DEFINITIVA
// En productsController.js - createProduct
exports.createProduct = async (req, res) => {
  try {
    console.log('🔄 createProduct llamado en backend');
    console.log('📝 Headers:', req.headers['content-type']);
    
    // 🔍 DEBUG EXTENDIDO
    console.log('📦 req.body:', req.body);
    console.log('🔍 Tipo de req.body:', typeof req.body);
    console.log('🖼️ req.files:', req.files);
    console.log('📊 Número de files:', req.files ? req.files.length : 0);
    
    // ✅ VERIFICACIÓN TEMPORAL - SIEMPRE CONTINUAR
    if (!req.body) {
      console.log('⚠️ req.body está undefined, creando objeto vacío');
      req.body = {};
    }

    const productData = { ...req.body };
    
    console.log('🔍 Datos del producto después de verificación:', productData);

    // 🖼️ Procesar imágenes si hay archivos
    if (req.files && req.files.length > 0) {
      console.log('✅ Procesando', req.files.length, 'imágenes...');
      productData.images = req.files.map(file => `/uploads/${file.filename}`);
      console.log('🖼️ URLs de imágenes generadas:', productData.images);
    } else {
      console.log('⚠️ No se recibieron archivos de imagen');
      productData.images = [];
    }

    // 🎯 VALIDACIONES BÁSICAS
    if (!productData.name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    if (!productData.description) {
      return res.status(400).json({ error: 'La descripción es requerida' });
    }
    
    if (!productData.price) {
      return res.status(400).json({ error: 'El precio es requerido' });
    }

    console.log('📦 Datos finales para crear producto:', productData);

    // 💾 Crear producto (simplificado para testing)
    const product = new Product({
      name: productData.name,
      description: productData.description,
      price: parseFloat(productData.price),
      category: productData.category || 'general',
      stock: parseInt(productData.stock) || 0,
      featured: productData.featured === 'true',
      images: productData.images,
      active: true
    });
    
    await product.save();
    console.log('✅ Producto guardado en BD:', product._id);
    
    res.status(201).json(product);
    
  } catch (error) {
    console.error('❌ Error en createProduct:', error);
    res.status(500).json({ 
      error: 'Error interno: ' + error.message 
    });
  }
};
// 🟡 UPDATE PRODUCT (versión simplificada)
exports.updateProduct = async (req, res) => {
  try {
    console.log('🔄 updateProduct llamado en backend');
    
    // ✅ Verificación crítica
    if (!req.body) {
      return res.status(400).json({ error: 'Datos del producto no recibidos' });
    }

    const updateData = { ...req.body };

    // 🖼️ Procesar nuevas imágenes si hay archivos
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

    // 🔄 Procesar arrays si vienen como strings
    if (updateData.sizes && typeof updateData.sizes === 'string') {
      updateData.sizes = updateData.sizes.split(',').map(s => s.trim()).filter(s => s);
    }
    if (updateData.colors && typeof updateData.colors === 'string') {
      updateData.colors = updateData.colors.split(',').map(c => c.trim()).filter(c => c);
    }
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(t => t);
    }

    // 💰 Convertir tipos numéricos
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.comparePrice) updateData.comparePrice = parseFloat(updateData.comparePrice);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    
    // ✅ Convertir booleanos
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
    console.error('❌ Error en updateProduct:', error);
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

// 🆕 FUNCIONES PARA UPLOAD INDIVIDUAL
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
          images: product.images
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