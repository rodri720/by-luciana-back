const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

/**
 * @route   GET /api/orders
 * @desc    Obtener todas las órdenes (con filtros opcionales)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { status, email, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    
    if (status) filter.status = status;
    if (email) filter['customer.email'] = email;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Order.countDocuments(filter);
    
    res.json({ 
      success: true, 
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
});

/**
 * @route   GET /api/orders/:id
 * @desc    Obtener una orden específica
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la orden' });
  }
});

/**
 * @route   GET /api/orders/customer/:email
 * @desc    Obtener órdenes de un cliente específico
 * @access  Public
 */
router.get('/customer/:email', async (req, res) => {
  try {
    const orders = await Order.find({ 'customer.email': req.params.email })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error getting customer orders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes del cliente' });
  }
});

/**
 * @route   GET /api/orders/number/:orderNumber
 * @desc    Obtener orden por número de orden
 * @access  Public
 */
router.get('/number/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error getting order by number:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la orden' });
  }
});

/**
 * @route   PUT /api/orders/:id/status
 * @desc    Actualizar estado de una orden
 * @access  Private (para admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}` 
      });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }
    
    order.status = status;
    order.updatedAt = new Date();
    
    if (notes) {
      order.internalNotes = notes;
    }
    
    await order.save();
    
    res.json({ 
      success: true, 
      message: 'Estado actualizado correctamente',
      order 
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estado' });
  }
});

/**
 * @route   GET /api/orders/stats/summary
 * @desc    Obtener estadísticas de órdenes
 * @access  Public
 */
router.get('/stats/summary', async (req, res) => {
  try {
    // Estadísticas básicas
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const paidOrders = await Order.countDocuments({ status: 'paid' });
    const completedOrders = await Order.countDocuments({ 
      status: { $in: ['delivered', 'shipped'] } 
    });
    
    // Total de ventas
    const salesResult = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'delivered', 'shipped'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    const totalSales = salesResult[0]?.total || 0;
    
    // Ventas por método de pago
    const paymentMethods = await Order.aggregate([
      { $group: { 
        _id: '$payment.method', 
        count: { $sum: 1 },
        total: { $sum: '$total' }
      }},
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        paidOrders,
        completedOrders,
        totalSales: parseFloat(totalSales.toFixed(2)),
        paymentMethods
      },
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

module.exports = router;