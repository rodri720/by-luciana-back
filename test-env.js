// test-env.js en la raíz de tu backend
require('dotenv').config();

console.log('🔍 TEST de variables de entorno:');
console.log('MERCADOPAGO_ACCESS_TOKEN:', process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ DEFINIDO' : '❌ NO DEFINIDO');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ DEFINIDO' : '❌ NO DEFINIDO');
console.log('PORT:', process.env.PORT || 5000);
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

// Mostrar token (primeros 20 caracteres)
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.log('Token (primeros 20 chars):', process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 20) + '...');
}