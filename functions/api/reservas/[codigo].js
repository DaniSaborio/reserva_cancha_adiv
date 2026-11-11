// Cloudflare Pages Function / Worker — GET /api/reservas/:codigo
// Consulta detalles y estado de una reserva por código único o teléfono

export async function onRequestGet(context) {
  const { params, env } = context;
  const codigo = (params?.codigo || '').trim();

  if (!codigo) {
    return Response.json({ error: 'Código o teléfono requerido' }, { status: 400 });
  }

  if (env && env.DB) {
    const reserva = await env.DB.prepare(
      'SELECT * FROM reservas WHERE UPPER(codigo_reserva) = UPPER(?) OR cliente_telefono = ? ORDER BY id DESC LIMIT 1'
    )
      .bind(codigo, codigo)
      .first();

    if (!reserva) {
      return Response.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    const pago = await env.DB.prepare('SELECT * FROM pagos WHERE reserva_id = ? LIMIT 1')
      .bind(reserva.id)
      .first();

    return Response.json({ reserva, pago: pago || null }, { status: 200 });
  }

  return Response.json({ error: 'Base de datos D1 no vinculada en modo estático' }, { status: 404 });
}
