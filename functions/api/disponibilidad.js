// Cloudflare Pages Function / Worker — GET /api/disponibilidad?fecha=YYYY-MM-DD
// Consulta en Cloudflare D1 las reservas y bloqueos de una fecha y retorna las 7 franjas (16:00 a 23:00)
// Nota de privacidad (OWASP A01 / A04): Nunca expone cliente_nombre ni cliente_telefono en el calendario público.

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0'
};

const FRANJAS_OFICIALES = [
  { hora_inicio: '16:00', hora_fin: '17:00', label: '4:00 PM – 5:00 PM', precio: 1500 },
  { hora_inicio: '17:00', hora_fin: '18:00', label: '5:00 PM – 6:00 PM', precio: 1500 },
  { hora_inicio: '18:00', hora_fin: '19:00', label: '6:00 PM – 7:00 PM', precio: 1500 },
  { hora_inicio: '19:00', hora_fin: '20:00', label: '7:00 PM – 8:00 PM', precio: 1500 },
  { hora_inicio: '20:00', hora_fin: '21:00', label: '8:00 PM – 9:00 PM', precio: 1500 },
  { hora_inicio: '21:00', hora_fin: '22:00', label: '9:00 PM – 10:00 PM', precio: 1500 },
  { hora_inicio: '22:00', hora_fin: '23:00', label: '10:00 PM – 11:00 PM', precio: 1500 }
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const fecha = url.searchParams.get('fecha');
  const desde = url.searchParams.get('desde');
  const hasta = url.searchParams.get('hasta');

  let tipoCobro = 'por_persona';
  let precioDiurno = 1500;
  let precioNocturno = 1500;
  let maxJugadores = 16;

  if (env && env.DB) {
    try {
      await env.DB.prepare(
        "ALTER TABLE canchas ADD COLUMN tipo_cobro TEXT NOT NULL DEFAULT 'por_persona'"
      ).run();
    } catch {}
    try {
      await env.DB.prepare(
        'ALTER TABLE canchas ADD COLUMN precio_persona_diurna REAL NOT NULL DEFAULT 1500.0'
      ).run();
    } catch {}
    try {
      await env.DB.prepare(
        'ALTER TABLE canchas ADD COLUMN precio_persona_nocturna REAL NOT NULL DEFAULT 1500.0'
      ).run();
    } catch {}
    try {
      await env.DB.prepare(
        'ALTER TABLE canchas ADD COLUMN max_jugadores INTEGER NOT NULL DEFAULT 16'
      ).run();
    } catch {}

    try {
      const canchaRow = await env.DB.prepare(
        'SELECT tarifa_diurna, tarifa_nocturna, tipo_cobro, precio_persona_diurna, precio_persona_nocturna, max_jugadores FROM canchas WHERE id = 1 LIMIT 1'
      ).first();
      if (canchaRow) {
        tipoCobro = canchaRow.tipo_cobro === 'por_cancha' ? 'por_cancha' : 'por_persona';
        maxJugadores = Number(canchaRow.max_jugadores) >= 2 ? Number(canchaRow.max_jugadores) : 16;
        if (tipoCobro === 'por_cancha') {
          precioDiurno = Number(canchaRow.tarifa_diurna) > 0 ? Number(canchaRow.tarifa_diurna) : 16000;
          precioNocturno =
            Number(canchaRow.tarifa_nocturna) > 0 ? Number(canchaRow.tarifa_nocturna) : 16000;
        } else {
          precioDiurno =
            Number(canchaRow.precio_persona_diurna) > 0
              ? Number(canchaRow.precio_persona_diurna)
              : 1500;
          precioNocturno =
            Number(canchaRow.precio_persona_nocturna) > 0
              ? Number(canchaRow.precio_persona_nocturna)
              : 1500;
        }
      }
    } catch {}
  }

  const franjasConPrecio = FRANJAS_OFICIALES.map((f) => ({
    ...f,
    tipo_cobro: tipoCobro,
    max_jugadores: maxJugadores,
    precio: f.hora_inicio === '16:00' || f.hora_inicio === '17:00' ? precioDiurno : precioNocturno
  }));

  // Soporte para consulta de rango de fechas (Vista Semanal / Mensual)
  if (desde && hasta && /^\d{4}-\d{2}-\d{2}$/.test(desde) && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    if (env && env.DB) {
      const reservasRes = await env.DB.prepare(
        "SELECT fecha_reserva, hora_inicio, estado FROM reservas WHERE fecha_reserva >= ? AND fecha_reserva <= ? AND estado != 'Cancelada'"
      )
        .bind(desde, hasta)
        .all();

      const bloqueosRes = await env.DB.prepare(
        'SELECT fecha, hora_inicio, motivo FROM bloqueos_horario WHERE fecha >= ? AND fecha <= ?'
      )
        .bind(desde, hasta)
        .all();

      return Response.json(
        {
          reservas: reservasRes.results || [],
          bloqueos: bloqueosRes.results || [],
          tipo_cobro: tipoCobro,
          precio_diurno: precioDiurno,
          precio_nocturno: precioNocturno
        },
        { status: 200, headers: SEC_HEADERS }
      );
    }
  }

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return Response.json(
      { error: 'Fecha inválida. Use formato YYYY-MM-DD' },
      { status: 400, headers: SEC_HEADERS }
    );
  }

  if (env && env.DB) {
    const reservasRes = await env.DB.prepare(
      "SELECT hora_inicio, estado FROM reservas WHERE fecha_reserva = ? AND estado != 'Cancelada'"
    )
      .bind(fecha)
      .all();

    const bloqueosRes = await env.DB.prepare(
      'SELECT hora_inicio, motivo FROM bloqueos_horario WHERE fecha = ?'
    )
      .bind(fecha)
      .all();

    const reservasMap = new Map(
      (reservasRes.results || []).map((r) => [r.hora_inicio, r.estado])
    );
    const bloqueosMap = new Map(
      (bloqueosRes.results || []).map((b) => [b.hora_inicio, b.motivo])
    );

    const resultado = franjasConPrecio.map((f) => {
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

    return Response.json(resultado, { status: 200, headers: SEC_HEADERS });
  }

  return Response.json(
    franjasConPrecio.map((f) => ({ ...f, estado: 'Disponible' })),
    { status: 200, headers: SEC_HEADERS }
  );
}
