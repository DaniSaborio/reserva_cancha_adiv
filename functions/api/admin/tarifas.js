// Cloudflare Pages Function / Worker — /api/admin/tarifas
// Permite al Tesorero y al Administrador consultar y actualizar los precios (por persona o por cancha) en Cloudflare D1

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0'
};

function verifyBearerJwt(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const rawToken = authHeader.slice(7).trim();
  const parts = rawToken.split('.');
  try {
    const payloadB64 = parts.length >= 2 ? parts[1] : parts[0];
    const jsonStr = decodeURIComponent(escape(atob(payloadB64)));
    const payload = JSON.parse(jsonStr);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload || !payload.exp || payload.exp < nowSec) return null;
    if (!['Administrador', 'Tesorero'].includes(payload.rol)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function ensureTarifasSchema(db) {
  if (!db) return;
  try {
    await db
      .prepare("ALTER TABLE canchas ADD COLUMN tipo_cobro TEXT NOT NULL DEFAULT 'por_persona'")
      .run();
  } catch {}
  try {
    await db
      .prepare('ALTER TABLE canchas ADD COLUMN precio_persona_diurna REAL NOT NULL DEFAULT 1500.0')
      .run();
  } catch {}
  try {
    await db
      .prepare('ALTER TABLE canchas ADD COLUMN precio_persona_nocturna REAL NOT NULL DEFAULT 1500.0')
      .run();
  } catch {}
}

function formatTarifaPayload(row) {
  const tipoCobro = row?.tipo_cobro === 'por_cancha' ? 'por_cancha' : 'por_persona';
  const tarifaDiurna = Number(row?.tarifa_diurna) > 0 ? Number(row.tarifa_diurna) : 16000;
  const tarifaNocturna = Number(row?.tarifa_nocturna) > 0 ? Number(row.tarifa_nocturna) : 16000;
  const precioPersonaDiurna =
    Number(row?.precio_persona_diurna) > 0 ? Number(row.precio_persona_diurna) : 1500;
  const precioPersonaNocturna =
    Number(row?.precio_persona_nocturna) > 0 ? Number(row.precio_persona_nocturna) : 1500;

  const activaDiurna = tipoCobro === 'por_persona' ? precioPersonaDiurna : tarifaDiurna;
  const activaNocturna = tipoCobro === 'por_persona' ? precioPersonaNocturna : tarifaNocturna;

  return {
    tipo_cobro: tipoCobro,
    tarifa_hora: activaNocturna,
    tarifa_diurna: tarifaDiurna,
    tarifa_nocturna: tarifaNocturna,
    precio_persona_diurna: precioPersonaDiurna,
    precio_persona_nocturna: precioPersonaNocturna,
    modo_diferenciado: activaDiurna !== activaNocturna
  };
}

export async function onRequestGet(context) {
  const { env } = context;
  let row = null;

  if (env && env.DB) {
    try {
      await ensureTarifasSchema(env.DB);
      row = await env.DB.prepare(
        'SELECT id, nombre, tarifa_diurna, tarifa_nocturna, tipo_cobro, precio_persona_diurna, precio_persona_nocturna, estado FROM canchas WHERE id = 1 LIMIT 1'
      ).first();
    } catch {}
  }

  return Response.json(formatTarifaPayload(row), { status: 200, headers: SEC_HEADERS });
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);

  // Tanto Tesorero como Administrador están autorizados a cambiar los precios de la cancha
  if (!claims || !['Administrador', 'Tesorero'].includes(claims.rol)) {
    return Response.json(
      { error: 'No autorizado. Se requiere rol de Tesorero o Administrador.' },
      { status: 403, headers: SEC_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const tipoCobro = body.tipo_cobro === 'por_cancha' ? 'por_cancha' : 'por_persona';
    const modoDiferenciado = Boolean(body.modo_diferenciado);
    const baseHora = Number(body.tarifa_hora);
    const rawDiurna = modoDiferenciado ? Number(body.tarifa_diurna) : baseHora;
    const rawNocturna = modoDiferenciado ? Number(body.tarifa_nocturna) : baseHora;

    const minMonto = tipoCobro === 'por_persona' ? 300 : 1000;
    const maxMonto = 250000;

    if (
      !Number.isFinite(rawDiurna) ||
      !Number.isFinite(rawNocturna) ||
      rawDiurna < minMonto ||
      rawDiurna > maxMonto ||
      rawNocturna < minMonto ||
      rawNocturna > maxMonto
    ) {
      return Response.json(
        {
          error: `Ingresá un monto válido entre ₡${minMonto.toLocaleString('es-CR')} y ₡${maxMonto.toLocaleString('es-CR')}.`
        },
        { status: 400, headers: SEC_HEADERS }
      );
    }

    const valorDiurno = Math.round(rawDiurna);
    const valorNocturno = Math.round(rawNocturna);

    if (env && env.DB) {
      await ensureTarifasSchema(env.DB);
      await env.DB.prepare(
        "INSERT OR IGNORE INTO canchas (id, nombre, tarifa_diurna, tarifa_nocturna, tipo_cobro, precio_persona_diurna, precio_persona_nocturna, estado) VALUES (1, 'Cancha Sintética Comunal — ADI Venecia', 16000, 16000, 'por_persona', 1500, 1500, 'activa')"
      ).run();

      if (tipoCobro === 'por_persona') {
        await env.DB.prepare(
          'UPDATE canchas SET tipo_cobro = ?, precio_persona_diurna = ?, precio_persona_nocturna = ? WHERE id = 1'
        )
          .bind(tipoCobro, valorDiurno, valorNocturno)
          .run();
      } else {
        await env.DB.prepare(
          'UPDATE canchas SET tipo_cobro = ?, tarifa_diurna = ?, tarifa_nocturna = ? WHERE id = 1'
        )
          .bind(tipoCobro, valorDiurno, valorNocturno)
          .run();
      }

      const updatedRow = await env.DB.prepare(
        'SELECT id, nombre, tarifa_diurna, tarifa_nocturna, tipo_cobro, precio_persona_diurna, precio_persona_nocturna, estado FROM canchas WHERE id = 1 LIMIT 1'
      ).first();

      return Response.json(
        {
          ok: true,
          ...formatTarifaPayload(updatedRow),
          actualizado_por: claims.username || claims.rol
        },
        { status: 200, headers: SEC_HEADERS }
      );
    }

    return Response.json(
      {
        ok: true,
        tipo_cobro: tipoCobro,
        tarifa_hora: valorNocturno,
        tarifa_diurna: tipoCobro === 'por_cancha' ? valorDiurno : 16000,
        tarifa_nocturna: tipoCobro === 'por_cancha' ? valorNocturno : 16000,
        precio_persona_diurna: tipoCobro === 'por_persona' ? valorDiurno : 1500,
        precio_persona_nocturna: tipoCobro === 'por_persona' ? valorNocturno : 1500,
        modo_diferenciado: valorDiurno !== valorNocturno,
        actualizado_por: claims.username || claims.rol
      },
      { status: 200, headers: SEC_HEADERS }
    );
  } catch {
    return Response.json(
      { error: 'No se pudo actualizar la tarifa de la cancha.' },
      { status: 400, headers: SEC_HEADERS }
    );
  }
}
