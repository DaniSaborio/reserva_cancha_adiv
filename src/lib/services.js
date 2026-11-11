// =============================================================================
// Implementación del Diagrama de Clases UML del Dominio (Sección 12.1)
// Clases: ReservaService, PagoService, AgendaManager, DashboardController, AuthMiddleware
// =============================================================================

import { CanchaDB } from './db';

/**
 * «Service» ReservaService
 * Métodos: verificarDisponibilidad(fecha), crearReserva(dto), consultarPorCodigo(codigo),
 *          consultarPorTelefono(tel), cancelarReserva(id, motivo), reprogramarReserva(...)
 */
export class ReservaService {
  static verificarDisponibilidad(fecha) {
    const db = CanchaDB.load();
    const reservasFecha = db.reservas.filter(
      (r) => r.fecha_reserva === fecha && r.estado !== 'Cancelada'
    );
    const bloqueosFecha = db.bloqueos_horario.filter((b) => b.fecha === fecha);

    return db.franjas_oficiales.map((franja) => {
      const bloqueo = bloqueosFecha.find((b) => b.hora_inicio === franja.hora_inicio);
      if (bloqueo) {
        return {
          ...franja,
          fecha,
          estado: 'Mantenimiento',
          disponible: false,
          motivo_bloqueo: bloqueo.motivo,
          bloqueo_id: bloqueo.id
        };
      }

      const reserva = reservasFecha.find((r) => r.hora_inicio === franja.hora_inicio);
      if (reserva) {
        const esConfirmada = reserva.estado === 'Confirmada';
        return {
          ...franja,
          fecha,
          estado: esConfirmada ? 'Ocupado' : 'En proceso',
          disponible: false,
          reserva_estado: reserva.estado
        };
      }

      return {
        ...franja,
        fecha,
        estado: 'Libre',
        disponible: true
      };
    });
  }

  static obtenerAlternativasDisponibles(fecha, horaExcluida) {
    const todas = this.verificarDisponibilidad(fecha);
    return todas.filter((f) => f.disponible && f.hora_inicio !== horaExcluida);
  }

  /**
   * Crea una reserva aplicando validación transaccional atómica anti-colisión
   * Restricción: UNIQUE(cancha_id, fecha_reserva, hora_inicio)
   */
  static crearReserva(dto) {
    const { nombre, telefono, fecha, hora_inicio, metodo_pago } = dto || {};

    if (!nombre || !nombre.trim()) {
      return { ok: false, status: 400, error: 'Por favor ingresá tu nombre o el nombre de tu equipo.' };
    }

    const telLimpio = String(telefono || '').replace(/[^\d]/g, '');
    if (telLimpio.length < 8) {
      return {
        ok: false,
        status: 400,
        error: 'Por favor ingresá un número de teléfono válido de Costa Rica (8 dígitos).'
      };
    }

    if (!fecha || !hora_inicio) {
      return { ok: false, status: 400, error: 'Debés seleccionar una fecha y una franja horaria.' };
    }

    const db = CanchaDB.load();

    // 1. Verificar colisión contra bloqueos de mantenimiento
    const bloqueoExistente = db.bloqueos_horario.find(
      (b) => b.fecha === fecha && b.hora_inicio === hora_inicio
    );
    if (bloqueoExistente) {
      return {
        ok: false,
        status: 409,
        code: 'COLLISION',
        error: 'Horario en mantenimiento',
        message: `Esta franja fue inhabilitada por: ${bloqueoExistente.motivo}.`,
        alternativas: this.obtenerAlternativasDisponibles(fecha, hora_inicio)
      };
    }

    // 2. Validación atómica UNIQUE(cancha_id, fecha_reserva, hora_inicio)
    const colision = db.reservas.find(
      (r) =>
        r.fecha_reserva === fecha &&
        r.hora_inicio === hora_inicio &&
        r.estado !== 'Cancelada'
    );

    if (colision) {
      return {
        ok: false,
        status: 409,
        code: 'COLLISION',
        error: 'Horario recién ocupado',
        message: 'Otra persona confirmó mientras llenabas tus datos. No se cobró nada.',
        alternativas: this.obtenerAlternativasDisponibles(fecha, hora_inicio)
      };
    }

    const horaNum = parseInt(hora_inicio.split(':')[0], 10);
    const hora_fin = `${String(horaNum + 1).padStart(2, '0')}:00`;
    const telFormateado = `${telLimpio.slice(0, 4)}-${telLimpio.slice(4, 8)}`;

    const seq = db.nextReservaSeq || db.reservas.length + 1;
    let codigo_reserva = `CAN-2026-${String(seq).padStart(2, '0')}`;
    while (db.reservas.some((r) => r.codigo_reserva === codigo_reserva)) {
      codigo_reserva = `CAN-2026-${String(Math.floor(10 + Math.random() * 89))}`;
    }

    const nuevaReserva = {
      id: Date.now(),
      codigo_reserva,
      cancha_id: 1,
      cliente_nombre: nombre.trim(),
      cliente_telefono: telFormateado,
      fecha_reserva: fecha,
      hora_inicio,
      hora_fin,
      metodo_pago_previsto: metodo_pago === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil',
      estado: 'Pendiente',
      monto_total: db.cancha.tarifa_hora || 16000,
      created_at: new Date().toISOString()
    };

    db.reservas.push(nuevaReserva);
    db.nextReservaSeq = seq + 1;
    CanchaDB.save(db);

    return {
      ok: true,
      status: 201,
      reserva: nuevaReserva
    };
  }

