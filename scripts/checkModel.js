require('dotenv').config();
const mongoose = require('mongoose');

const checkModel = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Obtener información del esquema
    const Product = require('../models/Product');
    const schema = Product.schema;
    
    console.log('\n🔍 Información del esquema Product:');
    console.log('Campos del esquema:');
    
    Object.keys(schema.paths).forEach(path => {
      const pathObj = schema.paths[path];
      console.log(`\n📋 ${path}:`);
      console.log(`   Tipo: ${pathObj.instance}`);
      console.log(`   Requerido: ${pathObj.isRequired || false}`);
      
      if (pathObj.enumValues && pathObj.enumValues.length > 0) {
        console.log(`   Enum values: ${pathObj.enumValues.join(', ')}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkModel();