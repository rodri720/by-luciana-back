const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Registro de usuario
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

// Login de usuario
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

// Obtener perfil de usuario
exports.getProfile = async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar perfil de usuario
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