  static consultarPorCodigo(codigo) {
    if (!codigo || !codigo.trim()) return null;
    const db = CanchaDB.load();
    const limpio = codigo.trim().toUpperCase();
    const reserva = db.reservas.find((r) => r.codigo_reserva.toUpperCase() === limpio);
    if (!reserva) return null;
    const pago = db.pagos.find((p) => p.reserva_id === reserva.id) || null;
    return { reserva, pago, cancha: db.cancha };
  }

  static consultarPorTelefono(telefono) {
    if (!telefono || !telefono.trim()) return [];
    const digitos = String(telefono).replace(/[^\d]/g, '');
    if (digitos.length < 4) return [];
    const db = CanchaDB.load();
    const coincidencias = db.reservas
      .filter((r) => String(r.cliente_telefono).replace(/[^\d]/g, '').includes(digitos))
      .sort((a, b) => {
        if (a.fecha_reserva !== b.fecha_reserva) return b.fecha_reserva.localeCompare(a.fecha_reserva);
        return b.hora_inicio.localeCompare(a.hora_inicio);
      });

    return coincidencias.map((reserva) => ({
      reserva,
      pago: db.pagos.find((p) => p.reserva_id === reserva.id) || null,
      cancha: db.cancha
    }));
  }

  static cancelarReserva(id, motivo = 'Cancelada por administración') {
    const db = CanchaDB.load();
    const idx = db.reservas.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return { ok: false, error: 'Reserva no encontrada' };

    db.reservas[idx].estado = 'Cancelada';
    db.reservas[idx].motivo_cancelacion = motivo;
    // Si tenía un pago registrado, removerlo para que no infle la caja activa
    db.pagos = db.pagos.filter((p) => Number(p.reserva_id) !== Number(id));
    CanchaDB.save(db);
    return { ok: true, reserva: db.reservas[idx] };
  }

