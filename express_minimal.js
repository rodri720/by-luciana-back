const express = require('express');
const app = express();
const PORT = 5000;

// Middleware bÃ¡sico
app.use(express.json());

// Ruta simple
app.get('/api/products', (req, res) => {
  console.log('âœ… EXPRESS /api/products hit!');
  res.json({ message: 'âœ… Express works!', products: [] });
});

app.listen(PORT, () => {
  console.log('í¾¯ EXPRESS MINIMAL on http://localhost:5000');
});
