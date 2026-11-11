// Cloudflare Pages Function / Worker — POST /api/reservas
// Crea una reserva con validación atómica anti-colisión en Cloudflare D1 (UNIQUE constraint)

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { nombre, tel, fecha, hora, metodo } = body || {};

    if (!nombre || !tel || !fecha || !hora) {
      return Response.json({ error: 'Datos incompletos para procesar la reserva.' }, { status: 400 });
    }

    const horaNum = parseInt(hora.split(':')[0], 10);
    const horaFin = `${String(horaNum + 1).padStart(2, '0')}:00`;
    const codigo = `CAN-2026-${String(Math.floor(10 + Math.random() * 89))}`;
    const montoTotal = 16000.0;

    if (env && env.DB) {
      try {
        const res = await env.DB.prepare(
          `INSERT INTO reservas (codigo_reserva, cancha_id, cliente_nombre, cliente_telefono, fecha_reserva, hora_inicio, hora_fin, metodo_pago_previsto, estado, monto_total)
           VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)`
        )
          .bind(codigo, nombre.trim(), tel.trim(), fecha, hora, horaFin, metodo || 'SINPE Móvil', montoTotal)
          .run();

        return Response.json(
          { codigo, id: res.meta?.last_row_id || 1, total: montoTotal, status: 'Pendiente' },
          { status: 201 }
        );
      } catch (dbErr) {
        return Response.json(
          {
            error: 'Horario recién ocupado',
            message: 'Otra persona confirmó mientras llenabas tus datos. No se cobró nada.'
          },
          { status: 409 }
        );
      }
    }

    return Response.json({ codigo, id: Date.now(), total: montoTotal }, { status: 201 });
  } catch {
    return Response.json({ error: 'Solicitud JSON inválida' }, { status: 400 });
  }
}
