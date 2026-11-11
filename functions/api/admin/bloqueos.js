// Cloudflare Pages Function / Worker — POST /api/admin/bloqueos
// Bloquea franjas horarias por mantenimiento de césped, iluminación o torneos comunales

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { fecha, hora_inicio, hora_fin, motivo } = await request.json();
    if (!fecha || !hora_inicio || !motivo) {
      return Response.json({ error: 'Datos de bloqueo incompletos' }, { status: 400 });
    }

    if (env && env.DB) {
      const res = await env.DB.prepare(
        'INSERT INTO bloqueos_horario (cancha_id, fecha, hora_inicio, hora_fin, motivo, usuario_id) VALUES (1, ?, ?, ?, ?, 1)'
      )
        .bind(fecha, hora_inicio, hora_fin || '17:00', motivo)
        .run();

      return Response.json({ id_bloqueo: res.meta?.last_row_id || Date.now() }, { status: 201 });
    }

    return Response.json({ id_bloqueo: Date.now() }, { status: 201 });
  } catch {
    return Response.json({ error: 'Conflicto al bloquear horario' }, { status: 409 });
  }
}
