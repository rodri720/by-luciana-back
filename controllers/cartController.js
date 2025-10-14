const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Obtener carrito del usuario
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name price images stock');
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Agregar item al carrito
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;
    
    // Verificar que el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }
    
    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && 
              item.size === size && 
              item.color === color
    );
    
    if (existingItemIndex > -1) {
      // Actualizar cantidad si ya existe
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Agregar nuevo item
      cart.items.push({
        product: productId,
        quantity,
        size,
        color
      });
    }
    
    await cart.save();
    await cart.populate('items.product', 'name price images stock');
    
    res.json({
      message: 'Producto agregado al carrito',
      cart
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Actualizar cantidad de item
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ error: 'La cantidad debe ser al menos 1' });
    }
    
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    
    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado en el carrito' });
    }
    
    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product', 'name price images stock');
    
    res.json({
      message: 'Carrito actualizado',
      cart
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Eliminar item del carrito
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();
    await cart.populate('items.product', 'name price images stock');
    
    res.json({
      message: 'Producto eliminado del carrito',
      cart
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Vaciar carrito
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json({
      message: 'Carrito vaciado',
      cart
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};