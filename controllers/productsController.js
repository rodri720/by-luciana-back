// controllers/productsController.js - VERSIÓN COMPLETA CORREGIDA
const Product = require('../models/Product');
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
const getProducts = async (req, res) => {
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

const getProductById = async (req, res) => {
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

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({ active: true })
      .sort({ createdAt: -1 })
      .select('name price category images sku stock featured sizes colors');
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟡 FUNCIÓN CREATE PRODUCT CORREGIDA - SOLUCIÓN AL PROBLEMA DE IMÁGENES
const createProduct = async (req, res) => {
  try {
    console.log('🔄 createProduct llamado en backend');
    console.log('📝 Headers:', req.headers['content-type']);
    console.log('📦 req.body:', req.body);
    
    // ✅ CRÍTICO: SIEMPRE PROCESAR req.body.images PRIMERO
    let images = [];
    
    // 1. ¿Hay imágenes en req.body.images? (JSON desde frontend)
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      console.log('✅ Usando imágenes enviadas desde frontend (JSON)');
      console.log('📸 Imágenes recibidas en req.body.images:', req.body.images);
      images = req.body.images;
    }
    // 2. ¿Hay archivos en req.files? (FormData con multer)
    else if (req.files && req.files.length > 0) {
      console.log('✅ Usando archivos subidos con multer');
      images = req.files.map(file => `/uploads/${file.filename}`);
    }
    // 3. ¿No hay imágenes?
    else {
      console.log('⚠️ No se recibieron imágenes');
      // Para nuevo producto, puedes decidir si requerir imágenes o no
      images = [];
    }
    
    console.log('🎨 Colores recibidos:', req.body.colors);
    console.log('📏 Talles recibidos:', req.body.sizes);
    console.log('🏷️ Tags recibidos:', req.body.tags);
    console.log('🔍 Tipo de req.body:', typeof req.body);
    console.log('🖼️ req.files:', req.files);
    console.log('📊 Número de files:', req.files ? req.files.length : 0);
    console.log('📸 Imágenes finales a guardar:', images);

    // 🎯 VALIDACIONES BÁSICAS
    if (!req.body.name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    if (!req.body.description) {
      return res.status(400).json({ error: 'La descripción es requerida' });
    }
    
    if (!req.body.price) {
      return res.status(400).json({ error: 'El precio es requerido' });
    }
    
    if (!req.body.sku) {
      return res.status(400).json({ error: 'El SKU es requerido' });
    }

    // 🔄 Procesar arrays
    let colors = [];
    let sizes = [];
    let tags = [];
    
    // Procesar colores
    if (req.body.colors) {
      if (typeof req.body.colors === 'string') {
        colors = req.body.colors.split(',').map(c => c.trim()).filter(c => c);
      } else if (Array.isArray(req.body.colors)) {
        colors = req.body.colors;
      }
    }
    
    // Procesar talles
    if (req.body.sizes) {
      if (typeof req.body.sizes === 'string') {
        sizes = req.body.sizes.split(',').map(s => s.trim()).filter(s => s);
      } else if (Array.isArray(req.body.sizes)) {
        sizes = req.body.sizes;
      }
    }
    
    // Procesar tags
    if (req.body.tags) {
      if (typeof req.body.tags === 'string') {
        tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(req.body.tags)) {
        tags = req.body.tags;
      }
    }

    console.log('🎨 Colores procesados:', colors);
    console.log('📏 Talles procesados:', sizes);
    console.log('🏷️ Tags procesados:', tags);

    // 📦 Datos finales para crear producto
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: parseFloat(req.body.price),
      comparePrice: req.body.comparePrice ? parseFloat(req.body.comparePrice) : null,
      sku: req.body.sku,
      category: req.body.category,
      stock: parseInt(req.body.stock) || 0,
      featured: req.body.featured === true || req.body.featured === 'true',
      colors: colors,
      sizes: sizes,
      tags: tags,
      images: images, // ✅ ESTO ES LO CRÍTICO - LAS IMÁGENES DEBEN ESTAR AQUÍ
      active: true
    };

    console.log('📦 Datos finales para crear producto:', productData);

    // 💾 Crear producto
    const product = await Product.create(productData);
    
    console.log('✅ Producto guardado en BD:', product._id);
    console.log('📊 Producto completo:', product);
    
    res.status(201).json(product);
    
  } catch (error) {
    console.error('❌ Error en createProduct:', error);
    
    // Manejar error de SKU duplicado
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({ 
        error: 'SKU duplicado. El código ya existe.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno: ' + error.message 
    });
  }
};

// 🟡 UPDATE PRODUCT - Versión completa corregida
const updateProduct = async (req, res) => {
  try {
    console.log('🔄 updateProduct llamado en backend');
    console.log('📝 Datos recibidos:', req.body);
    
    const updateData = { ...req.body };

    // ✅ PROCESAR IMÁGENES - MISMO FLUJO QUE CREATE
    let imagesToAdd = [];
    
    // 1. ¿Hay imágenes en req.body.images?
    if (req.body.images && Array.isArray(req.body.images) && req.body.images.length > 0) {
      console.log('✅ Imágenes en update (JSON):', req.body.images);
      // Si viene 'replaceImages' = true, reemplazar todas
      if (req.body.replaceImages === 'true') {
        updateData.images = req.body.images;
      } else {
        // Agregar a las existentes
        const currentProduct = await Product.findById(req.params.id);
        const currentImages = currentProduct ? currentProduct.images : [];
        updateData.images = [...currentImages, ...req.body.images];
      }
    }
    // 2. ¿Hay archivos en req.files?
    else if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      console.log('✅ Archivos nuevos subidos:', newImages);
      
      if (req.body.replaceImages === 'true') {
        updateData.images = newImages;
      } else {
        const currentProduct = await Product.findById(req.params.id);
        const currentImages = currentProduct ? currentProduct.images : [];
        updateData.images = [...currentImages, ...newImages];
      }
    }

    // 🔄 Procesar arrays
    if (updateData.colors !== undefined) {
      let colors = [];
      if (typeof updateData.colors === 'string') {
        colors = updateData.colors.split(',').map(c => c.trim()).filter(c => c);
      } else if (Array.isArray(updateData.colors)) {
        colors = updateData.colors;
      }
      updateData.colors = colors;
    }
    
    if (updateData.sizes !== undefined) {
      let sizes = [];
      if (typeof updateData.sizes === 'string') {
        sizes = updateData.sizes.split(',').map(s => s.trim()).filter(s => s);
      } else if (Array.isArray(updateData.sizes)) {
        sizes = updateData.sizes;
      }
      updateData.sizes = sizes;
    }
    
    if (updateData.tags !== undefined) {
      let tags = [];
      if (typeof updateData.tags === 'string') {
        tags = updateData.tags.split(',').map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(updateData.tags)) {
        tags = updateData.tags;
      }
      updateData.tags = tags;
    }

    console.log('🎨 Colores procesados para update:', updateData.colors);
    console.log('📏 Talles procesados para update:', updateData.sizes);
    console.log('🏷️ Tags procesados para update:', updateData.tags);

    // 💰 Convertir tipos numéricos
    if (updateData.price !== undefined) updateData.price = parseFloat(updateData.price);
    if (updateData.comparePrice !== undefined) {
      updateData.comparePrice = updateData.comparePrice ? parseFloat(updateData.comparePrice) : null;
    }
    if (updateData.stock !== undefined) updateData.stock = parseInt(updateData.stock);
    
    // ✅ Convertir booleanos
    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === true || updateData.featured === 'true';
    }
    
    if (updateData.active !== undefined) {
      updateData.active = updateData.active !== 'false' && updateData.active !== false;
    }

    console.log('📊 Datos finales para update:', updateData);

    // Filtrar campos undefined
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    console.log('✅ Producto actualizado:', product._id);
    res.json(product);
  } catch (error) {
    console.error('❌ Error en updateProduct:', error);
    
    // Manejar error de SKU duplicado
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({ 
        error: 'SKU duplicado. El código ya existe.' 
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
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
const uploadProductImage = async (req, res) => {
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
const deleteProductImage = async (req, res) => {
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
const setMainImage = async (req, res) => {
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

// 🆕 NUEVA FUNCIÓN: Buscar productos por SKU
const getProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    
    const product = await Product.findOne({ sku, active: true });
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🆕 NUEVA FUNCIÓN: Obtener productos por categoría con filtros
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { colors, sizes, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    
    let filter = { 
      category,
      active: true 
    };
    
    // Filtro por colores
    if (colors) {
      const colorsArray = colors.split(',').map(c => c.trim());
      filter.colors = { $in: colorsArray };
    }
    
    // Filtro por talles
    if (sizes) {
      const sizesArray = sizes.split(',').map(s => s.trim());
      filter.sizes = { $in: sizesArray };
    }
    
    // Filtro por rango de precios
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    const products = await Product.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(filter);
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      filters: {
        availableColors: await Product.distinct('colors', { category, active: true }),
        availableSizes: await Product.distinct('sizes', { category, active: true }),
        priceRange: {
          min: await Product.findOne({ category, active: true }).sort({ price: 1 }).select('price'),
          max: await Product.findOne({ category, active: true }).sort({ price: -1 }).select('price')
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🆕 FUNCIÓN AUXILIAR: Eliminar imagen específica (para uso interno)
const removeProductImage = async (productId, imageUrl) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Producto no encontrado');
  }

  if (product.images && product.images.length > 0) {
    product.images = product.images.filter(img => img !== imageUrl);
    await product.save();
  }

  return { 
    message: 'Imagen eliminada correctamente',
    images: product.images 
  };
};

// 🟡 EXPORTAR TODAS LAS FUNCIONES
module.exports = {
  getProducts,
  getProductById,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  setMainImage,
  getProductBySku,
  getProductsByCategory,
  removeProductImage // ✅ AGREGADA
};