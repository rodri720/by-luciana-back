// backend/src/middleware/verifyWebhook.js
const crypto = require('crypto');

const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!signature) {
    console.warn('⚠️ Webhook sin firma');
    return next();
  }
  
  // Tu clave secreta de webhook (opcional, configurada en MP)
  const secret = process.env.MP_WEBHOOK_SECRET;
  
  if (!secret) {
    console.warn('⚠️ Clave secreta no configurada');
    return next();
  }
  
  // Verificar firma
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  if (hash === signature.split(',')[1]) {
    console.log('✅ Firma del webhook verificada');
    next();
  } else {
    console.error('❌ Firma del webhook inválida');
    res.status(401).json({ error: 'Firma inválida' });
  }
};

module.exports = { verifyWebhookSignature };