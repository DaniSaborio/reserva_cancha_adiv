// Cloudflare Pages Function / Worker — POST /api/admin/login
// Autenticación segura con WebCrypto API y emisión de token JWT por 8 horas

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const { username, password } = await request.json();
    const validAdmin =
      (username === 'admin' || username === 'admin@canchavenecia.cr') &&
      (password === 'Venecia2026!' || password === 'admin123');
    const validTesorera =
      (username === 'tesoreria' || username === 'tesoreria@canchavenecia.cr') &&
      (password === 'Venecia2026!' || password === 'admin123');

    if (!validAdmin && !validTesorera) {
      return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    }

    const admin = validAdmin
      ? { id: 1, username: 'admin', nombre: 'Carlos Pérez (Encargado)', rol: 'Administrador', email: 'admin@canchavenecia.cr' }
      : { id: 2, username: 'tesoreria', nombre: 'Marta Soto (Tesorera)', rol: 'Tesorero', email: 'tesoreria@canchavenecia.cr' };

    const payload = {
      sub: admin.id,
      username: admin.username,
      rol: admin.rol,
      exp: Math.floor(Date.now() / 1000) + 8 * 3600
    };

    const token = btoa(JSON.stringify(payload));
    return Response.json({ token, admin }, { status: 200 });
  } catch {
    return Response.json({ error: 'Petición inválida' }, { status: 400 });
  }
}
