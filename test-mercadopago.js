require('dotenv').config();
const mercadopago = require('mercadopago');

console.log('🔍 Probando conexión con MercadoPago...');
console.log('Token:', process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 20) + '...');

try {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
  });
  
  console.log('✅ MercadoPago configurado');
  
  // Probar obteniendo métodos de pago
  mercadopago.payment_methods.list()
    .then(result => {
      console.log('✅ Conexión exitosa!');
      console.log(`Métodos de pago disponibles: ${result.length}`);
      process.exit(0);
    })
    .catch(error => {
      console.log('❌ Error al conectar:', error.message);
      console.log('Detalles:', error);
      process.exit(1);
    });
} catch (error) {
  console.log('❌ Error configurando MercadoPago:', error.message);
  process.exit(1);
}