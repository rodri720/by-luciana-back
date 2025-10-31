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

    // Productos de prueba actualizados
    const products = [
      {
        name: "Vestido Floral Verano",
        description: "Hermoso vestido con estampado floral ideal para el verano",
        price: 29900,
        comparePrice: 39900,
        category: "novedades",
        stock: 25,
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: ["Rojo", "Azul", "Blanco"],
        sku: "BL0001",
        featured: true,
        tags: ["vestido", "floral", "verano", "mujer"]
      },
      {
        name: "Jeans Slim Fit",
        description: "Jeans modernos corte slim fit, cómodos y elegantes",
        price: 24900,
        comparePrice: 29900,
        category: "oulet",
        stock: 15,
        sizes: ["28", "30", "32", "34", "36"], // Tallas numéricas para jeans
        colors: ["Azul Claro", "Azul Oscuro", "Negro"],
        sku: "BL0002",
        featured: false,
        tags: ["jeans", "slim", "denim", "hombre"]
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
        featured: true,
        tags: ["camisa", "algodón", "básica", "unisex"]
      },
      {
        name: "Zapatos Deportivos",
        description: "Zapatos deportivos ultralivianos para entrenamiento",
        price: 45900,
        comparePrice: 59900,
        category: "calzados",
        stock: 30,
        sizes: ["36", "37", "38", "39", "40", "41", "42", "43"], // Tallas de calzado
        colors: ["Negro", "Blanco", "Azul"],
        sku: "BL0004",
        featured: true,
        tags: ["zapatos", "deportivos", "ejercicio", "unisex"]
      },
      {
        name: "Body Encaje Negro",
        description: "Body elegante de encaje negro, perfecto para ocasiones especiales",
        price: 18900,
        category: "bodys",
        stock: 20,
        sizes: ["XS", "S", "M", "L"],
        colors: ["Negro", "Rojo", "Blanco"],
        sku: "BL0005",
        featured: false,
        tags: ["body", "encaje", "elegante", "mujer"]
      },
      {
        name: "Collar Plata Sterling",
        description: "Elegante collar de plata sterling con diseño minimalista",
        price: 12900,
        category: "feriantes",
        stock: 50,
        sizes: ["Única"],
        colors: ["Plata"],
        sku: "BL0006",
        featured: true,
        tags: ["collar", "plata", "accesorio", "joyería"]
      },
      {
        name: "Blazer Elegante Oficina",
        description: "Blazer profesional perfecto para look de oficina",
        price: 55900,
        comparePrice: 69900,
        category: "novedades",
        stock: 12,
        sizes: ["S", "M", "L", "XL"],
        colors: ["Negro", "Azul Marino", "Gris"],
        sku: "BL0007",
        featured: true,
        tags: ["blazer", "oficina", "elegante", "profesional"]
      },
      {
        name: "Pack 3 Medias Deportivas",
        description: "Pack de 3 medias deportivas transpirables",
        price: 8900,
        category: "mayorista",
        stock: 200,
        sizes: ["Única"],
        colors: ["Negro/Blanco", "Gris/Blanco", "Multicolor"],
        sku: "BL0008",
        featured: false,
        tags: ["medias", "deportivas", "pack", "unisex"]
      },
      {
        name: "Falda Tableada Elegante",
        description: "Falda tableada de alta calidad para looks formales",
        price: 22900,
        category: "novedades",
        stock: 18,
        sizes: ["XS", "S", "M", "L"],
        colors: ["Negro", "Azul Marino", "Burdeos"],
        sku: "BL0009",
        featured: true,
        tags: ["falda", "tableada", "elegante", "mujer"]
      },
      {
        name: "Chaqueta Denim Clásica",
        description: "Chaqueta de denim clásica, atemporal y versátil",
        price: 38900,
        comparePrice: 45900,
        category: "oulet",
        stock: 22,
        sizes: ["XS", "S", "M", "L", "XL"],
        colors: ["Azul Clásico", "Negro"],
        sku: "BL0010",
        featured: false,
        tags: ["chaqueta", "denim", "jeans", "unisex"]
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

    console.log('\n🎉 Base de datos lista para usar!');
    console.log('\n🛒 Ahora puedes probar el carrito:');
    console.log('   1. Registra un usuario en /api/auth/register');
    console.log('   2. Haz login en /api/auth/login');
    console.log('   3. Agrega productos al carrito en /api/cart/add');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedProducts();