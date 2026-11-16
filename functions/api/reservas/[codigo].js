// Cloudflare Pages Function / Worker — GET /api/reservas/:codigo
// Consulta detalles y estado de una reserva por código único o teléfono completo (8 dígitos)
// Protegido contra IDOR y enumeración parcial (OWASP A01:2025)

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0'
};

export async function onRequestGet(context) {
  const { params, env } = context;
  const rawParam = String(params?.codigo || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 24);

  if (!rawParam) {
    return Response.json(
      { error: 'Código o teléfono requerido' },
      { status: 400, headers: SEC_HEADERS }
    );
  }

  // Normalizar si es teléfono de 8 dígitos
  const digits = rawParam.replace(/[^\d]/g, '');
  const telNormalizado =
    digits.length === 8 ? `${digits.slice(0, 4)}-${digits.slice(4, 8)}` : '__NO_MATCH__';

  if (env && env.DB) {
    if (digits.length === 8) {
      const reservasRows = await env.DB.prepare(
        'SELECT * FROM reservas WHERE cliente_telefono = ? ORDER BY fecha_reserva DESC, hora_inicio DESC LIMIT 10'
      )
        .bind(telNormalizado)
        .all();

      const results = reservasRows.results || [];
      if (!results.length) {
        return Response.json(
          { error: 'Reserva no encontrada' },
          { status: 404, headers: SEC_HEADERS }
        );
      }

      const lista = await Promise.all(
        results.map(async (r) => {
          const pago = await env.DB.prepare('SELECT * FROM pagos WHERE reserva_id = ? LIMIT 1')
            .bind(r.id)
            .first();
          return { reserva: r, pago: pago || null };
        })
      );

      return Response.json(
        {
          reserva: lista[0].reserva,
          pago: lista[0].pago,
          reservas: lista
        },
        { status: 200, headers: SEC_HEADERS }
      );
    }

    const reserva = await env.DB.prepare(
      'SELECT * FROM reservas WHERE UPPER(codigo_reserva) = UPPER(?) LIMIT 1'
    )
      .bind(rawParam)
      .first();

    if (!reserva) {
      return Response.json(
        { error: 'Reserva no encontrada' },
        { status: 404, headers: SEC_HEADERS }
      );
    }

    const pago = await env.DB.prepare('SELECT * FROM pagos WHERE reserva_id = ? LIMIT 1')
      .bind(reserva.id)
      .first();

    return Response.json({ reserva, pago: pago || null }, { status: 200, headers: SEC_HEADERS });
  }

  return Response.json(
    { error: 'Base de datos D1 no vinculada en modo estático' },
    { status: 404, headers: SEC_HEADERS }
  );
}