  static reprogramarReserva(id, nuevaFecha, nuevaHoraInicio) {
    const db = CanchaDB.load();
    const idx = db.reservas.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return { ok: false, error: 'Reserva no encontrada' };

    // Verificar que la nueva fecha y hora no estén ocupadas ni bloqueadas
    const ocupada = db.reservas.find(
      (r) =>
        Number(r.id) !== Number(id) &&
        r.fecha_reserva === nuevaFecha &&
        r.hora_inicio === nuevaHoraInicio &&
        r.estado !== 'Cancelada'
    );
    if (ocupada) {
      return { ok: false, error: 'La nueva franja seleccionada ya está ocupada por otra reserva.' };
    }

    const bloqueada = db.bloqueos_horario.find(
      (b) => b.fecha === nuevaFecha && b.hora_inicio === nuevaHoraInicio
    );
    if (bloqueada) {
      return { ok: false, error: `La franja está bloqueada por: ${bloqueada.motivo}.` };
    }

    const horaNum = parseInt(nuevaHoraInicio.split(':')[0], 10);
    const nuevaHoraFin = `${String(horaNum + 1).padStart(2, '0')}:00`;

    db.reservas[idx].fecha_reserva = nuevaFecha;
    db.reservas[idx].hora_inicio = nuevaHoraInicio;
    db.reservas[idx].hora_fin = nuevaHoraFin;
    if (db.reservas[idx].estado === 'Cancelada') {
      db.reservas[idx].estado = 'Pendiente';
    }

    CanchaDB.save(db);
    return { ok: true, reserva: db.reservas[idx] };
  }
}

/**
 * «Service» PagoService
 * Métodos: registrarPago(reservaId, dto), conciliarComprobante(pagoId, num), calcularBalance(desde, hasta)
 */
export class PagoService {
  static registrarPago(reservaId, dto) {
    const { metodo_pago, monto, numero_comprobante, registrado_por } = dto || {};
    const db = CanchaDB.load();
    const reservaIdx = db.reservas.findIndex((r) => Number(r.id) === Number(reservaId));
    if (reservaIdx === -1) {
      return { ok: false, status: 404, error: 'Reserva inexistente' };
    }

    const reserva = db.reservas[reservaIdx];
    const metodoFinal = metodo_pago === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil';

    if (metodoFinal === 'SINPE Móvil' && (!numero_comprobante || !String(numero_comprobante).trim())) {
      return {
        ok: false,
        status: 400,
        error: 'Para pagos por SINPE Móvil debés indicar el número de comprobante o referencia bancaria.'
      };
    }

    const comprobanteFinal =
      metodoFinal === 'SINPE Móvil'
        ? String(numero_comprobante).trim().toUpperCase().startsWith('SINPE-')
          ? String(numero_comprobante).trim()
          : `SINPE-${String(numero_comprobante).trim()}`
        : null;

    // Si ya existía un pago para esta reserva, actualizarlo; si no, insertarlo
    const pagoExistenteIdx = db.pagos.findIndex((p) => Number(p.reserva_id) === Number(reservaId));
    const nuevoPago = {
      id: pagoExistenteIdx >= 0 ? db.pagos[pagoExistenteIdx].id : Date.now(),
      reserva_id: reserva.id,
      metodo_pago: metodoFinal,
      monto: Number(monto || reserva.monto_total || 16000),
      numero_comprobante: comprobanteFinal,
      registrado_por: registrado_por || 'Carlos Pérez (Encargado)',
      fecha_pago: new Date().toISOString()
    };

    if (pagoExistenteIdx >= 0) {
      db.pagos[pagoExistenteIdx] = nuevoPago;
    } else {
      db.pagos.push(nuevoPago);
    }

    db.reservas[reservaIdx].estado = 'Confirmada';
    db.reservas[reservaIdx].metodo_pago_previsto = metodoFinal;
    CanchaDB.save(db);

    return {
      ok: true,
      status: 201,
      pago: nuevoPago,
      reserva: db.reservas[reservaIdx]
    };
  }

  static conciliarComprobante(pagoId, numeroComprobante) {
    const db = CanchaDB.load();
    const idx = db.pagos.findIndex((p) => Number(p.id) === Number(pagoId));
    if (idx === -1) return false;
    db.pagos[idx].numero_comprobante = numeroComprobante;
    CanchaDB.save(db);
    return true;
  }

