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
  { hora_inicio: '16:00', hora_fin: '17:00', label: '16:00–17:00', precio: 16000 },
  { hora_inicio: '17:00', hora_fin: '18:00', label: '17:00–18:00', precio: 16000 },
  { hora_inicio: '18:00', hora_fin: '19:00', label: '18:00–19:00', precio: 16000 },
  { hora_inicio: '19:00', hora_fin: '20:00', label: '19:00–20:00', precio: 16000 },
  { hora_inicio: '20:00', hora_fin: '21:00', label: '20:00–21:00', precio: 16000 },
  { hora_inicio: '21:00', hora_fin: '22:00', label: '21:00–22:00', precio: 16000 },
  { hora_inicio: '22:00', hora_fin: '23:00', label: '22:00–23:00', precio: 16000 }
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const fecha = url.searchParams.get('fecha');
  const desde = url.searchParams.get('desde');
  const hasta = url.searchParams.get('hasta');

  let tarifaDiurna = 16000;
  let tarifaNocturna = 16000;
  if (env && env.DB) {
    try {
      const canchaRow = await env.DB.prepare(
        'SELECT tarifa_diurna, tarifa_nocturna FROM canchas WHERE id = 1 LIMIT 1'
      ).first();
      if (canchaRow) {
        if (Number(canchaRow.tarifa_diurna) > 0) tarifaDiurna = Number(canchaRow.tarifa_diurna);
        if (Number(canchaRow.tarifa_nocturna) > 0) tarifaNocturna = Number(canchaRow.tarifa_nocturna);
      }
    } catch {}
  }

  const franjasConPrecio = FRANJAS_OFICIALES.map((f) => ({
    ...f,
    precio: f.hora_inicio === '16:00' || f.hora_inicio === '17:00' ? tarifaDiurna : tarifaNocturna
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
          tarifa_diurna: tarifaDiurna,
          tarifa_nocturna: tarifaNocturna
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
