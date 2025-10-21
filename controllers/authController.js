// authController.js - VERSIÓN CORRECTA
const mongoose = require('mongoose'); // ← SOLO UNA VEZ
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

// Cliente de Google Auth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ... el resto de tu código SIN otra importación de mongoose ...



const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Registro de usuario (ya lo tienes - mantener)
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe.' });
    }

    // Crear nuevo usuario
    const user = new User({
      name,
      email,
      password,
      phone
    });

    await user.save();

    // Generar token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Usuario registrado exitosamente.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Login de usuario (ya lo tienes - mantener)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Verificar password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Credenciales inválidas.' });
    }

    // Generar token
    const token = generateToken(user._id);

    res.json({
      message: 'Login exitoso.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// NUEVO: Login con Google
exports.googleAuth = async (req, res) => {
  try {
    const { token: googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ error: 'Token de Google es requerido.' });
    }

    // Verificar token de Google
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Buscar usuario existente
    let user = await User.findOne({ email });

    if (!user) {
      // Crear nuevo usuario si no existe
      user = new User({
        name,
        email,
        avatar: picture,
        authProvider: 'google',
        isVerified: true // Los emails de Google están verificados
      });

      // Generar una contraseña aleatoria para usuarios de Google
      const randomPassword = Math.random().toString(36).slice(-8);
      user.password = randomPassword; // Se hashea automáticamente por el pre-save

      await user.save();
    }

    // Generar nuestro JWT token
    const token = generateToken(user._id);

    res.json({
      message: 'Login con Google exitoso.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en Google Auth:', error);
    res.status(400).json({ error: 'Error en autenticación con Google.' });
  }
};

// NUEVO: Olvidé mi contraseña - Solicitar reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({ 
        message: 'Si el email existe, se enviarán instrucciones para resetear la contraseña.' 
      });
    }

    // Generar token de reset (válido por 1 hora)
    const resetToken = jwt.sign(
      { id: user._id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Enviar email con el link de reset
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await sendResetEmail(user.email, resetLink);

    // Por ahora, solo devolver el token (en producción quitar esto)
    res.json({
      message: 'Instrucciones enviadas al email.',
      resetToken // ⚠️ En producción, quitar esta línea y usar email real
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// NUEVO: Resetear contraseña
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Token inválido.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).json({ error: 'Usuario no encontrado.' });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ error: 'El token ha expirado.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Token inválido.' });
    }
    res.status(400).json({ error: error.message });
  }
};

// NUEVO: Logout (opcional - generalmente se maneja en frontend)
exports.logout = async (req, res) => {
  try {
    // En un sistema más avanzado, podrías invalidar el token
    // Por ahora, solo respuesta exitosa
    res.json({ message: 'Logout exitoso.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Obtener perfil de usuario (ya lo tienes - mantener)
exports.getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar perfil de usuario (ya lo tienes - mantener)
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    
    // No permitir actualizar ciertos campos
    delete updates.password;
    delete updates.role;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Perfil actualizado exitosamente.',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};