  static calcularBalance(desde = null, hasta = null) {
    const db = CanchaDB.load();
    const reservasMap = new Map(db.reservas.map((r) => [Number(r.id), r]));

    let totalEfectivo = 0;
    let totalSinpe = 0;
    let conteoEfectivo = 0;
    let conteoSinpe = 0;

    for (const pago of db.pagos) {
      const res = reservasMap.get(Number(pago.reserva_id));
      if (!res || res.estado === 'Cancelada') continue;
      if (desde && res.fecha_reserva < desde) continue;
      if (hasta && res.fecha_reserva > hasta) continue;

      const monto = Number(pago.monto || 0);
      if (pago.metodo_pago === 'Efectivo') {
        totalEfectivo += monto;
        conteoEfectivo += 1;
      } else {
        totalSinpe += monto;
        conteoSinpe += 1;
      }
    }

    let pendientePorCobrar = 0;
    let conteoPendientes = 0;
    for (const res of db.reservas) {
      if (res.estado !== 'Pendiente') continue;
      if (desde && res.fecha_reserva < desde) continue;
      if (hasta && res.fecha_reserva > hasta) continue;
      pendientePorCobrar += Number(res.monto_total || 16000);
      conteoPendientes += 1;
    }

    const totalRecaudado = totalEfectivo + totalSinpe;
    const pctSinpe = totalRecaudado > 0 ? Math.round((totalSinpe / totalRecaudado) * 100) : 0;
    const pctEfectivo = totalRecaudado > 0 ? 100 - pctSinpe : 0;

    return {
      totalRecaudado,
      totalSinpe,
      totalEfectivo,
      pctSinpe,
      pctEfectivo,
      conteoSinpe,
      conteoEfectivo,
      pendientePorCobrar,
      conteoPendientes,
      metaTotal: totalRecaudado + pendientePorCobrar
    };
  }
}

/**
 * «Manager» AgendaManager
 * Métodos: bloquearHorario(dto), liberarBloqueo(id), obtenerCalendarioMensual(mes, anio)
 */
export class AgendaManager {
  static listarBloqueos() {
    const db = CanchaDB.load();
    return [...db.bloqueos_horario].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
  }

  static bloquearHorario(dto) {
    const { fecha, hora_inicio, motivo, dia_completo } = dto || {};
    if (!fecha || !motivo || !motivo.trim()) {
      return { ok: false, status: 400, error: 'Indicá la fecha y el motivo del bloqueo.' };
    }

    const db = CanchaDB.load();
    const horasABloquear = dia_completo
      ? db.franjas_oficiales.map((f) => f.hora_inicio)
      : [hora_inicio];

    // Verificar colisiones con reservas confirmadas o pendientes
    const conflictoReserva = db.reservas.find(
      (r) =>
        r.fecha_reserva === fecha &&
        horasABloquear.includes(r.hora_inicio) &&
        r.estado !== 'Cancelada'
    );

    if (conflictoReserva) {
      return {
        ok: false,
        status: 409,
        error: `Conflicto de horario: existe la reserva ${conflictoReserva.codigo_reserva} (${conflictoReserva.cliente_nombre}) a las ${conflictoReserva.hora_inicio}. Reprogramá o cancelá esa reserva antes de bloquear.`
      };
    }

    const creados = [];
    for (const hInicio of horasABloquear) {
      const yaBloqueado = db.bloqueos_horario.some(
        (b) => b.fecha === fecha && b.hora_inicio === hInicio
      );
      if (yaBloqueado) continue;

      const hNum = parseInt(hInicio.split(':')[0], 10);
      const hFin = `${String(hNum + 1).padStart(2, '0')}:00`;
      const nuevoBloqueo = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        cancha_id: 1,
        fecha,
        hora_inicio: hInicio,
        hora_fin: hFin,
        motivo: motivo.trim(),
        usuario_id: 1,
        created_at: new Date().toISOString()
      };
      db.bloqueos_horario.push(nuevoBloqueo);
      creados.push(nuevoBloqueo);
    }

