const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'out');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.csv': 'text/csv'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURI(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  let filePath = path.join(OUT_DIR, urlPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  } else if (!fs.existsSync(filePath) && fs.existsSync(path.join(filePath, 'index.html'))) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && urlPath.startsWith('/confirmacion/')) {
    // Fallback dinámico para vouchers de reservas creadas en tiempo de ejecución (/confirmacion/CAN-2026-XX)
    filePath = path.join(OUT_DIR, 'confirmacion', 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const notFoundPath = path.join(OUT_DIR, '404.html');
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(notFoundPath));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
    res.end(data);
  });
});

let currentPort = parseInt(process.env.PORT, 10) || 3000;

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n  ▲ CanchaApp — Servidor Estático de Producción (Cloudflare Pages Preview)`);
    console.log(`  - Local:   http://localhost:${port}`);
    console.log(`  - Sirviendo carpeta: ${OUT_DIR}\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n  [Aviso] El puerto ${currentPort} está ocupado por otro proceso.`);
    currentPort += 1;
    console.log(`  -> Intentando automáticamente en http://localhost:${currentPort}...\n`);
    startServer(currentPort);
  } else {
    console.error('Error en el servidor:', err);
    process.exit(1);
  }
});

startServer(currentPort);
