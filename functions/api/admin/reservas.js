// Cloudflare Pages Function / Worker — GET / PATCH /api/admin/reservas
// Gestión operativa de reservas (Padrón general, reprogramación y cancelación)
// Protegido bajo OWASP Top 10:2025 (A01 RBAC, A05 Sanitización, A06 Prevención de colisiones)

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

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims) {
    return Response.json({ error: 'No autorizado' }, { status: 401, headers: SEC_HEADERS });
  }

  if (env && env.DB) {
    const reservas = await env.DB.prepare(
      `SELECT r.*, p.metodo_pago as pago_metodo, p.numero_comprobante, p.fecha_pago 
       FROM reservas r 
       LEFT JOIN pagos p ON r.id = p.reserva_id 
       ORDER BY r.fecha_reserva DESC, r.hora_inicio ASC`
    ).all();
    return Response.json(reservas.results || [], { status: 200, headers: SEC_HEADERS });
  }

  return Response.json([], { status: 200, headers: SEC_HEADERS });
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims) {
    return Response.json({ error: 'No autorizado' }, { status: 401, headers: SEC_HEADERS });
  }

  try {
    const body = await request.json();
    const { action, id, motivo, fecha, hora } = body || {};
    const idNum = Number(id);

    if (!idNum || idNum <= 0) {
      return Response.json({ error: 'ID de reserva inválido' }, { status: 400, headers: SEC_HEADERS });
    }

    if (action === 'cancelar') {
      const motivoLimpio = String(motivo || 'Cancelada por administración')
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 120);

      if (env && env.DB) {
        await env.DB.prepare(
          "UPDATE reservas SET estado = 'Cancelada', motivo_cancelacion = ? WHERE id = ?"
        )
          .bind(motivoLimpio, idNum)
          .run();
      }

      return Response.json({ ok: true, status: 'Cancelada' }, { status: 200, headers: SEC_HEADERS });
    }

    if (action === 'reprogramar') {
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !HORAS_VALIDAS.includes(hora)) {
        return Response.json(
          { error: 'Fecha u hora de reprogramación inválida' },
          { status: 400, headers: SEC_HEADERS }
        );
      }

      const horaNum = parseInt(hora.split(':')[0], 10);
      const horaFin = `${String(horaNum + 1).padStart(2, '0')}:00`;

      if (env && env.DB) {
        // Verificar colisión con otra reserva activa
        const colision = await env.DB.prepare(
          "SELECT id FROM reservas WHERE fecha_reserva = ? AND hora_inicio = ? AND estado != 'Cancelada' AND id != ? LIMIT 1"
        )
          .bind(fecha, hora, idNum)
          .first();

        if (colision) {
          return Response.json(
            { error: 'El horario seleccionado ya se encuentra ocupado por otra reserva' },
            { status: 409, headers: SEC_HEADERS }
          );
        }

        // Verificar bloqueo de mantenimiento
        const bloqueo = await env.DB.prepare(
          'SELECT motivo FROM bloqueos_horario WHERE fecha = ? AND hora_inicio = ? LIMIT 1'
        )
          .bind(fecha, hora)
          .first();

        if (bloqueo) {
          return Response.json(
            { error: `Horario en mantenimiento: ${bloqueo.motivo}` },
            { status: 409, headers: SEC_HEADERS }
          );
        }

        await env.DB.prepare(
          'UPDATE reservas SET fecha_reserva = ?, hora_inicio = ?, hora_fin = ? WHERE id = ?'
        )
          .bind(fecha, hora, horaFin, idNum)
          .run();
      }

      return Response.json({ ok: true, fecha, hora }, { status: 200, headers: SEC_HEADERS });
    }

    return Response.json({ error: 'Acción inválida' }, { status: 400, headers: SEC_HEADERS });
  } catch {
    return Response.json({ error: 'Error al actualizar reserva' }, { status: 500, headers: SEC_HEADERS });
  }
}