    CanchaDB.save(db);
    return { ok: true, status: 201, bloqueos: creados };
  }

  static liberarBloqueo(bloqueoId) {
    const db = CanchaDB.load();
    db.bloqueos_horario = db.bloqueos_horario.filter((b) => Number(b.id) !== Number(bloqueoId));
    CanchaDB.save(db);
    return true;
  }

  static obtenerCalendarioMensual(anio, mesIndexZeroBased) {
    const db = CanchaDB.load();
    const totalFranjasDia = db.franjas_oficiales.length; // 7 franjas (16:00 a 23:00)
    const diasEnMes = new Date(anio, mesIndexZeroBased + 1, 0).getDate();
    const resultado = [];

    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${anio}-${String(mesIndexZeroBased + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const ocupadas = db.reservas.filter(
        (r) => r.fecha_reserva === fechaStr && r.estado !== 'Cancelada'
      ).length;
      const bloqueadas = db.bloqueos_horario.filter((b) => b.fecha === fechaStr).length;
      const libres = Math.max(0, totalFranjasDia - ocupadas - bloqueadas);

      resultado.push({
        dia: d,
        fecha: fechaStr,
        libres,
        ocupadas,
        bloqueadas,
        total: totalFranjasDia
      });
    }

    return resultado;
  }
}

/**
 * «Controller» DashboardController
 * Métodos: obtenerMetricasIngresos(fechaRef), listarReservasRecientes(filtro), exportarReporteCSV(rango)
 */
export class DashboardController {
  static obtenerMetricasIngresos(fechaReferencia = '2026-11-06') {
    const db = CanchaDB.load();
    const balanceGlobal = PagoService.calcularBalance();
    const balanceHoy = PagoService.calcularBalance(fechaReferencia, fechaReferencia);

    // Calcular semana (lunes a domingo) que contiene fechaReferencia
    const [y, m, d] = fechaReferencia.split('-').map(Number);
    const refDate = new Date(y, m - 1, d);
    const dayOfWeek = refDate.getDay(); // 0 dom .. 6 sab
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(y, m - 1, d + diffToMonday);

    const diasSemana = [];
    let totalHorasOcupadasSemana = 0;
    const nombresCortos = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const curr = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const fStr = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
      const count = db.reservas.filter(
        (r) => r.fecha_reserva === fStr && r.estado !== 'Cancelada'
      ).length;
      totalHorasOcupadasSemana += count;
      diasSemana.push({
        label: nombresCortos[i],
        fecha: fStr,
        ocupadas: count,
        total: 7
      });
    }

    const totalHorasDisponiblesSemana = 49; // 7 días * 7 horas (16:00 a 23:00)
    const ocupacionSemanalPct = (
      (totalHorasOcupadasSemana / totalHorasDisponiblesSemana) *
      100
    ).toFixed(1).replace('.', ',');

