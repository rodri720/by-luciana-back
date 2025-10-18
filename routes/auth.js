const express = require('express');
const { register, login, getProfile, updateProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Registro
router.post('/register', register);

// Login
router.post('/login', login);
// Tus rutas de auth aquí


// Perfil (requiere autenticación)
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;