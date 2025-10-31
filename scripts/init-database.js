require('dotenv').config();
const mongoose = require('mongoose');

const initDatabase = async () => {
  try {
    console.log('🔄 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const db = mongoose.connection.db;
    
    // Verificar que la base de datos existe
    const databases = await db.admin().listDatabases();
    const dbExists = databases.databases.find(d => d.name === 'by-luciana');
    
    if (dbExists) {
      console.log('✅ Base de datos "by-luciana" encontrada');
    } else {
      console.log('🆕 Creando base de datos "by-luciana"...');
    }

    // Listar colecciones existentes
    const collections = await db.listCollections().toArray();
    console.log('📊 Colecciones en la base de datos:');
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });

    // Crear documento de prueba en colección 'app'
    await db.collection('app').insertOne({
      name: 'By Luciana E-commerce',
      version: '1.0.0',
      database: 'MongoDB Atlas',
      status: 'active',
      initialized: new Date(),
      collections: collections.map(c => c.name)
    });

    console.log('🎉 Base de datos inicializada correctamente');
    console.log('🌐 Ve a MongoDB Atlas → Browse Collections para ver los datos');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error inicializando la base de datos:', error);
    process.exit(1);
  }
};

initDatabase();