    return {
      fechaReferencia,
      hoy: balanceHoy,
      global: balanceGlobal,
      ocupacionSemanal: {
        porcentajeTexto: `${ocupacionSemanalPct}%`,
        porcentajeNumero: Number(((totalHorasOcupadasSemana / totalHorasDisponiblesSemana) * 100).toFixed(1)),
        horasOcupadas: totalHorasOcupadasSemana,
        horasTotales: totalHorasDisponiblesSemana,
        desgloseDias: diasSemana
      }
    };
  }

  static listarReservasRecientes(filtro = {}) {
    const db = CanchaDB.load();
    const pagosMap = new Map(db.pagos.map((p) => [Number(p.reserva_id), p]));

    let lista = db.reservas.map((r) => ({
      ...r,
      pago: pagosMap.get(Number(r.id)) || null
    }));

    if (filtro.fecha) {
      lista = lista.filter((r) => r.fecha_reserva === filtro.fecha);
    }
    if (filtro.desde) {
      lista = lista.filter((r) => r.fecha_reserva >= filtro.desde);
    }
    if (filtro.hasta) {
      lista = lista.filter((r) => r.fecha_reserva <= filtro.hasta);
    }
    if (filtro.estado && filtro.estado !== 'Todos') {
      lista = lista.filter((r) => r.estado === filtro.estado);
    }
    if (filtro.metodo && filtro.metodo !== 'Todos') {
      lista = lista.filter((r) => {
        const met = r.pago ? r.pago.metodo_pago : r.metodo_pago_previsto;
        return met === filtro.metodo;
      });
    }
    if (filtro.busqueda && filtro.busqueda.trim()) {
      const q = filtro.busqueda.trim().toLowerCase();
      lista = lista.filter(
        (r) =>
          r.codigo_reserva.toLowerCase().includes(q) ||
          r.cliente_nombre.toLowerCase().includes(q) ||
          r.cliente_telefono.toLowerCase().includes(q)
      );
    }

    return lista.sort((a, b) => {
      if (a.fecha_reserva !== b.fecha_reserva) return a.fecha_reserva.localeCompare(b.fecha_reserva);
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
  }

  static exportarReporteCSV(filtro = {}) {
    const registros = this.listarReservasRecientes(filtro);
    const encabezados = [
      'Codigo Reserva',
      'Fecha Partido',
      'Hora Inicio',
      'Hora Fin',
      'Cliente / Equipo',
      'Telefono',
      'Estado Reserva',
      'Metodo de Pago',
      'Comprobante SINPE',
      'Monto (CRC)',
      'Fecha Registro Pago'
    ];

    const filas = registros.map((r) => {
      const metodo = r.pago ? r.pago.metodo_pago : `${r.metodo_pago_previsto} (Previsto)`;
      const comprobante = r.pago?.numero_comprobante || (r.pago ? 'Efectivo en caseta' : 'Pendiente');
      const monto = r.estado === 'Cancelada' ? 0 : r.monto_total;
      const fechaPago = r.pago?.fecha_pago ? r.pago.fecha_pago.slice(0, 19).replace('T', ' ') : 'Sin liquidar';

      return [
        r.codigo_reserva,
        r.fecha_reserva,
        r.hora_inicio,
        r.hora_fin,
        `"${String(r.cliente_nombre).replace(/"/g, '""')}"`,
        r.cliente_telefono,
        r.estado,
        `"${metodo}"`,
        `"${comprobante}"`,
        monto,
        `"${fechaPago}"`
      ].join(',');
    });

    // UTF-8 BOM para apertura directa en Microsoft Excel con tildes y formato correcto
    return '\uFEFF' + [encabezados.join(','), ...filas].join('\n');
  }
}

/**
 * «Middleware» AuthMiddleware
 * Métodos: validarCredenciales(user, pass), emitirJWT(payload), verificarToken()
 */
export class AuthMiddleware {
  static validarCredenciales(usernameInput, passwordInput) {
    const user = String(usernameInput || '').trim().toLowerCase();
    const pass = String(passwordInput || '').trim();

    const db = CanchaDB.load();
    const encontrado = db.usuarios_admin.find(
      (u) => u.username.toLowerCase() === user || u.email.toLowerCase() === user
    );

    const passwordValida = pass === 'Venecia2026!' || pass === 'admin123' || pass === 'venecia2026';

    if (!encontrado || !passwordValida) {
      return { ok: false, status: 401, error: 'Credenciales no válidas. Verificá tu usuario y contraseña.' };
    }

    const session = this.emitirJWT(encontrado);
    CanchaDB.setAuthSession(session);
    return { ok: true, status: 200, session };
  }

  static emitirJWT(usuario) {
    const exp = Math.floor(Date.now() / 1000) + 8 * 3600; // 8 horas (PT-API-03)
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      cargo: usuario.cargo,
      email: usuario.email,
      rol: usuario.rol,
      iat: Math.floor(Date.now() / 1000),
      exp
    };
    const token =
      typeof window !== 'undefined' && window.btoa
        ? `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}.venecia_sig_2026`
        : 'jwt_token_cancha_venecia';

    return { token, admin: usuario, exp };
  }

  static verificarToken() {
    return CanchaDB.getAuthSession();
  }

  static cerrarSesion() {
    CanchaDB.setAuthSession(null);
  }
}
