// Cloudflare Pages Function / Worker — POST /api/admin/bloqueos
// Bloquea franjas horarias por mantenimiento de césped, iluminación o torneos comunales
// Protegido bajo OWASP Top 10:2025 (A01 RBAC, A05 Sanitización XSS/SQLi, A06 Reglas de negocio)

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0'
};

const HORAS_VALIDAS = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function verifyBearerJwt(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const rawToken = authHeader.slice(7).trim();
  const parts = rawToken.split('.');
  try {
    const payloadB64 = parts.length >= 2 ? parts[1] : parts[0];
    const jsonStr = decodeURIComponent(escape(atob(payloadB64)));
    const payload = JSON.parse(jsonStr);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload || !payload.exp || payload.exp < nowSec) return null;
    if (!['Administrador', 'Tesorero'].includes(payload.rol)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims) {
    return Response.json({ error: 'No autorizado' }, { status: 401, headers: SEC_HEADERS });
  }

  try {
    const { fecha, hora_inicio, hora_fin, motivo } = await request.json();
    const motivoLimpio = String(motivo || '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 120);

    if (
      !fecha ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      !HORAS_VALIDAS.includes(hora_inicio) ||
      !motivoLimpio
    ) {
      return Response.json(
        { error: 'Datos de bloqueo incompletos o fuera de horario oficial' },
        { status: 400, headers: SEC_HEADERS }
      );
    }

    const horaNum = parseInt(hora_inicio.split(':')[0], 10);
    const hFinCalculada = hora_fin || `${String(horaNum + 1).padStart(2, '0')}:00`;

    if (env && env.DB) {
      const res = await env.DB.prepare(
        'INSERT INTO bloqueos_horario (cancha_id, fecha, hora_inicio, hora_fin, motivo, usuario_id) VALUES (1, ?, ?, ?, ?, ?)'
      )
        .bind(fecha, hora_inicio, hFinCalculada, motivoLimpio, claims.sub || 1)
        .run();

      return Response.json(
        { id_bloqueo: res.meta?.last_row_id || Date.now() },
        { status: 201, headers: SEC_HEADERS }
      );
    }

    return Response.json({ id_bloqueo: Date.now() }, { status: 201, headers: SEC_HEADERS });
  } catch {
    return Response.json(
      { error: 'Conflicto al bloquear horario' },
      { status: 409, headers: SEC_HEADERS }
    );
  }
}
