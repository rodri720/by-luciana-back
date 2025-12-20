const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configurar el transporter de email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Solo para desarrollo
  }
});

// Verificar conexión al email
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Error conectando al servidor de email:', error);
  } else {
    console.log('✅ Servidor de email listo para enviar mensajes');
  }
});

/**
 * Genera el HTML para la factura de compra
 * @param {Object} order - Objeto de la orden
 * @param {Object} paymentDetails - Detalles del pago de MercadoPago
 * @returns {String} HTML de la factura
 */
const generateInvoiceHTML = (order, paymentDetails) => {
  const storeName = process.env.STORE_NAME || 'LUTEST';
  const storeEmail = process.env.STORE_EMAIL || 'bylualiendo@gmail.com';
  const storePhone = process.env.STORE_PHONE || '+54 9 11 1234-5678';
  const storeAddress = process.env.STORE_ADDRESS || 'Buenos Aires, Argentina';
  const storeWhatsapp = process.env.STORE_WHATSAPP;
  const storeInstagram = process.env.STORE_INSTAGRAM;
  
  const orderDate = new Date(order.createdAt).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const paymentDate = paymentDetails?.date_approved ? 
    new Date(paymentDetails.date_approved).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : orderDate;

  // Método de pago en español
  const paymentMethodMap = {
    'credit_card': 'Tarjeta de crédito',
    'debit_card': 'Tarjeta de débito',
    'pagofacil': 'Pago Fácil',
    'rapipago': 'Rapi Pago',
    'account_money': 'Dinero en cuenta MercadoPago',
    'ticket': 'Ticket de pago',
    'atm': 'Cajero automático',
    'bank_transfer': 'Transferencia bancaria',
    'pec': 'Pago electrónico inmediato'
  };

  const paymentMethod = paymentMethodMap[paymentDetails?.payment_method_id] || 
                       paymentDetails?.payment_method_id || 
                       'MercadoPago';

  const installments = paymentDetails?.installments || 1;
  const installmentsText = installments > 1 ? 
    `(${installments} cuota${installments > 1 ? 's' : ''})` : '(1 pago)';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${order.orderNumber} - ${storeName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
            padding: 20px;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #009ee3 0%, #00b5a6 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .store-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 1px;
        }
        
        .store-tagline {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .invoice-title {
            background: rgba(255,255,255,0.1);
            display: inline-block;
            padding: 10px 25px;
            border-radius: 25px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            color: #009ee3;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #f0f0f0;
            font-weight: 600;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            margin-bottom: 10px;
        }
        
        .info-label {
            font-weight: 600;
            color: #666;
            font-size: 14px;
            margin-bottom: 3px;
        }
        
        .info-value {
            font-size: 16px;
            color: #333;
        }
        
        .order-summary {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .order-summary th {
            background-color: #f8f9fa;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            color: #555;
            border-bottom: 2px solid #eaeaea;
        }
        
        .order-summary td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
        }
        
        .order-summary tr:hover {
            background-color: #f9f9f9;
        }
        
        .product-image {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #eee;
        }
        
        .product-name {
            font-weight: 500;
        }
        
        .product-details {
            font-size: 13px;
            color: #777;
            margin-top: 3px;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totals {
            margin-top: 25px;
            padding-top: 20px;
            border-top: 2px solid #eee;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 5px 0;
        }
        
        .total-label {
            font-weight: 500;
            color: #666;
        }
        
        .total-value {
            font-weight: 500;
            color: #333;
        }
        
        .grand-total {
            font-size: 20px;
            font-weight: bold;
            color: #009ee3;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #eee;
        }
        
        .payment-status {
            display: inline-block;
            padding: 6px 15px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-approved {
            background-color: #d4edda;
            color: #155724;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #eee;
            color: #666;
        }
        
        .contact-info {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
            margin: 15px 0;
        }
        
        .contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }
        
        .social-links {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 15px;
        }
        
        .social-link {
            color: #009ee3;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.3s;
        }
        
        .social-link:hover {
            color: #007bb5;
            text-decoration: underline;
        }
        
        .thank-you {
            background: linear-gradient(135deg, #fff8e1 0%, #f3e5f5 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 25px 0;
            text-align: center;
            border: 1px dashed #ba68c8;
        }
        
        .thank-you h3 {
            color: #7b1fa2;
            margin-bottom: 10px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #009ee3 0%, #00b5a6 100%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin-top: 15px;
            transition: all 0.3s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,158,227,0.3);
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
            
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .header {
                padding: 20px;
            }
            
            .store-name {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Encabezado -->
        <div class="header">
            <div class="store-name">${storeName}</div>
            <div class="store-tagline">Tienda oficial de moda y accesorios</div>
            <div class="invoice-title">COMPROBANTE DE COMPRA</div>
        </div>
        
        <!-- Contenido principal -->
        <div class="content">
            <!-- Información de la compra -->
            <div class="section">
                <div class="section-title">✅ Confirmación de Compra</div>
                <div class="thank-you">
                    <h3>¡Gracias por tu compra, ${order.customer.name}!</h3>
                    <p>Tu pedido ha sido procesado exitosamente. A continuación encontrarás los detalles de tu compra.</p>
                    <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="btn">Ver mi pedido</a>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Número de Pedido</div>
                        <div class="info-value"><strong>${order.orderNumber}</strong></div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Fecha de Compra</div>
                        <div class="info-value">${orderDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Estado del Pago</div>
                        <div class="info-value">
                            <span class="payment-status status-approved">APROBADO</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Fecha de Pago</div>
                        <div class="info-value">${paymentDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Método de Pago</div>
                        <div class="info-value">${paymentMethod} ${installmentsText}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">ID de Transacción</div>
                        <div class="info-value">${paymentDetails?.id || 'N/A'}</div>
                    </div>
                </div>
            </div>
            
            <!-- Información del cliente -->
            <div class="section">
                <div class="section-title">👤 Información del Cliente</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Nombre Completo</div>
                        <div class="info-value">${order.customer.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Email</div>
                        <div class="info-value">${order.customer.email}</div>
                    </div>
                    ${order.customer.phone ? `
                    <div class="info-item">
                        <div class="info-label">Teléfono</div>
                        <div class="info-value">${order.customer.phone}</div>
                    </div>
                    ` : ''}
                    ${order.customer.address ? `
                    <div class="info-item">
                        <div class="info-label">Dirección de Envío</div>
                        <div class="info-value">${order.customer.address}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Detalles del pedido -->
            <div class="section">
                <div class="section-title">🛍️ Detalles del Pedido</div>
                <table class="order-summary">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th class="text-right">Precio Unitario</th>
                            <th class="text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                        <tr>
                            <td>
                                <div class="product-name">${item.name}</div>
                                ${item.color || item.size ? `
                                <div class="product-details">
                                    ${item.color ? `Color: ${item.color}` : ''}
                                    ${item.color && item.size ? ' • ' : ''}
                                    ${item.size ? `Talle: ${item.size}` : ''}
                                </div>
                                ` : ''}
                            </td>
                            <td>${item.quantity}</td>
                            <td class="text-right">$${item.price.toFixed(2)}</td>
                            <td class="text-right">$${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <!-- Totales -->
                <div class="totals">
                    <div class="total-row">
                        <div class="total-label">Subtotal:</div>
                        <div class="total-value">$${order.subtotal.toFixed(2)}</div>
                    </div>
                    ${order.discount > 0 ? `
                    <div class="total-row">
                        <div class="total-label">Descuento:</div>
                        <div class="total-value" style="color: #4CAF50;">-$${order.discount.toFixed(2)}</div>
                    </div>
                    ` : ''}
                    ${order.shippingCost > 0 ? `
                    <div class="total-row">
                        <div class="total-label">Costo de Envío:</div>
                        <div class="total-value">$${order.shippingCost.toFixed(2)}</div>
                    </div>
                    ` : ''}
                    ${order.tax > 0 ? `
                    <div class="total-row">
                        <div class="total-label">Impuestos:</div>
                        <div class="total-value">$${order.tax.toFixed(2)}</div>
                    </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <div class="total-label">TOTAL:</div>
                        <div class="total-value">$${order.total.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            <!-- Información de envío -->
            ${order.shipping.method !== 'pickup' ? `
            <div class="section">
                <div class="section-title">🚚 Información de Envío</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Método de Envío</div>
                        <div class="info-value">${order.shipping.method === 'express' ? 'Express (24-48hs)' : 'Estándar (3-5 días)'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Costo de Envío</div>
                        <div class="info-value">$${order.shippingCost.toFixed(2)}</div>
                    </div>
                    ${order.shipping.address ? `
                    <div class="info-item">
                        <div class="info-label">Dirección</div>
                        <div class="info-value">${order.shipping.address}</div>
                    </div>
                    ` : ''}
                    ${order.shipping.city ? `
                    <div class="info-item">
                        <div class="info-label">Ciudad/Provincia</div>
                        <div class="info-value">${order.shipping.city}${order.shipping.province ? `, ${order.shipping.province}` : ''}</div>
                    </div>
                    ` : ''}
                    ${order.shipping.postalCode ? `
                    <div class="info-item">
                        <div class="info-label">Código Postal</div>
                        <div class="info-value">${order.shipping.postalCode}</div>
                    </div>
                    ` : ''}
                </div>
                <p style="margin-top: 15px; color: #666; font-style: italic;">
                    📦 Recibirás un email con el número de seguimiento una vez que tu pedido sea despachado.
                </p>
            </div>
            ` : `
            <div class="section">
                <div class="section-title">📍 Retiro en Tienda</div>
                <p>Tu pedido estará listo para retirar en nuestra tienda física.</p>
                <p><strong>Dirección:</strong> ${storeAddress}</p>
                <p><strong>Horarios:</strong> Lunes a Viernes 10:00 - 18:00, Sábados 10:00 - 14:00</p>
                <p style="color: #666; font-style: italic; margin-top: 10px;">
                    🎁 Recuerda traer este comprobante y tu documento de identidad para retirar tu compra.
                </p>
            </div>
            `}
        </div>
        
        <!-- Pie de página -->
        <div class="footer">
            <p><strong>${storeName}</strong> - Tienda oficial</p>
            
            <div class="contact-info">
                <div class="contact-item">
                    📧 ${storeEmail}
                </div>
                <div class="contact-item">
                    📞 ${storePhone}
                </div>
                <div class="contact-item">
                    📍 ${storeAddress}
                </div>
            </div>
            
            ${storeWhatsapp || storeInstagram ? `
            <div class="social-links">
                ${storeWhatsapp ? `
                <a href="${storeWhatsapp}" class="social-link" target="_blank">WhatsApp</a>
                ` : ''}
                ${storeInstagram ? `
                <a href="${storeInstagram}" class="social-link" target="_blank">Instagram</a>
                ` : ''}
            </div>
            ` : ''}
            
            <p style="margin-top: 20px; font-size: 13px; color: #888;">
                Este es un comprobante generado automáticamente. Por cualquier consulta, no dudes en contactarnos.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Envía la factura de compra por email
 * @param {Object} order - Objeto de la orden
 * @param {Object} paymentDetails - Detalles del pago de MercadoPago
 * @returns {Promise<Object>} Resultado del envío
 */
const sendInvoiceEmail = async (order, paymentDetails) => {
  try {
    // Verificar que se pueda enviar emails
    if (process.env.EMAIL_SEND_INVOICE !== 'true') {
      console.log('📧 Envío de emails desactivado en configuración');
      return { sent: false, reason: 'Email sending disabled in config' };
    }

    if (!order.customer.email) {
      console.error('❌ No hay email del cliente para enviar factura');
      return { sent: false, reason: 'No customer email' };
    }

    // Generar HTML de la factura
    const invoiceHTML = generateInvoiceHTML(order, paymentDetails);
    
    // Configurar opciones del email
    const mailOptions = {
      from: {
        name: process.env.STORE_NAME || 'LUTEST',
        address: process.env.EMAIL_USER
      },
      to: order.customer.email,
      bcc: process.env.STORE_EMAIL, // Copia oculta para la tienda
      subject: process.env.EMAIL_INVOICE_SUBJECT || `Factura de compra #${order.orderNumber} - ${process.env.STORE_NAME}`,
      html: invoiceHTML,
      attachments: [
        {
          filename: `factura-${order.orderNumber}.pdf`,
          content: 'PDF generado automáticamente',
          contentType: 'application/pdf',
          // Nota: Para generar PDF real, necesitarías una librería como puppeteer
        }
      ]
    };

    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email de factura enviado a: ${order.customer.email}`);
    console.log(`📧 Email Message ID: ${info.messageId}`);
    
    // Log para producción
    if (process.env.NODE_ENV === 'production') {
      console.log(`📋 Factura enviada para orden ${order.orderNumber} (${order._id})`);
    }
    
    return { 
      sent: true, 
      messageId: info.messageId,
      to: order.customer.email 
    };
    
  } catch (error) {
    console.error('❌ Error enviando email de factura:', error);
    
    // Error específico de credenciales
    if (error.code === 'EAUTH') {
      console.error('⚠️  Error de autenticación de email. Verifica las credenciales en .env');
    }
    
    return { 
      sent: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};

/**
 * Envía email de notificación de orden cancelada
 * @param {Object} order - Objeto de la orden
 * @param {String} reason - Razón de la cancelación
 */
const sendCancellationEmail = async (order, reason = 'Solicitud del cliente') => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .order-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Orden Cancelada #${order.orderNumber}</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${order.customer.name}</strong>,</p>
            <p>Tu orden ha sido cancelada.</p>
            
            <div class="order-info">
              <p><strong>Motivo:</strong> ${reason}</p>
              <p><strong>Número de orden:</strong> ${order.orderNumber}</p>
              <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
              <p><strong>Fecha de cancelación:</strong> ${new Date().toLocaleDateString('es-AR')}</p>
            </div>
            
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p>Atentamente,<br>El equipo de ${process.env.STORE_NAME || 'LUTEST'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: {
        name: process.env.STORE_NAME || 'LUTEST',
        address: process.env.EMAIL_USER
      },
      to: order.customer.email,
      subject: `Orden Cancelada #${order.orderNumber} - ${process.env.STORE_NAME}`,
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de cancelación enviado a: ${order.customer.email}`);
    
  } catch (error) {
    console.error('Error enviando email de cancelación:', error);
  }
};

/**
 * Envía email de restablecimiento de contraseña
 * @param {Object} user - Usuario
 * @param {String} resetToken - Token para restablecer contraseña
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .btn { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Restablecer Contraseña</h2>
          </div>
          <div class="content">
            <p>Hola <strong>${user.name}</strong>,</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="btn">Restablecer Contraseña</a>
            </p>
            <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email.</p>
            <p>Este enlace expirará en 1 hora.</p>
            <p>Atentamente,<br>El equipo de ${process.env.STORE_NAME || 'LUTEST'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: {
        name: process.env.STORE_NAME || 'LUTEST',
        address: process.env.EMAIL_USER
      },
      to: user.email,
      subject: 'Restablecer Contraseña - ' + process.env.STORE_NAME,
      html: html
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de restablecimiento enviado a: ${user.email}`);
    
  } catch (error) {
    console.error('Error enviando email de restablecimiento:', error);
  }
};

module.exports = {
  transporter,
  generateInvoiceHTML,
  sendInvoiceEmail,
  sendCancellationEmail,
  sendPasswordResetEmail
};