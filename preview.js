const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_DIR = path.resolve(__dirname, 'out');
const SEED_PATH = path.resolve(__dirname, 'src', 'data', 'seed_data.json');

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

// Base de Datos D1 Local en Memoria (Inicializada desde seed_data.json)
let localD1 = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
let nextReservaId = localD1.reservas.length + 1;
let nextPagoId = localD1.pagos.length + 1;
let nextBloqueoId = localD1.bloqueos_horario.length + 1;

const HORAS_OFICIALES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0'
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 65536) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw, (k, v) => {
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') return undefined;
          return v;
        });
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function verifyBearerJwt(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const rawToken = authHeader.slice(7).trim();
  const parts = rawToken.split('.');
  try {
    const payloadB64 = parts.length >= 2 ? parts[1] : parts[0];
    const jsonStr = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(jsonStr);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload || !payload.exp || payload.exp < nowSec) return null;
    if (!['Administrador', 'Tesorero'].includes(payload.rol)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function handleApiRequest(req, res, urlObj) {
  const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
  const method = req.method || 'GET';

  // 1. GET /api/disponibilidad?fecha=YYYY-MM-DD (PT-API-01)
  if (pathname === '/api/disponibilidad' && method === 'GET') {
    const fecha = urlObj.searchParams.get('fecha');
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return sendJson(res, 400, { error: 'Fecha inválida. Use formato YYYY-MM-DD' });
    }
    const reservasMap = new Map(
      localD1.reservas
        .filter((r) => r.fecha_reserva === fecha && r.estado !== 'Cancelada')
        .map((r) => [r.hora_inicio, r.estado])
    );
    const bloqueosMap = new Map(
      localD1.bloqueos_horario
        .filter((b) => b.fecha === fecha)
        .map((b) => [b.hora_inicio, b.motivo])
    );

    const resultado = localD1.franjas_oficiales.map((f) => {
      if (bloqueosMap.has(f.hora_inicio)) {
        return { ...f, estado: 'Mantenimiento', motivo: bloqueosMap.get(f.hora_inicio) };
      }
      if (reservasMap.has(f.hora_inicio)) {
        const est = reservasMap.get(f.hora_inicio);
        return {
          ...f,
          estado: est === 'Confirmada' ? 'Ocupada' : 'En proceso'
        };
      }
      return { ...f, estado: 'Disponible' };
    });
    return sendJson(res, 200, resultado);
  }

  // 2. POST /api/reservas (PT-API-02 & PT-BD-01)
  if (pathname === '/api/reservas' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { nombre, tel, fecha, hora, metodo } = body || {};
      const nombreSanitizado = String(nombre || '')
        .replace(/[\u0000-\u001F\u007F<>]/g, '')
        .trim()
        .slice(0, 80);
      const telDigitos = String(tel || '').replace(/[^\d]/g, '');

      if (
        !nombreSanitizado ||
        nombreSanitizado.length < 2 ||
        !/^[245678]\d{7}$/.test(telDigitos) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) ||
        !HORAS_OFICIALES.includes(hora)
      ) {
        return sendJson(res, 400, {
          error: 'Datos incompletos o con formato inválido para procesar la reserva.'
        });
      }

      // Restricción Atómica UNIQUE(cancha_id, fecha_reserva, hora_inicio)
      const colisionReserva = localD1.reservas.find(
        (r) => r.fecha_reserva === fecha && r.hora_inicio === hora && r.estado !== 'Cancelada'
      );
      const colisionBloqueo = localD1.bloqueos_horario.find(
        (b) => b.fecha === fecha && b.hora_inicio === hora
      );

      if (colisionReserva || colisionBloqueo) {
        const sugerencias = HORAS_OFICIALES.filter((h) => {
          const rOcup = localD1.reservas.some(
            (r) => r.fecha_reserva === fecha && r.hora_inicio === h && r.estado !== 'Cancelada'
          );
          const bOcup = localD1.bloqueos_horario.some(
            (b) => b.fecha === fecha && b.hora_inicio === h
          );
          return !rOcup && !bOcup;
        })
          .slice(0, 3)
          .map((h) => {
            const hNum = parseInt(h.split(':')[0], 10);
            return { hora_inicio: h, hora_fin: `${String(hNum + 1).padStart(2, '0')}:00` };
          });

        return sendJson(res, 409, {
          error: 'Horario recién ocupado. Otra persona confirmó mientras llenabas tus datos.',
          sugerencias
        });
      }

      const id = nextReservaId++;
      const codigo = `CAN-2026-${String(id).padStart(2, '0')}`;
      const horaNum = parseInt(hora.split(':')[0], 10);
      const horaFin = `${String(horaNum + 1).padStart(2, '0')}:00`;
      const telFormateado = `${telDigitos.slice(0, 4)}-${telDigitos.slice(4, 8)}`;
      const metodoSeguro = metodo === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil';
      const montoTotal = 16000;

      const nuevaReserva = {
        id,
        codigo_reserva: codigo,
        cancha_id: 1,
        cliente_nombre: nombreSanitizado,
        cliente_telefono: telFormateado,
        fecha_reserva: fecha,
        hora_inicio: hora,
        hora_fin: horaFin,
        metodo_pago_previsto: metodoSeguro,
        estado: 'Pendiente',
        monto_total: montoTotal,
        created_at: new Date().toISOString()
      };
      localD1.reservas.push(nuevaReserva);

      return sendJson(res, 201, {
        codigo,
        id,
        total: montoTotal,
        estado: 'Pendiente'
      });
    } catch {
      return sendJson(res, 400, { error: 'Solicitud JSON inválida' });
    }
  }

  // 3. GET /api/reservas/:codigo
  if (pathname.startsWith('/api/reservas/') && method === 'GET') {
    const param = decodeURIComponent(pathname.slice('/api/reservas/'.length)).trim();
    const cleanDigits = param.replace(/[^\d]/g, '');
    const reserva = localD1.reservas.find(
      (r) =>
        r.codigo_reserva.toUpperCase() === param.toUpperCase() ||
        (cleanDigits.length === 8 && r.cliente_telefono.replace(/[^\d]/g, '') === cleanDigits)
    );
    if (!reserva) {
      return sendJson(res, 404, { error: 'Reserva no encontrada' });
    }
    const pago = localD1.pagos.find((p) => p.reserva_id === reserva.id) || null;
    return sendJson(res, 200, { reserva, pago });
  }

  // 4. POST /api/admin/login (PT-API-03)
  if (pathname === '/api/admin/login' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const user = String(body.username || '').trim().toLowerCase();
      const pass = String(body.password || '');

      const credencialesValidas =
        (user === 'admin' && pass === 'Venecia2026!') ||
        (user === 'tesoreria' && pass === 'Tesoreria2026!');

      if (!credencialesValidas) {
        return sendJson(res, 401, { error: 'Credenciales incorrectas' });
      }

      const adminInfo =
        user === 'tesoreria'
          ? {
              id: 2,
              username: 'tesoreria',
              nombre: 'Marta Soto (Tesorera)',
              rol: 'Tesorero',
              email: 'tesoreria@canchavenecia.cr'
            }
          : {
              id: 1,
              username: 'admin',
              nombre: 'Carlos Pérez (Encargado)',
              rol: 'Administrador',
              email: 'admin@canchavenecia.cr'
            };

      const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
      const payloadB64 = Buffer.from(
        JSON.stringify({
          sub: adminInfo.id,
          username: adminInfo.username,
          nombre: adminInfo.nombre,
          rol: adminInfo.rol,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 8 * 3600
        })
      ).toString('base64');
      const sig = crypto
        .createHmac('sha256', 'venecia-d1-edge-secret-2026')
        .update(`${headerB64}.${payloadB64}`)
        .digest('hex');

      return sendJson(res, 200, {
        token: `${headerB64}.${payloadB64}.${sig}`,
        admin: adminInfo
      });
    } catch {
      return sendJson(res, 400, { error: 'Formato de petición inválido' });
    }
  }

  // 5. GET /api/admin/dashboard (PT-API-04 & PT-BD-03)
  if (pathname === '/api/admin/dashboard' && method === 'GET') {
    const claims = verifyBearerJwt(req.headers['authorization'] || '');
    if (!claims) {
      return sendJson(res, 401, { error: 'No autorizado' });
    }
    let sinpe = 0;
    let efectivo = 0;
    localD1.pagos.forEach((p) => {
      if (p.metodo_pago === 'SINPE Móvil') sinpe += Number(p.monto);
      if (p.metodo_pago === 'Efectivo') efectivo += Number(p.monto);
    });
    return sendJson(res, 200, {
      ingresos_total: sinpe + efectivo,
      sinpe,
      efectivo,
      reservas: localD1.reservas
    });
  }

  // 6. POST /api/admin/pagos (PT-API-05 & PT-BD-02)
  if (pathname === '/api/admin/pagos' && method === 'POST') {
    const claims = verifyBearerJwt(req.headers['authorization'] || '');
    if (!claims) {
      return sendJson(res, 401, { error: 'No autorizado' });
    }
    try {
      const { reserva_id, metodo, monto, comprobante } = await readJsonBody(req);
      const idNum = Number(reserva_id);
      if (!Number.isInteger(idNum) || idNum <= 0 || !['Efectivo', 'SINPE Móvil'].includes(metodo)) {
        return sendJson(res, 400, { error: 'Datos de pago incompletos o método inválido' });
      }
      // Integridad Referencial FK -> reservas(id) (PT-BD-02)
      const reservaTarget = localD1.reservas.find((r) => r.id === idNum);
      if (!reservaTarget) {
        return sendJson(res, 404, {
          error: 'Violación de clave foránea (FK constraint): reserva_id inexistente'
        });
      }

      const comprobanteSanitizado = comprobante
        ? String(comprobante).replace(/[^a-zA-Z0-9\-_#]/g, '').slice(0, 32)
        : null;

      if (metodo === 'SINPE Móvil' && (!comprobanteSanitizado || comprobanteSanitizado.length < 3)) {
        return sendJson(res, 400, {
          error: 'Comprobante bancario obligatorio para pagos SINPE Móvil'
        });
      }

      const montoSeguro = Number(monto) > 0 && Number(monto) <= 100000 ? Number(monto) : 16000;
      const nuevoPago = {
        id: nextPagoId++,
        reserva_id: idNum,
        metodo_pago: metodo,
        monto: montoSeguro,
        numero_comprobante: comprobanteSanitizado,
        registrado_por: claims.nombre || 'Carlos Pérez (Encargado)',
        fecha_pago: new Date().toISOString()
      };
      localD1.pagos.push(nuevoPago);
      reservaTarget.estado = 'Confirmada';

      return sendJson(res, 201, {
        id_pago: nuevoPago.id,
        status: 'Confirmada',
        monto: montoSeguro
      });
    } catch {
      return sendJson(res, 400, { error: 'Error al registrar el pago' });
    }
  }

  // 7. POST /api/admin/bloqueos
  if (pathname === '/api/admin/bloqueos' && method === 'POST') {
    const claims = verifyBearerJwt(req.headers['authorization'] || '');
    if (!claims) {
      return sendJson(res, 401, { error: 'No autorizado' });
    }
    try {
      const { fecha, hora_inicio, hora_fin, motivo } = await readJsonBody(req);
      const motivoLimpio = String(motivo || '')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 120);
      if (
        !fecha ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        !HORAS_OFICIALES.includes(hora_inicio) ||
        !motivoLimpio
      ) {
        return sendJson(res, 400, {
          error: 'Datos de bloqueo incompletos o fuera de horario oficial'
        });
      }

      const conflicto =
        localD1.reservas.some(
          (r) =>
            r.fecha_reserva === fecha &&
            r.hora_inicio === hora_inicio &&
            r.estado !== 'Cancelada'
        ) ||
        localD1.bloqueos_horario.some(
          (b) => b.fecha === fecha && b.hora_inicio === hora_inicio
        );

      if (conflicto) {
        return sendJson(res, 409, { error: 'Conflicto con reserva o bloqueo existente' });
      }

      const horaNum = parseInt(hora_inicio.split(':')[0], 10);
      const hFin = hora_fin || `${String(horaNum + 1).padStart(2, '0')}:00`;
      const nuevoBloqueo = {
        id: nextBloqueoId++,
        cancha_id: 1,
        fecha,
        hora_inicio,
        hora_fin: hFin,
        motivo: motivoLimpio,
        usuario_id: claims.sub || 1,
        created_at: new Date().toISOString()
      };
      localD1.bloqueos_horario.push(nuevoBloqueo);

      return sendJson(res, 201, { id_bloqueo: nuevoBloqueo.id });
    } catch {
      return sendJson(res, 400, { error: 'Formato inválido' });
    }
  }

  return sendJson(res, 404, { error: 'Endpoint API no encontrado' });
}

const server = http.createServer(async (req, res) => {
  // OWASP A10:2025 — Manejo seguro de URI malformadas (Fail-Closed)
  let urlObj;
  let urlPath = '/';
  try {
    urlObj = new URL(req.url || '/', 'http://localhost');
    urlPath = decodeURIComponent(urlObj.pathname);
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

  // Enrutador local de Cloudflare Workers API (/api/*)
  if (urlPath.startsWith('/api/')) {
    await handleApiRequest(req, res, urlObj);
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
    console.log(`\n  ▲ CanchaApp — Servidor Estático + Workers API Local (Cloudflare Pages + D1 Preview)`);
    console.log(`  - Local:   http://localhost:${port}`);
    console.log(`  - API D1:  http://localhost:${port}/api/disponibilidad?fecha=2026-11-06`);
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
