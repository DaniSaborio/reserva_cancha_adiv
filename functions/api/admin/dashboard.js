// Cloudflare Pages Function / Worker — GET /api/admin/dashboard
// Retorna consolidado financiero (Total, Efectivo, SINPE) y listado de reservas

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return Response.json({ error: 'No autorizado (401 Unauthorized)' }, { status: 401 });
  }

  if (env && env.DB) {
    const pagos = await env.DB.prepare(
      'SELECT metodo_pago, SUM(monto) as total FROM pagos GROUP BY metodo_pago'
    ).all();
    const reservas = await env.DB.prepare(
      'SELECT * FROM reservas ORDER BY fecha_reserva DESC, hora_inicio ASC LIMIT 50'
    ).all();

    let sinpe = 0;
    let efectivo = 0;
    for (const row of pagos.results || []) {
      if (row.metodo_pago === 'SINPE Móvil') sinpe += Number(row.total || 0);
      if (row.metodo_pago === 'Efectivo') efectivo += Number(row.total || 0);
    }

    return Response.json(
      {
        ingresos_total: sinpe + efectivo,
        sinpe,
        efectivo,
        reservas: reservas.results || []
      },
      { status: 200 }
    );
  }

  return Response.json({ ingresos_total: 64000, sinpe: 32000, efectivo: 32000, reservas: [] }, { status: 200 });
}
