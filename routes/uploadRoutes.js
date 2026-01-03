// routes/uploadRoutes.js - COMMONJS VERSION
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Crear carpeta de uploads si no existe
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📂 Carpeta uploads creada en:', uploadDir);
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueName + ext);
  }
});

// Filtrar solo imágenes
const fileFilter = function (req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, WebP, GIF)'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

// ✅ Ruta para subir múltiples imágenes
router.post('/upload-images', upload.array('images', 10), (req, res) => {
  try {
    console.log('📤 Recibiendo solicitud de upload...');
    
    if (!req.files || req.files.length === 0) {
      console.log('❌ No se recibieron archivos');
      return res.status(400).json({ 
        success: false, 
        error: 'No se subieron imágenes' 
      });
    }

    console.log(`✅ Procesando ${req.files.length} archivos`);
    
    // Construir URLs de las imágenes
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    
    console.log('✅ URLs generadas:', imageUrls);
    
    res.status(200).json({
      success: true,
      message: `Se subieron ${imageUrls.length} imágenes correctamente`,
      imageUrls: imageUrls,
      count: imageUrls.length
    });
    
  } catch (error) {
    console.error('❌ Error subiendo imágenes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error subiendo imágenes: ' + error.message 
    });
  }
});

// ✅ Ruta para subir una sola imagen
router.post('/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se subió ninguna imagen' 
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    console.log('✅ Imagen subida:', imageUrl);
    
    res.status(200).json({
      success: true,
      message: 'Imagen subida correctamente',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error subiendo imagen: ' + error.message 
    });
  }
});

// Ruta de prueba GET
router.get('/test', (req, res) => {
  res.json({ 
    message: '✅ Módulo de uploads funcionando',
    endpoints: {
      uploadMultiple: 'POST /api/uploads/upload-images',
      uploadSingle: 'POST /api/uploads/image',
      status: 'GET /api/uploads/status'
    }
  });
});

module.exports = router;