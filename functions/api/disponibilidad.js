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
  { hora_inicio: '16:00', hora_fin: '17:00', precio: 16000 },
  { hora_inicio: '17:00', hora_fin: '18:00', precio: 16000 },
  { hora_inicio: '18:00', hora_fin: '19:00', precio: 16000 },
  { hora_inicio: '19:00', hora_fin: '20:00', precio: 16000 },
  { hora_inicio: '20:00', hora_fin: '21:00', precio: 16000 },
  { hora_inicio: '21:00', hora_fin: '22:00', precio: 16000 },
  { hora_inicio: '22:00', hora_fin: '23:00', precio: 16000 }
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const fecha = url.searchParams.get('fecha');

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

    const resultado = FRANJAS_OFICIALES.map((f) => {
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
    FRANJAS_OFICIALES.map((f) => ({ ...f, estado: 'Disponible' })),
    { status: 200, headers: SEC_HEADERS }
  );
}
