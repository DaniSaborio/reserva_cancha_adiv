// Cloudflare Pages Function / Worker — /api/admin/tarifas
// Permite al Tesorero y al Administrador consultar y actualizar los precios por hora de la cancha en Cloudflare D1

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

export async function onRequestGet(context) {
  const { env } = context;
  let tarifaDiurna = 16000;
  let tarifaNocturna = 16000;

  if (env && env.DB) {
    try {
      const row = await env.DB.prepare(
        'SELECT id, nombre, tarifa_diurna, tarifa_nocturna, estado FROM canchas WHERE id = 1 LIMIT 1'
      ).first();
      if (row) {
        tarifaDiurna = Number(row.tarifa_diurna) > 0 ? Number(row.tarifa_diurna) : 16000;
        tarifaNocturna = Number(row.tarifa_nocturna) > 0 ? Number(row.tarifa_nocturna) : 16000;
      }
    } catch {}
  }

  return Response.json(
    {
      tarifa_hora: tarifaNocturna,
      tarifa_diurna: tarifaDiurna,
      tarifa_nocturna: tarifaNocturna,
      modo_diferenciado: tarifaDiurna !== tarifaNocturna
    },
    { status: 200, headers: SEC_HEADERS }
  );
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
    const modoDiferenciado = Boolean(body.modo_diferenciado);
    const baseHora = Number(body.tarifa_hora);
    const rawDiurna = modoDiferenciado ? Number(body.tarifa_diurna) : baseHora;
    const rawNocturna = modoDiferenciado ? Number(body.tarifa_nocturna) : baseHora;

    if (
      !Number.isFinite(rawDiurna) ||
      !Number.isFinite(rawNocturna) ||
      rawDiurna < 1000 ||
      rawDiurna > 250000 ||
      rawNocturna < 1000 ||
      rawNocturna > 250000
    ) {
      return Response.json(
        { error: 'Ingresá un monto válido entre ₡1 000 y ₡250 000 por hora.' },
        { status: 400, headers: SEC_HEADERS }
      );
    }

    const tarifaDiurna = Math.round(rawDiurna);
    const tarifaNocturna = Math.round(rawNocturna);

    if (env && env.DB) {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO canchas (id, nombre, tarifa_diurna, tarifa_nocturna, estado) VALUES (1, 'Cancha Sintética Comunal — ADI Venecia', 16000, 16000, 'activa')"
      ).run();

      await env.DB.prepare(
        'UPDATE canchas SET tarifa_diurna = ?, tarifa_nocturna = ? WHERE id = 1'
      )
        .bind(tarifaDiurna, tarifaNocturna)
        .run();
    }

    return Response.json(
      {
        ok: true,
        tarifa_hora: tarifaNocturna,
        tarifa_diurna: tarifaDiurna,
        tarifa_nocturna: tarifaNocturna,
        modo_diferenciado: tarifaDiurna !== tarifaNocturna,
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
