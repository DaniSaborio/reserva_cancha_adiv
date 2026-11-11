const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'out');

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

// OWASP A02:2025 — Cabeceras de Seguridad HTTP Estándar
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

const server = http.createServer((req, res) => {
  // OWASP A10:2025 — Manejo seguro de URI malformadas (Fail-Closed)
  let urlPath = '/';
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // Rechazar bytes nulos o intentos de escalada de directorios (OWASP A01:2025 Path Traversal)
  if (urlPath.includes('\0') || urlPath.includes('..')) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  if (urlPath === '/') urlPath = '/index.html';

  let filePath = path.resolve(OUT_DIR, '.' + urlPath);

  // Verificación estricta de confinamiento dentro de OUT_DIR (Anti-Path Traversal)
  if (!filePath.startsWith(OUT_DIR + path.sep) && filePath !== OUT_DIR) {
    res.writeHead(403, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

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
        res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(notFoundPath));
      } else {
        res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': `${contentType}; charset=utf-8`
    });
    res.end(data);
  });
});

let currentPort = parseInt(process.env.PORT, 10) || 3000;

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n  ▲ CanchaApp — Servidor Estático de Producción (Cloudflare Pages Preview)`);
    console.log(`  - Local:   http://localhost:${port}`);
    console.log(`  - Seguridad: Cabeceras OWASP Top 10:2025 activas`);
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
