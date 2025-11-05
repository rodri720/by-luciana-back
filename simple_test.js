const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`í³¨ Request: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'âœ… HTTP Server working!',
    path: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  }));
});

server.listen(5000, () => {
  console.log('í¾¯ SIMPLE HTTP Server on http://localhost:5000');
});
