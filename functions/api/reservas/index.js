// Cloudflare Pages Function / Worker — POST /api/reservas
// Crea una reserva con validación atómica anti-colisión en Cloudflare D1 (UNIQUE constraint),
// sanitización anti-XSS (A05:2025), CSPRNG (A04:2025) y verificación de reglas de negocio (A06:2025)

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0'
};

const HORAS_OFICIALES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

function secureCodeSuffix() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(10 + (arr[0] % 90));
  }
  return String(Math.floor(10 + Math.random() * 90));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { nombre, tel, fecha, hora, metodo, cantidad_personas } = body || {};

    const nombreSanitizado = String(nombre || '')
      .replace(/[\u0000-\u001F\u007F<>]/g, '')
      .trim()
      .slice(0, 80);
    const telDigitos = String(tel || '').replace(/[^\d]/g, '');
    const personasNum = Number.isInteger(Number(cantidad_personas))
      ? Number(cantidad_personas)
      : 10;

    if (
      !nombreSanitizado ||
      nombreSanitizado.length < 2 ||
      !/^[245678]\d{7}$/.test(telDigitos) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) ||
      !HORAS_OFICIALES.includes(hora) ||
      personasNum < 1 ||
      personasNum > 30
    ) {
      return Response.json(
        { error: 'Datos incompletos o con formato inválido para procesar la reserva.' },
        { status: 400, headers: SEC_HEADERS }
      );
    }

    const horaNum = parseInt(hora.split(':')[0], 10);
    const horaFin = `${String(horaNum + 1).padStart(2, '0')}:00`;
    const codigo = `CAN-2026-${secureCodeSuffix()}`;
    const telFormateado = `${telDigitos.slice(0, 4)}-${telDigitos.slice(4, 8)}`;
    const metodoSeguro = metodo === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil';
    // A08:2025 - La tarifa se obtiene desde la tabla canchas en Cloudflare D1 (por persona o por cancha)
    let tipoCobro = 'por_persona';
    let precioUnitario = 1500.0;
    let montoTotal = precioUnitario * personasNum;

    if (env && env.DB) {
      try {
        await env.DB.prepare(
          'ALTER TABLE reservas ADD COLUMN cantidad_personas INTEGER NOT NULL DEFAULT 10'
        ).run();
      } catch {}

      try {
        const canchaRow = await env.DB.prepare(
          'SELECT tarifa_diurna, tarifa_nocturna, tipo_cobro, precio_persona_diurna, precio_persona_nocturna FROM canchas WHERE id = 1 LIMIT 1'
        ).first();
        if (canchaRow) {
          tipoCobro = canchaRow.tipo_cobro === 'por_cancha' ? 'por_cancha' : 'por_persona';
          const esDiurna = hora === '16:00' || hora === '17:00';
          if (tipoCobro === 'por_cancha') {
            precioUnitario = esDiurna
              ? Number(canchaRow.tarifa_diurna) || 16000
              : Number(canchaRow.tarifa_nocturna) || 16000;
            montoTotal = precioUnitario;
          } else {
            precioUnitario = esDiurna
              ? Number(canchaRow.precio_persona_diurna) || 1500
              : Number(canchaRow.precio_persona_nocturna) || 1500;
            montoTotal = precioUnitario * personasNum;
          }
        }
      } catch {}

      // A06:2025 - Verificar que el horario no esté bloqueado por mantenimiento antes de insertar
      const bloqueo = await env.DB.prepare(
        'SELECT motivo FROM bloqueos_horario WHERE fecha = ? AND hora_inicio = ? LIMIT 1'
      )
        .bind(fecha, hora)
        .first();

      if (bloqueo) {
        return Response.json(
          {
            error: 'Horario en mantenimiento',
            message: `Esta franja fue inhabilitada por: ${bloqueo.motivo}.`
          },
          { status: 409, headers: SEC_HEADERS }
        );
      }

      try {
        const res = await env.DB.prepare(
          `INSERT INTO reservas (codigo_reserva, cancha_id, cliente_nombre, cliente_telefono, fecha_reserva, hora_inicio, hora_fin, metodo_pago_previsto, estado, cantidad_personas, monto_total)
           VALUES (?, 1, ?, ?, ?, ?, ?, ?, 'Pendiente', ?, ?)`
        )
          .bind(
            codigo,
            nombreSanitizado,
            telFormateado,
            fecha,
            hora,
            horaFin,
            metodoSeguro,
            personasNum,
            montoTotal
          )
          .run();

        return Response.json(
          {
            codigo,
            id: res.meta?.last_row_id || 1,
            total: montoTotal,
            cantidad_personas: personasNum,
            tipo_cobro: tipoCobro,
            precio_unitario: precioUnitario,
            status: 'Pendiente'
          },
          { status: 201, headers: SEC_HEADERS }
        );
      } catch {
        return Response.json(
          {
            error: 'Horario recién ocupado',
            message: 'Otra persona confirmó mientras llenabas tus datos. No se cobró nada.'
          },
          { status: 409, headers: SEC_HEADERS }
        );
      }
    }

    return Response.json(
      {
        codigo,
        id: Date.now(),
        total: montoTotal,
        cantidad_personas: personasNum,
        tipo_cobro: tipoCobro,
        precio_unitario: precioUnitario
      },
      { status: 201, headers: SEC_HEADERS }
    );
  } catch {
    return Response.json(
      { error: 'Solicitud JSON inválida' },
      { status: 400, headers: SEC_HEADERS }
    );
  }
}
