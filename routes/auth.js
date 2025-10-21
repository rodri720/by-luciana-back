const express = require('express');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile,
  googleAuth,
  forgotPassword,
  resetPassword,
  logout 
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Registro
router.post('/register', register);

// Login
router.post('/login', login);

// Login con Google
router.post('/google', googleAuth);

// Recuperación de contraseña
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Logout
router.post('/logout', auth, logout);

// Perfil (requiere autenticación)
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;