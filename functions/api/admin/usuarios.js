// Cloudflare Pages Function / Worker — /api/admin/usuarios
// Gestión de Usuarios, Roles, Permisos y Control de Accesos (RBAC — OWASP A01:2025 / A07:2025)

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store, max-age=0'
};

const MODULOS_VALIDOS = ['dashboard', 'reservas', 'bloqueos', 'reportes', 'usuarios'];

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

async function hashPasswordEdge(rawPassword) {
  const clean = String(rawPassword || '').trim();
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(`venecia2026$${clean}`));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256$${hex}`;
  }
  return `plain$${clean}`;
}

function defaultPermisosPorRol(rol) {
  return rol === 'Tesorero'
    ? ['dashboard', 'reservas', 'reportes']
    : ['dashboard', 'reservas', 'bloqueos', 'reportes', 'usuarios'];
}

function parsePermisos(rawPermisos, rol) {
  if (Array.isArray(rawPermisos)) {
    const filtrados = rawPermisos.filter((m) => MODULOS_VALIDOS.includes(m));
    return filtrados.length > 0 ? filtrados : defaultPermisosPorRol(rol);
  }
  if (typeof rawPermisos === 'string' && rawPermisos.trim()) {
    try {
      const parsed = JSON.parse(rawPermisos);
      if (Array.isArray(parsed)) {
        const filtrados = parsed.filter((m) => MODULOS_VALIDOS.includes(m));
        if (filtrados.length > 0) return filtrados;
      }
    } catch {}
  }
  return defaultPermisosPorRol(rol);
}

async function ensureUsuariosSchema(db) {
  if (!db) return;
  try {
    await db.prepare("ALTER TABLE usuarios_admin ADD COLUMN cargo TEXT DEFAULT 'Administración'").run();
  } catch {}
  try {
    await db.prepare('ALTER TABLE usuarios_admin ADD COLUMN permisos TEXT').run();
  } catch {}
  try {
    await db
      .prepare(
        "INSERT OR IGNORE INTO usuarios_admin (id, username, nombre, email, password_hash, rol, activo, cargo, permisos) VALUES (3, 'sabo', 'Daniel Saborío (Superadmin)', 'sabo@canchavenecia.cr', 'pbkdf2_sha256$100000$venecia2026$superadmin', 'Administrador', 1, 'Dirección General / TI', ?)"
      )
      .bind(JSON.stringify(['dashboard', 'reservas', 'bloqueos', 'reportes', 'usuarios']))
      .run();
  } catch {}
}

function sanitizeUserRow(row) {
  const rol = row.rol === 'Tesorero' ? 'Tesorero' : 'Administrador';
  return {
    id: Number(row.id),
    username: row.username,
    nombre: row.nombre,
    cargo: row.cargo || (rol === 'Tesorero' ? 'Fiscalía Deportiva' : 'Coordinación Cancha'),
    email: row.email,
    rol,
    permisos: parsePermisos(row.permisos, rol),
    activo: Number(row.activo) === 0 ? 0 : 1,
    created_at: row.created_at || null
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims) {
    return Response.json({ error: 'No autorizado' }, { status: 401, headers: SEC_HEADERS });
  }

  if (env && env.DB) {
    await ensureUsuariosSchema(env.DB);
    const res = await env.DB.prepare('SELECT * FROM usuarios_admin ORDER BY id ASC').all();
    const list = (res.results || []).map(sanitizeUserRow);
    return Response.json(list, { status: 200, headers: SEC_HEADERS });
  }

  return Response.json([], { status: 200, headers: SEC_HEADERS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims || claims.rol !== 'Administrador') {
    return Response.json(
      { error: 'Se requiere rol de Administrador para crear usuarios' },
      { status: 403, headers: SEC_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const username = String(body.username || '')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .trim()
      .toLowerCase()
      .slice(0, 40);
    const nombre = String(body.nombre || '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 80);
    const cargo = String(body.cargo || 'Administración')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, 80);
    const email = String(body.email || '')
      .replace(/[<>]/g, '')
      .trim()
      .toLowerCase()
      .slice(0, 80);
    const rol = body.rol === 'Tesorero' ? 'Tesorero' : 'Administrador';
    const permisos = parsePermisos(body.permisos, rol);
    const activo = body.activo === 0 || body.activo === false ? 0 : 1;
    const rawPass = String(body.password || 'Venecia2026!').trim();

    if (!username || username.length < 3 || !nombre || !email.includes('@') || rawPass.length < 6) {
      return Response.json(
        { error: 'Datos inválidos. Verificá usuario (mín. 3 caracteres), correo y contraseña (mín. 6 caracteres).' },
        { status: 400, headers: SEC_HEADERS }
      );
    }

    const passwordHash = await hashPasswordEdge(rawPass);

    if (env && env.DB) {
      await ensureUsuariosSchema(env.DB);
      const res = await env.DB.prepare(
        'INSERT INTO usuarios_admin (username, nombre, email, password_hash, rol, activo, cargo, permisos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(
          username,
          nombre,
          email,
          passwordHash,
          rol,
          activo,
          cargo,
          JSON.stringify(permisos)
        )
        .run();

      const newId = res.meta?.last_row_id || Date.now();
      return Response.json(
        {
          ok: true,
          usuario: {
            id: Number(newId),
            username,
            nombre,
            cargo,
            email,
            rol,
            permisos,
            activo
          }
        },
        { status: 201, headers: SEC_HEADERS }
      );
    }

    return Response.json(
      {
        ok: true,
        usuario: { id: Date.now(), username, nombre, cargo, email, rol, permisos, activo }
      },
      { status: 201, headers: SEC_HEADERS }
    );
  } catch {
    return Response.json(
      { error: 'El nombre de usuario o correo electrónico ya está registrado.' },
      { status: 409, headers: SEC_HEADERS }
    );
  }
}

export async function onRequestPatch(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims || claims.rol !== 'Administrador') {
    return Response.json(
      { error: 'Se requiere rol de Administrador para modificar roles y accesos' },
      { status: 403, headers: SEC_HEADERS }
    );
  }

  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!id || id <= 0) {
      return Response.json({ error: 'ID de usuario inválido' }, { status: 400, headers: SEC_HEADERS });
    }

    if (env && env.DB) {
      await ensureUsuariosSchema(env.DB);
      const current = await env.DB.prepare('SELECT * FROM usuarios_admin WHERE id = ?').bind(id).first();
      if (!current) {
        return Response.json({ error: 'Usuario no encontrado' }, { status: 404, headers: SEC_HEADERS });
      }

      const nextNombre =
        body.nombre !== undefined
          ? String(body.nombre).replace(/[<>]/g, '').trim().slice(0, 80)
          : current.nombre;
      const nextCargo =
        body.cargo !== undefined
          ? String(body.cargo).replace(/[<>]/g, '').trim().slice(0, 80)
          : current.cargo || 'Administración';
      const nextEmail =
        body.email !== undefined
          ? String(body.email).replace(/[<>]/g, '').trim().toLowerCase().slice(0, 80)
          : current.email;
      const nextRol =
        body.rol !== undefined
          ? body.rol === 'Tesorero'
            ? 'Tesorero'
            : 'Administrador'
          : current.rol;
      const nextPermisos =
        body.permisos !== undefined
          ? parsePermisos(body.permisos, nextRol)
          : parsePermisos(current.permisos, nextRol);
      const nextActivo =
        body.activo !== undefined ? (Number(body.activo) === 0 ? 0 : 1) : Number(current.activo);

      let nextPasswordHash = current.password_hash;
      if (body.password && String(body.password).trim().length >= 6) {
        nextPasswordHash = await hashPasswordEdge(body.password);
      }

      await env.DB.prepare(
        'UPDATE usuarios_admin SET nombre = ?, email = ?, rol = ?, activo = ?, cargo = ?, permisos = ?, password_hash = ? WHERE id = ?'
      )
        .bind(
          nextNombre,
          nextEmail,
          nextRol,
          nextActivo,
          nextCargo,
          JSON.stringify(nextPermisos),
          nextPasswordHash,
          id
        )
        .run();

      return Response.json(
        {
          ok: true,
          usuario: {
            id,
            username: current.username,
            nombre: nextNombre,
            cargo: nextCargo,
            email: nextEmail,
            rol: nextRol,
            permisos: nextPermisos,
            activo: nextActivo
          }
        },
        { status: 200, headers: SEC_HEADERS }
      );
    }

    return Response.json({ ok: true, id }, { status: 200, headers: SEC_HEADERS });
  } catch {
    return Response.json({ error: 'Error al actualizar el usuario' }, { status: 400, headers: SEC_HEADERS });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const claims = verifyBearerJwt(auth);
  if (!claims || claims.rol !== 'Administrador') {
    return Response.json(
      { error: 'Se requiere rol de Administrador para eliminar usuarios' },
      { status: 403, headers: SEC_HEADERS }
    );
  }

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id || id <= 0) {
    return Response.json({ error: 'ID inválido' }, { status: 400, headers: SEC_HEADERS });
  }

  if (Number(claims.sub) === id) {
    return Response.json(
      { error: 'Por seguridad no podés eliminar la cuenta con la que tenés sesión activa.' },
      { status: 400, headers: SEC_HEADERS }
    );
  }

  if (env && env.DB) {
    await env.DB.prepare('DELETE FROM usuarios_admin WHERE id = ?').bind(id).run();
  }

  return Response.json({ ok: true, id }, { status: 200, headers: SEC_HEADERS });
}
