require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    // Limpiar productos existentes
    await Product.deleteMany();
    console.log('🧹 Productos anteriores eliminados');

    // Productos de prueba simplificados
    const products = [
      {
        name: "Vestido Floral Verano",
        description: "Hermoso vestido con estampado floral ideal para el verano",
        price: 29900,
        category: "novedades",
        stock: 25,
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: ["Rojo", "Azul", "Blanco"],
        sku: "BL0001",
        featured: true
      },
      {
        name: "Jeans Slim Fit",
        description: "Jeans modernos corte slim fit, cómodos y elegantes",
        price: 24900,
        category: "oulet",
        stock: 15,
        sizes: ["28", "30", "32", "34", "36"],
        colors: ["Azul Claro", "Azul Oscuro", "Negro"],
        sku: "BL0002",
        featured: false
      },
      {
        name: "Camisa Básica Algodón",
        description: "Camisa 100% algodón, perfecta para uso diario",
        price: 15900,
        category: "mayorista",
        stock: 100,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        colors: ["Blanco", "Negro", "Gris", "Azul Marino"],
        sku: "BL0003",
        featured: true
      }
    ];

    // Insertar productos
    await Product.insertMany(products);
    console.log(`✅ ${products.length} productos insertados correctamente`);

    // Mostrar productos creados
    const createdProducts = await Product.find().select('name price category sku stock');
    console.log('\n📦 Productos creados:');
    createdProducts.forEach(product => {
      console.log(`   - ${product.name} | $${product.price} | ${product.category} | Stock: ${product.stock} | ${product.sku}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedProducts();