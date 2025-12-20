const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const Order = require('../models/Order');
const { sendInvoiceEmail } = require('../utils/emailService');

// Configurar cliente de MercadoPago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const payment = new Payment(client);
const preference = new Preference(client);

/**
 * @route   POST /api/payments/create-preference
 * @desc    Crear preferencia de pago en MercadoPago
 * @access  Public
 */
router.post('/create-preference', async (req, res) => {
  try {
    const { 
      items, 
      customer, 
      shipping, 
      discount = 0,
      metadata = {} 
    } = req.body;

    console.log('📥 Datos recibidos para crear preferencia:');
    console.log('Items:', items);
    console.log('Customer:', customer);

    // Validar datos requeridos
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Debe proporcionar al menos un producto' 
      });
    }

    if (!customer || !customer.email || !customer.name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Información del cliente incompleta' 
      });
    }

    // 🔧 VALIDAR Y LIMPIAR ITEMS - CRÍTICO
    const validItems = items.map((item, index) => {
      // Validar que item tenga nombre y precio
      const price = Number(item.price);
      const quantity = Number(item.quantity) || 1;
      const name = item.name || `Producto ${index + 1}`;
      
      if (isNaN(price) || price <= 0) {
        console.warn(`⚠️ Item ${index} tiene precio inválido:`, item);
        return {
          ...item,
          name: name,
          price: 1000, // Precio de fallback
          quantity: quantity
        };
      }
      
      return {
        ...item,
        name: name,
        price: price,
        quantity: quantity
      };
    }).filter(item => item.price > 0 && item.quantity > 0);

    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay productos válidos en el carrito'
      });
    }

    // Calcular totales con items validados
    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = shipping?.cost || 0;
    const total = subtotal - discount + shippingCost;

    console.log('💰 Totales calculados:', { subtotal, shippingCost, total });

    // Validar monto mínimo
    const minimumAmount = parseFloat(process.env.MINIMUM_ORDER_AMOUNT) || 100;
    if (total < minimumAmount) {
      return res.status(400).json({
        success: false,
        message: `El monto mínimo de compra es $${minimumAmount}`
      });
    }

    // Crear orden en la base de datos con items validados
    const order = new Order({
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || '',
        dni: customer.dni || ''
      },
      items: validItems.map(item => ({
        name: item.name,
        description: item.description || '',
        price: item.price,
        quantity: item.quantity,
        image: item.image || '',
        size: item.size || '',
        color: item.color || '',
        subtotal: item.price * item.quantity
      })),
      shipping: {
        method: shipping?.method || 'standard',
        cost: shippingCost,
        address: shipping?.address || '',
        city: shipping?.city || '',
        province: shipping?.province || '',
        postalCode: shipping?.postalCode || ''
      },
      payment: {
        method: 'mercadopago',
        status: 'pending',
        currency: 'ARS'
      },
      subtotal,
      discount,
      shippingCost,
      total,
      status: 'pending',
      notes: customer.notes || '',
      metadata,
      source: metadata.source || 'web'
    });

    // Calcular totales
    order.calculateTotals();
    await order.save();

    console.log(`✅ Orden creada: ${order.orderNumber}`);

    // ✅ CORREGIDO: CONFIGURACIÓN SIMPLIFICADA SIN auto_return
    const preferenceData = {
      items: validItems.map(item => ({
        title: item.name || 'Producto',
        unit_price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        currency_id: 'ARS'
      })),
      payer: {
        email: customer.email,
        name: customer.name
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payment/success`,
        failure: `${process.env.FRONTEND_URL}/payment/failure`,
        pending: `${process.env.FRONTEND_URL}/payment/pending`
      },
      // 🚫 NO INCLUIR auto_return (esta es la clave)
      external_reference: order._id.toString(),
      statement_descriptor: process.env.STORE_NAME || 'LUTEST'
    };

    console.log('📤 Enviando a MercadoPago:', JSON.stringify(preferenceData, null, 2));

    // Crear preferencia en MercadoPago
    const mpResponse = await preference.create({ body: preferenceData });

    console.log('✅ Respuesta de MercadoPago:', {
      id: mpResponse.id,
      init_point: mpResponse.init_point,
      sandbox_init_point: mpResponse.sandbox_init_point
    });

    // Actualizar orden con ID de preferencia
    order.mercadoPagoPreferenceId = mpResponse.id;
    order.mercadoPagoExternalReference = order._id.toString();
    await order.save();

    // Responder al cliente
    res.json({
      success: true,
      preferenceId: mpResponse.id,
      initPoint: mpResponse.init_point,
      sandboxInitPoint: mpResponse.sandbox_init_point,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error creating payment preference:', error);
    
    // Error específico de MercadoPago
    if (error.response && error.response.data) {
      console.error('❌ MercadoPago error details:', error.response.data);
      
      // Manejar error de auto_return
      if (error.response.data.error === 'invalid_auto_return') {
        return res.status(400).json({
          success: false,
          message: 'Error de configuración: auto_return inválido. Contacta al administrador.',
          details: error.response.data
        });
      }
      
      if (error.response.data.cause) {
        return res.status(400).json({
          success: false,
          message: `Error de MercadoPago: ${error.response.data.cause[0]?.description || error.response.data.message}`,
          details: error.response.data
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear la preferencia de pago',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/payments/success
 * @desc    Redirección exitosa desde MercadoPago
 * @access  Public
 */
router.get('/success', async (req, res) => {
  try {
    const { payment_id, external_reference, status } = req.query;
    
    if (!payment_id) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=payment_id_missing`);
    }

    // Obtener detalles del pago de MercadoPago
    const paymentDetails = await payment.get({ id: payment_id });
    
    // Buscar la orden
    const order = await Order.findById(external_reference);
    
    if (!order) {
      return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=order_not_found`);
    }

    // Actualizar orden con información de pago
    order.payment.markAsPaid(paymentDetails);
    order.status = 'paid';
    await order.save();

    // Enviar email de confirmación si está configurado
    if (process.env.EMAIL_SEND_INVOICE === 'true') {
      try {
        await sendInvoiceEmail(order, paymentDetails);
      } catch (emailError) {
        console.error('Error sending invoice email:', emailError);
        // No fallar la transacción por error en email
      }
    }

    // Redirigir al frontend con datos de éxito
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/payment/success`);
    redirectUrl.searchParams.set('orderId', order._id.toString());
    redirectUrl.searchParams.set('orderNumber', order.orderNumber);
    redirectUrl.searchParams.set('paymentId', payment_id);
    redirectUrl.searchParams.set('status', paymentDetails.status);
    
    res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error('Error in success callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=server_error`);
  }
});

/**
 * @route   GET /api/payments/failure
 * @desc    Redirección de fallo desde MercadoPago
 * @access  Public
 */
router.get('/failure', async (req, res) => {
  const { payment_id, external_reference } = req.query;
  
  if (external_reference) {
    try {
      const order = await Order.findById(external_reference);
      if (order) {
        order.payment.status = 'rejected';
        order.status = 'cancelled';
        await order.save();
      }
    } catch (error) {
      console.error('Error updating order status on failure:', error);
    }
  }
  
  const redirectUrl = new URL(`${process.env.FRONTEND_URL}/payment/failure`);
  if (payment_id) redirectUrl.searchParams.set('paymentId', payment_id);
  if (external_reference) redirectUrl.searchParams.set('orderId', external_reference);
  
  res.redirect(redirectUrl.toString());
});

/**
 * @route   GET /api/payments/pending
 * @desc    Redirección de pago pendiente desde MercadoPago
 * @access  Public
 */
router.get('/pending', async (req, res) => {
  const { payment_id, external_reference } = req.query;
  
  if (external_reference) {
    try {
      const order = await Order.findById(external_reference);
      if (order) {
        order.payment.status = 'in_process';
        await order.save();
      }
    } catch (error) {
      console.error('Error updating order status on pending:', error);
    }
  }
  
  const redirectUrl = new URL(`${process.env.FRONTEND_URL}/payment/pending`);
  if (payment_id) redirectUrl.searchParams.set('paymentId', payment_id);
  if (external_reference) redirectUrl.searchParams.set('orderId', external_reference);
  
  res.redirect(redirectUrl.toString());
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Webhook para notificaciones de MercadoPago
 * @access  Public (MercadoPago llamará a esta URL)
 */
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obtener detalles del pago de MercadoPago
      const paymentDetails = await payment.get({ id: paymentId });
      
      // Buscar orden por external_reference
      const externalRef = paymentDetails.external_reference;
      const order = await Order.findById(externalRef);
      
      if (!order) {
        console.error(`Order not found for external_reference: ${externalRef}`);
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      
      // Solo procesar si el estado cambió
      if (order.payment.mercadoPagoStatus !== paymentDetails.status) {
        
        // Actualizar orden con información del pago
        order.payment.mercadoPagoId = paymentId;
        order.payment.mercadoPagoStatus = paymentDetails.status;
        order.payment.mercadoPagoStatusDetail = paymentDetails.status_detail;
        order.payment.paymentMethod = paymentDetails.payment_method_id;
        order.payment.paymentType = paymentDetails.payment_type_id;
        order.payment.installments = paymentDetails.installments;
        order.payment.totalPaidAmount = paymentDetails.transaction_amount;
        order.payment.paymentDate = new Date();
        
        // Actualizar estado de la orden según estado de pago
        switch (paymentDetails.status) {
          case 'approved':
            order.payment.status = 'approved';
            order.status = 'paid';
            
            // Enviar email de factura
            if (process.env.EMAIL_SEND_INVOICE === 'true') {
              await sendInvoiceEmail(order, paymentDetails);
            }
            
            if (process.env.LOG_MP_PAYMENTS === 'true') {
              console.log(`✅ Payment approved for order ${order.orderNumber} (${order._id})`);
            }
            break;
            
          case 'pending':
            order.payment.status = 'in_process';
            break;
            
          case 'rejected':
            order.payment.status = 'rejected';
            order.status = 'cancelled';
            break;
            
          case 'cancelled':
            order.payment.status = 'cancelled';
            order.status = 'cancelled';
            break;
            
          case 'refunded':
            order.payment.status = 'refunded';
            order.status = 'refunded';
            break;
        }
        
        await order.save();
        
        if (process.env.LOG_MP_WEBHOOKS === 'true') {
          console.log(`🔄 Webhook processed: Order ${order.orderNumber} -> ${paymentDetails.status}`);
        }
      }
    }
    
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * @route   GET /api/payments/order/:id
 * @desc    Obtener estado de una orden
 * @access  Public
 */
router.get('/order/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('-internalNotes -ipAddress -userAgent');
    
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
 * @route   GET /api/payments/methods
 * @desc    Obtener métodos de pago disponibles
 * @access  Public
 */
router.get('/methods', async (req, res) => {
  try {
    const paymentMethods = {
      mercadopago: {
        enabled: true,
        methods: {
          credit_cards: process.env.MP_ENABLE_CREDIT_CARDS === 'true',
          debit_cards: process.env.MP_ENABLE_DEBIT_CARDS === 'true',
          pagofacil: process.env.MP_ENABLE_PAGOFACIL === 'true',
          rapipago: process.env.MP_ENABLE_RAPIPAGO === 'true'
        },
        publicKey: process.env.MP_PUBLIC_KEY
      },
      western_union: {
        enabled: process.env.MP_ENABLE_WESTERN_UNION === 'true',
        recipient_name: process.env.WU_RECIPIENT_NAME,
        recipient_document: process.env.WU_RECIPIENT_DOCUMENT,
        recipient_country: process.env.WU_RECIPIENT_COUNTRY,
        recipient_city: process.env.WU_RECIPIENT_CITY
      },
      transfer: {
        enabled: process.env.MP_ENABLE_TRANSFER === 'true',
        bank_name: process.env.BANK_NAME,
        account_holder: process.env.BANK_ACCOUNT_HOLDER,
        cbu: process.env.BANK_CBU,
        alias: process.env.BANK_ALIAS,
        cuit: process.env.BANK_CUIT,
        mp_cvu: process.env.MP_CVU,
        mp_alias: process.env.MP_ALIAS
      }
    };
    
    res.json({ success: true, paymentMethods });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ success: false, message: 'Error al obtener métodos de pago' });
  }
});

module.exports = router;