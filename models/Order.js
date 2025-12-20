const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  // Información del cliente
  customer: {
    name: {
      type: String,
      required: [true, 'El nombre del cliente es requerido']
    },
    email: {
      type: String,
      required: [true, 'El email del cliente es requerido'],
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un email válido']
    },
    phone: String,
    address: String,
    dni: String
  },

  // Información de los productos
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: [0, 'El precio no puede ser negativo']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La cantidad debe ser al menos 1']
    },
    image: String,
    size: String,
    color: String,
    subtotal: {
      type: Number,
      required: true
    }
  }],

  // Información de envío
  shipping: {
    method: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard'
    },
    cost: {
      type: Number,
      default: 0,
      min: [0, 'El costo de envío no puede ser negativo']
    },
    address: String,
    city: String,
    province: String,
    postalCode: String,
    trackingNumber: String
  },

  // Información de pago
  payment: {
    method: {
      type: String,
      enum: ['mercadopago', 'transferencia', 'efectivo', 'western_union', 'pagofacil', 'rapipago'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in_process', 'cancelled', 'refunded'],
      default: 'pending'
    },
    mercadoPagoId: String,
    mercadoPagoStatus: String,
    mercadoPagoStatusDetail: String,
    transactionId: String,
    paymentDate: Date,
    paymentMethod: String,
    paymentType: String,
    installments: Number,
    totalPaidAmount: Number,
    currency: {
      type: String,
      default: 'ARS'
    }
  },

  // Totales
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'El subtotal no puede ser negativo']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'El descuento no puede ser negativo']
  },
  shippingCost: {
    type: Number,
    required: true,
    min: [0, 'El costo de envío no puede ser negativo']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'El impuesto no puede ser negativo']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'El total no puede ser negativo']
  },

  // Información de la orden
  orderNumber: {
    type: String,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: [
      'pending',       // Orden creada, esperando pago
      'paid',          // Pago confirmado
      'processing',    // Preparando pedido
      'shipped',       // Enviado
      'delivered',     // Entregado
      'cancelled',     // Cancelado
      'refunded'       // Reembolsado
    ],
    default: 'pending'
  },
  notes: String,
  internalNotes: String,

  // Referencias externas
  mercadoPagoPreferenceId: String,
  mercadoPagoExternalReference: String,

  // Fechas importantes
  estimatedDeliveryDate: Date,
  deliveredDate: Date,
  cancelledDate: Date,

  // Metadatos
  ipAddress: String,
  userAgent: String,
  source: {
    type: String,
    enum: ['web', 'mobile', 'whatsapp', 'instagram'],
    default: 'web'
  },

  // Auditoría
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: { expires: '72h' } // Las órdenes expiran después de 72 horas si no se pagan
  }
}, {
  timestamps: true, // Esto creará automáticamente createdAt y updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware para actualizar updatedAt
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para establecer fecha de expiración si no está pagada
OrderSchema.pre('save', function(next) {
  if (this.isNew && this.payment.status === 'pending') {
    const expiryHours = parseInt(process.env.ORDER_EXPIRY_HOURS) || 72;
    this.expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  }
  next();
});

// Generar número de orden único
OrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Contar órdenes del día
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const count = await mongoose.model('Order').countDocuments({
      createdAt: { $gte: startOfDay }
    });
    
    const sequential = (count + 1).toString().padStart(4, '0');
    this.orderNumber = `ORD-${year}${month}${day}-${sequential}`;
  }
  next();
});

// Método para calcular totales
OrderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  this.total = this.subtotal - this.discount + this.shippingCost + this.tax;
  return this.total;
};

// Método para actualizar estado
OrderSchema.methods.updateStatus = function(newStatus) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Registrar fechas específicas
  if (newStatus === 'delivered') {
    this.deliveredDate = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledDate = new Date();
  }
  
  return { oldStatus, newStatus };
};

// Método para marcar como pagada
OrderSchema.methods.markAsPaid = function(paymentData) {
  this.payment.status = 'approved';
  this.payment.paymentDate = new Date();
  this.status = 'paid';
  
  if (paymentData) {
    this.payment.mercadoPagoId = paymentData.id;
    this.payment.mercadoPagoStatus = paymentData.status;
    this.payment.mercadoPagoStatusDetail = paymentData.status_detail;
    this.payment.paymentMethod = paymentData.payment_method_id;
    this.payment.paymentType = paymentData.payment_type_id;
    this.payment.installments = paymentData.installments;
    this.payment.totalPaidAmount = paymentData.transaction_amount;
  }
};

// Virtual para obtener cantidad total de items
OrderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual para obtener dirección completa
OrderSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.shipping.address,
    this.shipping.city,
    this.shipping.province,
    this.shipping.postalCode
  ].filter(part => part && part.trim() !== '');
  
  return parts.join(', ');
});

// Índices para mejor rendimiento
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'payment.mercadoPagoId': 1 });
OrderSchema.index({ 'payment.transactionId': 1 });

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;