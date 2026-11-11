// Cloudflare Pages Function / Worker — POST /api/admin/pagos
// Registra y concilia pago en Efectivo o SINPE Móvil y cambia estado de reserva a 'Confirmada'

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { reserva_id, metodo, monto, comprobante } = await request.json();
    if (!reserva_id || !metodo) {
      return Response.json({ error: 'Datos de pago incompletos' }, { status: 400 });
    }

    if (env && env.DB) {
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO pagos (reserva_id, metodo_pago, monto, numero_comprobante) VALUES (?, ?, ?, ?)'
        ).bind(reserva_id, metodo, monto || 16000, comprobante || null),
        env.DB.prepare("UPDATE reservas SET estado = 'Confirmada' WHERE id = ?").bind(reserva_id)
      ]);
    }

    return Response.json({ id_pago: Date.now(), status: 'Confirmada' }, { status: 201 });
  } catch {
    return Response.json({ error: 'Error al registrar el pago' }, { status: 400 });
  }
}
