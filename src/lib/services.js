// =============================================================================
// Implementación del Diagrama de Clases UML del Dominio (Sección 12.1)
// Clases: ReservaService, PagoService, AgendaManager, DashboardController, AuthMiddleware
// Blindado bajo lineamientos OWASP Top 10:2025 + Controles Básicos de Seguridad Web
// =============================================================================

import { CanchaDB } from './db';
import {
  secureRandomInt,
  timingSafeEqualStr,
  computeIntegritySignature,
  sanitizeText,
  sanitizeCSVCell,
  sanitizeComprobante,
  isValidFechaISO,
  isValidHoraOficial,
  isValidTelefonoCR,
  RateLimiter,
  LoginBruteForceGuard,
  SecurityAuditLogger,
  TARIFA_OFICIAL_CRC
} from './security';

/**
 * «Service» ReservaService
 * Métodos: verificarDisponibilidad(fecha), crearReserva(dto), consultarPorCodigo(codigo),
 *          consultarPorTelefono(tel), cancelarReserva(id, motivo), reprogramarReserva(...)
 */
export class ReservaService {
  static verificarDisponibilidad(fecha) {
    const db = CanchaDB.load();
    const fechaSegura = isValidFechaISO(fecha) ? fecha : '2026-11-06';
    const reservasFecha = db.reservas.filter(
      (r) => r.fecha_reserva === fechaSegura && r.estado !== 'Cancelada'
    );
    const bloqueosFecha = db.bloqueos_horario.filter((b) => b.fecha === fechaSegura);

    return db.franjas_oficiales.map((franja) => {
      const bloqueo = bloqueosFecha.find((b) => b.hora_inicio === franja.hora_inicio);
      if (bloqueo) {
        return {
          ...franja,
          fecha: fechaSegura,
          estado: 'Mantenimiento',
          disponible: false,
          motivo_bloqueo: sanitizeText(bloqueo.motivo, 120),
          bloqueo_id: bloqueo.id
        };
      }

      const reserva = reservasFecha.find((r) => r.hora_inicio === franja.hora_inicio);
      if (reserva) {
        const esConfirmada = reserva.estado === 'Confirmada';
        return {
          ...franja,
          fecha: fechaSegura,
          estado: esConfirmada ? 'Ocupado' : 'En proceso',
          disponible: false,
          reserva_estado: reserva.estado
        };
      }

      return {
        ...franja,
        fecha: fechaSegura,
        estado: 'Libre',
        disponible: true
      };
    });
  }

  static obtenerAlternativasDisponibles(fecha, horaExcluida) {
    const todas = this.verificarDisponibilidad(fecha);
    return todas.filter((f) => f.disponible && f.hora_inicio !== horaExcluida);
  }

  static sincronizarDisponibilidadLocal(fecha, franjas) {
    if (!Array.isArray(franjas) || !isValidFechaISO(fecha)) return;
    try {
      const db = CanchaDB.load();
      for (const f of franjas) {
        if (f.estado === 'Ocupada' || f.estado === 'Ocupado' || f.estado === 'En proceso') {
          const existe = db.reservas.find(
            (r) => r.fecha_reserva === fecha && r.hora_inicio === f.hora_inicio && r.estado !== 'Cancelada'
          );
          if (!existe) {
            db.reservas.push({
              id: Date.now() + Math.floor(Math.random() * 1000),
              codigo_reserva: `CAN-${f.hora_inicio.replace(':', '')}`,
              cancha_id: 1,
              cliente_nombre: 'Horario reservado',
              cliente_telefono: '8888-0000',
              fecha_reserva: fecha,
              hora_inicio: f.hora_inicio,
              hora_fin: f.hora_fin,
              metodo_pago_previsto: 'SINPE Móvil',
              estado: f.estado === 'Ocupada' || f.estado === 'Ocupado' ? 'Confirmada' : 'Pendiente',
              monto_total: f.precio || TARIFA_OFICIAL_CRC,
              motivo_cancelacion: null,
              notas: null,
              created_at: new Date().toISOString()
            });
          }
        }
        if (f.estado === 'Mantenimiento' && f.motivo) {
          const existeB = db.bloqueos_horario.find(
            (b) => b.fecha === fecha && b.hora_inicio === f.hora_inicio
          );
          if (!existeB) {
            db.bloqueos_horario.push({
              id: Date.now() + Math.floor(Math.random() * 1000),
              cancha_id: 1,
              fecha,
              hora_inicio: f.hora_inicio,
              hora_fin: f.hora_fin,
              motivo: f.motivo,
              usuario_id: 1,
              created_at: new Date().toISOString()
            });
          }
        }
      }
      CanchaDB.save(db);
    } catch (e) {
      console.warn('Error al sincronizar disponibilidad local:', e);
    }
  }

  static async verificarDisponibilidadAsync(fecha) {
    const fechaSegura = isValidFechaISO(fecha) ? fecha : '2026-11-06';
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(`/api/disponibilidad?fecha=${encodeURIComponent(fechaSegura)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            this.sincronizarDisponibilidadLocal(fechaSegura, data);
            return data.map((f) => {
              const isDisp = f.estado === 'Disponible' || f.estado === 'Libre';
              let normEstado = 'Libre';
              if (f.estado === 'Ocupada' || f.estado === 'Ocupado') normEstado = 'Ocupado';
              else if (f.estado === 'En proceso') normEstado = 'En proceso';
              else if (f.estado === 'Mantenimiento') normEstado = 'Mantenimiento';
              else if (isDisp) normEstado = 'Libre';

              return {
                ...f,
                label: f.label || `${f.hora_inicio}–${f.hora_fin}`,
                fecha: fechaSegura,
                disponible: isDisp,
                estado: normEstado,
                motivo_bloqueo: f.motivo || null
              };
            });
          }
        }
      } catch (e) {
        console.warn('Fallo de red en verificarDisponibilidadAsync, usando motor local:', e);
      }
    }
    return this.verificarDisponibilidad(fechaSegura);
  }

  static async verificarDisponibilidadRangoAsync(desde, hasta) {
    if (typeof window !== 'undefined' && isValidFechaISO(desde) && isValidFechaISO(hasta)) {
      try {
        const res = await fetch(
          `/api/disponibilidad?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reservas)) {
            const db = CanchaDB.load();
            for (const r of data.reservas) {
              const idx = db.reservas.findIndex(
                (lr) =>
                  lr.fecha_reserva === r.fecha_reserva &&
                  lr.hora_inicio === r.hora_inicio &&
                  lr.estado !== 'Cancelada'
              );
              if (idx >= 0) {
                db.reservas[idx].estado = r.estado;
              } else {
                db.reservas.push({
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  codigo_reserva: `CAN-${r.hora_inicio.replace(':', '')}`,
                  cancha_id: 1,
                  cliente_nombre: 'Horario reservado',
                  cliente_telefono: '8888-0000',
                  fecha_reserva: r.fecha_reserva,
                  hora_inicio: r.hora_inicio,
                  hora_fin: `${String(parseInt(r.hora_inicio) + 1).padStart(2, '0')}:00`,
                  metodo_pago_previsto: 'SINPE Móvil',
                  estado: r.estado,
                  monto_total: TARIFA_OFICIAL_CRC,
                  motivo_cancelacion: null,
                  notas: null,
                  created_at: new Date().toISOString()
                });
              }
            }
            if (Array.isArray(data.bloqueos)) {
              for (const b of data.bloqueos) {
                const bIdx = db.bloqueos_horario.findIndex(
                  (lb) => lb.fecha === b.fecha && lb.hora_inicio === b.hora_inicio
                );
                if (bIdx === -1) {
                  db.bloqueos_horario.push({
                    id: Date.now() + Math.floor(Math.random() * 1000),
                    cancha_id: 1,
                    fecha: b.fecha,
                    hora_inicio: b.hora_inicio,
                    hora_fin: `${String(parseInt(b.hora_inicio) + 1).padStart(2, '0')}:00`,
                    motivo: b.motivo,
                    usuario_id: 1,
                    created_at: new Date().toISOString()
                  });
                }
              }
            }
            CanchaDB.save(db);
          }
        }
      } catch (e) {
        console.warn('Fallo de red al consultar rango de disponibilidad:', e);
      }
    }
  }

  static async obtenerAlternativasDisponiblesAsync(fecha, horaExcluida) {
    const todas = await this.verificarDisponibilidadAsync(fecha);
    return todas.filter((f) => f.disponible && f.hora_inicio !== horaExcluida);
  }

  /**
   * Crea una reserva aplicando validación transaccional atómica anti-colisión,
   * sanitización anti-XSS (A05:2025) y Rate Limiting anti-abuso (A06:2025).
   * Restricción: UNIQUE(cancha_id, fecha_reserva, hora_inicio)
   */
  static crearReserva(dto) {
    // A06:2025 - Rate Limiting para evitar acaparamiento automatizado de horarios
    const rate = RateLimiter.checkAndRecord('crear_reserva', 6, 60 * 1000);
    if (!rate.allowed) {
      return {
        ok: false,
        status: 429,
        error: `Demasiadas solicitudes seguidas. Por seguridad esperá ${rate.retryAfterSec} segundos antes de intentar otra reserva.`
      };
    }

    const { nombre, telefono, fecha, hora_inicio, metodo_pago } = dto || {};
    const nombreSanitizado = sanitizeText(nombre, 80);

    if (!nombreSanitizado || nombreSanitizado.length < 2) {
      return {
        ok: false,
        status: 400,
        error: 'Por favor ingresá un nombre válido (o el nombre de tu equipo).'
      };
    }

    const telLimpio = String(telefono || '').replace(/[^\d]/g, '');
    if (!isValidTelefonoCR(telLimpio)) {
      return {
        ok: false,
        status: 400,
        error: 'Por favor ingresá un número de teléfono válido de Costa Rica (8 dígitos).'
      };
    }

    if (!isValidFechaISO(fecha) || !isValidHoraOficial(hora_inicio)) {
      return {
        ok: false,
        status: 400,
        error: 'Debés seleccionar una fecha válida (YYYY-MM-DD) y una franja horaria oficial (16:00 a 22:00).'
      };
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
        message: `Esta franja fue inhabilitada por: ${sanitizeText(bloqueoExistente.motivo, 100)}.`,
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

    // A04:2025 - Uso de CSPRNG en lugar de Math.random()
    const seq = db.nextReservaSeq || db.reservas.length + 1;
    let codigo_reserva = `CAN-2026-${String(seq).padStart(2, '0')}`;
    while (db.reservas.some((r) => r.codigo_reserva === codigo_reserva)) {
      codigo_reserva = `CAN-2026-${String(secureRandomInt(10, 99))}`;
    }

    // A08:2025 - Integridad de datos: el monto siempre proviene de la tarifa oficial del servidor/DB
    const tarifaSegura = Number(db.cancha?.tarifa_hora) || TARIFA_OFICIAL_CRC;

    const nuevaReserva = {
      id: Date.now() * 100 + secureRandomInt(10, 99),
      codigo_reserva,
      cancha_id: 1,
      cliente_nombre: nombreSanitizado,
      cliente_telefono: telFormateado,
      fecha_reserva: fecha,
      hora_inicio,
      hora_fin,
      metodo_pago_previsto: metodo_pago === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil',
      estado: 'Pendiente',
      monto_total: tarifaSegura,
      created_at: new Date().toISOString()
    };

    db.reservas.push(nuevaReserva);
    db.nextReservaSeq = seq + 1;
    CanchaDB.save(db);

    SecurityAuditLogger.log('RESERVA_CREADA', 'INFO', {
      codigo: codigo_reserva,
      fecha,
      hora: hora_inicio
    });

    return {
      ok: true,
      status: 201,
      reserva: nuevaReserva
    };
  }

  static async crearReservaAsync(dto) {
    const rate = RateLimiter.checkAndRecord('crear_reserva', 6, 60 * 1000);
    if (!rate.allowed) {
      return {
        ok: false,
        status: 429,
        error: `Demasiadas solicitudes seguidas. Por seguridad esperá ${rate.retryAfterSec} segundos antes de intentar otra reserva.`
      };
    }

    const { nombre, telefono, fecha, hora_inicio, metodo_pago } = dto || {};
    const nombreSanitizado = sanitizeText(nombre, 80);

    if (!nombreSanitizado || nombreSanitizado.length < 2) {
      return {
        ok: false,
        status: 400,
        error: 'Por favor ingresá un nombre válido (o el nombre de tu equipo).'
      };
    }

    const telLimpio = String(telefono || '').replace(/[^\d]/g, '');
    if (!isValidTelefonoCR(telLimpio)) {
      return {
        ok: false,
        status: 400,
        error: 'Por favor ingresá un número de teléfono válido de Costa Rica (8 dígitos).'
      };
    }

    if (!isValidFechaISO(fecha) || !isValidHoraOficial(hora_inicio)) {
      return {
        ok: false,
        status: 400,
        error: 'Debés seleccionar una fecha válida (YYYY-MM-DD) y una franja horaria oficial (16:00 a 22:00).'
      };
    }

    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombreSanitizado,
            tel: telLimpio,
            fecha,
            hora: hora_inicio,
            metodo: metodo_pago === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil'
          })
        });

        const data = await resp.json();

        if (resp.status === 409) {
          const alternativas = await this.obtenerAlternativasDisponiblesAsync(fecha, hora_inicio);
          return {
            ok: false,
            status: 409,
            code: 'COLLISION',
            error: data.error || 'Horario recién ocupado',
            message:
              data.message || 'Otra persona confirmó mientras llenabas tus datos. No se cobró nada.',
            alternativas
          };
        }

        if (resp.ok && data.codigo) {
          const horaNum = parseInt(hora_inicio.split(':')[0], 10);
          const hora_fin = `${String(horaNum + 1).padStart(2, '0')}:00`;
          const telFormateado = `${telLimpio.slice(0, 4)}-${telLimpio.slice(4, 8)}`;
          const nuevaReserva = {
            id: data.id || Date.now(),
            codigo_reserva: data.codigo,
            cancha_id: 1,
            cliente_nombre: nombreSanitizado,
            cliente_telefono: telFormateado,
            fecha_reserva: fecha,
            hora_inicio,
            hora_fin,
            metodo_pago_previsto: metodo_pago === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil',
            estado: 'Pendiente',
            monto_total: data.total || TARIFA_OFICIAL_CRC,
            motivo_cancelacion: null,
            notas: null,
            created_at: new Date().toISOString()
          };

          const db = CanchaDB.load();
          db.reservas = db.reservas.filter((r) => r.codigo_reserva !== data.codigo);
          db.reservas.push(nuevaReserva);
          CanchaDB.save(db);

          return { ok: true, reserva: nuevaReserva };
        }

        if (!resp.ok) {
          return {
            ok: false,
            status: resp.status,
            error: data.error || 'No se pudo registrar la reserva en el servidor.'
          };
        }
      } catch (err) {
        console.warn('Fallo de red al registrar reserva, usando motor local:', err);
      }
    }

    return this.crearReserva(dto);
  }

  static consultarPorCodigo(codigo) {
    const limpio = sanitizeText(codigo, 24).toUpperCase();
    if (!limpio) return null;
    const db = CanchaDB.load();
    const reserva = db.reservas.find((r) => r.codigo_reserva.toUpperCase() === limpio);
    if (!reserva) return null;
    const pago = db.pagos.find((p) => p.reserva_id === reserva.id) || null;
    return { reserva, pago, cancha: db.cancha };
  }

  static async consultarPorCodigoAsync(codigo) {
    const limpio = sanitizeText(codigo, 24).toUpperCase();
    if (!limpio) return null;

    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch(`/api/reservas/${encodeURIComponent(limpio)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.reserva) {
            const db = CanchaDB.load();
            const idx = db.reservas.findIndex((r) => r.codigo_reserva.toUpperCase() === limpio);
            if (idx >= 0) {
              db.reservas[idx] = data.reserva;
            } else {
              db.reservas.push(data.reserva);
            }
            if (data.pago) {
              const pIdx = db.pagos.findIndex((p) => p.reserva_id === data.reserva.id);
              if (pIdx >= 0) db.pagos[pIdx] = data.pago;
              else db.pagos.push(data.pago);
            }
            CanchaDB.save(db);
            return { reserva: data.reserva, pago: data.pago, cancha: db.cancha };
          }
        }
      } catch (e) {
        console.warn('Fallo de red al consultar reserva por código:', e);
      }
    }

    return this.consultarPorCodigo(codigo);
  }

  /**
   * A01:2025 - Prevención de IDOR / Enumeración de datos personales por prefijo telefónico:
   * Se exige coincidencia exacta de los 8 dígitos del número telefónico costarricense.
   */
  static consultarPorTelefono(telefono) {
    if (!telefono || !String(telefono).trim()) return [];
    const digitos = String(telefono).replace(/[^\d]/g, '');
    if (digitos.length !== 8) return [];
    const db = CanchaDB.load();
    const coincidencias = db.reservas
      .filter((r) => String(r.cliente_telefono).replace(/[^\d]/g, '') === digitos)
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

  static async consultarPorTelefonoAsync(telefono) {
    if (!telefono || !String(telefono).trim()) return [];
    const digitos = String(telefono).replace(/[^\d]/g, '');
    if (digitos.length !== 8) return [];

    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch(`/api/reservas/${encodeURIComponent(digitos)}`);
        if (resp.ok) {
          const data = await resp.json();
          const db = CanchaDB.load();
          if (data && Array.isArray(data.reservas) && data.reservas.length > 0) {
            return data.reservas.map((item) => ({
              reserva: item.reserva,
              pago: item.pago,
              cancha: db.cancha
            }));
          }
          if (data && data.reserva) {
            return [{ reserva: data.reserva, pago: data.pago, cancha: db.cancha }];
          }
        }
      } catch (e) {
        console.warn('Fallo de red al consultar reserva por teléfono:', e);
      }
    }

    return this.consultarPorTelefono(telefono);
  }

  static cancelarReserva(id, motivo = 'Cancelada por administración') {
    const db = CanchaDB.load();
    const idx = db.reservas.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return { ok: false, error: 'Reserva no encontrada' };

    const motivoSanitizado = sanitizeText(motivo, 140) || 'Cancelada por administración';
    db.reservas[idx].estado = 'Cancelada';
    db.reservas[idx].motivo_cancelacion = motivoSanitizado;
    // Si tenía un pago registrado, removerlo para que no infle la caja activa
    db.pagos = db.pagos.filter((p) => Number(p.reserva_id) !== Number(id));
    CanchaDB.save(db);

    SecurityAuditLogger.log('RESERVA_CANCELADA', 'WARN', {
      codigo: db.reservas[idx].codigo_reserva,
      motivo: motivoSanitizado
    });

    return { ok: true, reserva: db.reservas[idx] };
  }

  static async cancelarReservaAsync(id, motivo = 'Cancelada por administración', token = null) {
    if (typeof window !== 'undefined' && token) {
      try {
        await fetch('/api/admin/reservas', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'cancelar', id, motivo })
        });
      } catch (e) {
        console.warn('Fallo de red al cancelar en servidor:', e);
      }
    }
    return this.cancelarReserva(id, motivo);
  }

  static reprogramarReserva(id, nuevaFecha, nuevaHoraInicio) {
    if (!isValidFechaISO(nuevaFecha) || !isValidHoraOficial(nuevaHoraInicio)) {
      return { ok: false, error: 'La fecha u hora seleccionada para reprogramar no es válida.' };
    }

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
      return { ok: false, error: `La franja está bloqueada por: ${sanitizeText(bloqueada.motivo, 100)}.` };
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

    SecurityAuditLogger.log('RESERVA_REPROGRAMADA', 'INFO', {
      codigo: db.reservas[idx].codigo_reserva,
      nuevaFecha,
      nuevaHoraInicio
    });

    return { ok: true, reserva: db.reservas[idx] };
  }

  static async reprogramarReservaAsync(id, nuevaFecha, nuevaHoraInicio, token = null) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/reservas', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'reprogramar',
            id,
            fecha: nuevaFecha,
            hora: nuevaHoraInicio
          })
        });
        if (!resp.ok) {
          const err = await resp.json();
          return { ok: false, error: err.error || 'Error al reprogramar reserva' };
        }
      } catch (e) {
        console.warn('Fallo de red al reprogramar en servidor:', e);
      }
    }
    return this.reprogramarReserva(id, nuevaFecha, nuevaHoraInicio);
  }

  static reprogramarReserva(id, nuevaFecha, nuevaHoraInicio) {
    if (!isValidFechaISO(nuevaFecha) || !isValidHoraOficial(nuevaHoraInicio)) {
      return { ok: false, error: 'La fecha u hora seleccionada para reprogramar no es válida.' };
    }

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
      return { ok: false, error: `La franja está bloqueada por: ${sanitizeText(bloqueada.motivo, 100)}.` };
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

    SecurityAuditLogger.log('RESERVA_REPROGRAMADA', 'INFO', {
      codigo: db.reservas[idx].codigo_reserva,
      nuevaFecha,
      nuevaHoraInicio
    });

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
    const comprobanteLimpio = sanitizeComprobante(numero_comprobante);

    if (metodoFinal === 'SINPE Móvil' && (!comprobanteLimpio || comprobanteLimpio.length < 3)) {
      return {
        ok: false,
        status: 400,
        error: 'Para pagos por SINPE Móvil debés indicar un número de comprobante o referencia bancaria válida.'
      };
    }

    const comprobanteFinal =
      metodoFinal === 'SINPE Móvil'
        ? comprobanteLimpio.toUpperCase().startsWith('SINPE-')
          ? comprobanteLimpio
          : `SINPE-${comprobanteLimpio}`
        : null;

    // A08:2025 - Validar que el monto sea numérico positivo coherente con la reserva
    const montoValidado =
      Number(monto) > 0 ? Number(monto) : Number(reserva.monto_total || TARIFA_OFICIAL_CRC);

    // Si ya existía un pago para esta reserva, actualizarlo; si no, insertarlo
    const pagoExistenteIdx = db.pagos.findIndex((p) => Number(p.reserva_id) === Number(reservaId));
    const nuevoPago = {
      id: pagoExistenteIdx >= 0 ? db.pagos[pagoExistenteIdx].id : Date.now() * 10 + secureRandomInt(1, 9),
      reserva_id: reserva.id,
      metodo_pago: metodoFinal,
      monto: montoValidado,
      numero_comprobante: comprobanteFinal,
      registrado_por: sanitizeText(registrado_por, 60) || 'Carlos Pérez (Encargado)',
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

    SecurityAuditLogger.log('PAGO_REGISTRADO', 'INFO', {
      codigo: reserva.codigo_reserva,
      metodo: metodoFinal,
      monto: montoValidado,
      comprobante: comprobanteFinal || 'Efectivo'
    });

    return {
      ok: true,
      status: 201,
      pago: nuevoPago,
      reserva: db.reservas[reservaIdx]
    };
  }

  static async registrarPagoAsync(reservaId, dto, token = null) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/pagos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            reserva_id: reservaId,
            metodo: dto.metodo_pago,
            monto: dto.monto,
            comprobante: dto.numero_comprobante
          })
        });
        if (!resp.ok) {
          const err = await resp.json();
          return { ok: false, status: resp.status, error: err.error || 'Error al registrar el pago' };
        }
      } catch (e) {
        console.warn('Fallo de red al registrar pago en servidor:', e);
      }
    }
    return this.registrarPago(reservaId, dto);
  }

  static conciliarComprobante(pagoId, numeroComprobante) {
    const db = CanchaDB.load();
    const idx = db.pagos.findIndex((p) => Number(p.id) === Number(pagoId));
    if (idx === -1) return false;
    db.pagos[idx].numero_comprobante = sanitizeComprobante(numeroComprobante);
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
      pendientePorCobrar += Number(res.monto_total || TARIFA_OFICIAL_CRC);
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
    const motivoSanitizado = sanitizeText(motivo, 120);

    if (!isValidFechaISO(fecha) || !motivoSanitizado) {
      return { ok: false, status: 400, error: 'Indicá una fecha válida y el motivo del bloqueo.' };
    }

    if (!dia_completo && !isValidHoraOficial(hora_inicio)) {
      return { ok: false, status: 400, error: 'Seleccioná una franja horaria oficial (16:00 a 22:00).' };
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
        id: Date.now() + secureRandomInt(1, 9999),
        cancha_id: 1,
        fecha,
        hora_inicio: hInicio,
        hora_fin: hFin,
        motivo: motivoSanitizado,
        usuario_id: 1,
        created_at: new Date().toISOString()
      };
      db.bloqueos_horario.push(nuevoBloqueo);
      creados.push(nuevoBloqueo);
    }

    CanchaDB.save(db);

    SecurityAuditLogger.log('HORARIO_BLOQUEADO', 'INFO', {
      fecha,
      franjas: horasABloquear.length,
      motivo: motivoSanitizado
    });

    return { ok: true, status: 201, bloqueos: creados };
  }

  static liberarBloqueo(bloqueoId) {
    const db = CanchaDB.load();
    db.bloqueos_horario = db.bloqueos_horario.filter((b) => Number(b.id) !== Number(bloqueoId));
    CanchaDB.save(db);
    SecurityAuditLogger.log('BLOQUEO_LIBERADO', 'INFO', { bloqueoId });
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

  static async listarBloqueosAsync(token) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/bloqueos', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list)) {
            const db = CanchaDB.load();
            db.bloqueos_horario = list;
            CanchaDB.save(db);
            return list;
          }
        }
      } catch (e) {
        console.warn('Fallo de red al listar bloqueos:', e);
      }
    }
    return this.listarBloqueos();
  }

  static async bloquearHorarioAsync(dto, token = null) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/bloqueos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fecha: dto.fecha,
            hora_inicio: dto.hora_inicio,
            hora_fin: dto.hora_fin,
            motivo: dto.motivo
          })
        });
        if (!resp.ok) {
          const err = await resp.json();
          return { ok: false, status: resp.status, error: err.error || 'Error al bloquear horario' };
        }
      } catch (e) {
        console.warn('Fallo de red al bloquear en servidor:', e);
      }
    }
    return this.bloquearHorario(dto);
  }

  static async liberarBloqueoAsync(id, token = null) {
    if (typeof window !== 'undefined' && token) {
      try {
        await fetch(`/api/admin/bloqueos?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.warn('Fallo de red al eliminar bloqueo en servidor:', e);
      }
    }
    return this.liberarBloqueo(id);
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
      const q = sanitizeText(filtro.busqueda, 60).toLowerCase();
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

  /**
   * A05:2025 - Exportación Contable CSV blindada contra CSV Formula Injection (CWE-1236)
   */
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
        sanitizeCSVCell(r.codigo_reserva),
        sanitizeCSVCell(r.fecha_reserva),
        sanitizeCSVCell(r.hora_inicio),
        sanitizeCSVCell(r.hora_fin),
        sanitizeCSVCell(r.cliente_nombre),
        sanitizeCSVCell(r.cliente_telefono),
        sanitizeCSVCell(r.estado),
        sanitizeCSVCell(metodo),
        sanitizeCSVCell(comprobante),
        Number(monto || 0),
        sanitizeCSVCell(fechaPago)
      ].join(',');
    });

    SecurityAuditLogger.log('REPORTE_CSV_EXPORTADO', 'INFO', {
      registros: registros.length,
      desde: filtro.desde || 'inicio',
      hasta: filtro.hasta || 'fin'
    });

    // UTF-8 BOM para apertura directa en Microsoft Excel con tildes y formato correcto
    return '\uFEFF' + [encabezados.join(','), ...filas].join('\n');
  }

  static async sincronizarDashboardAsync(token) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && Array.isArray(data.reservas)) {
            const db = CanchaDB.load();
            const remoteMap = new Map(data.reservas.map((r) => [r.id, r]));
            const localRest = db.reservas.filter((r) => !remoteMap.has(r.id));
            db.reservas = [...data.reservas, ...localRest];
            CanchaDB.save(db);
            return data;
          }
        }
      } catch (e) {
        console.warn('Fallback local para sincronizar dashboard:', e);
      }
    }
    return null;
  }

  static async listarReservasRecientesAsync(token, filtro = {}) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/reservas', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const list = await resp.json();
          if (Array.isArray(list)) {
            const db = CanchaDB.load();
            db.reservas = list;
            CanchaDB.save(db);
            return this.listarReservasRecientes(filtro);
          }
        }
      } catch (e) {
        console.warn('Fallback local para listar reservas:', e);
      }
    }
    return this.listarReservasRecientes(filtro);
  }
}

/**
 * «Middleware» AuthMiddleware
 * Métodos: validarCredenciales(user, pass), emitirJWT(payload), verificarToken()
 * Protegido con bloqueo contra fuerza bruta (A07:2025), comparación en tiempo constante (A04:2025)
 * y firma de integridad de sesión (A08:2025).
 */
export class AuthMiddleware {
  static validarCredenciales(usernameInput, passwordInput) {
    const user = sanitizeText(usernameInput, 60).toLowerCase();
    const pass = String(passwordInput || '').trim();

    // A07:2025 - Verificar bloqueo temporal por intentos fallidos (Anti-Brute Force)
    const lockStatus = LoginBruteForceGuard.getStatus(user || 'global');
    if (lockStatus.locked) {
      const minRestantes = Math.ceil(lockStatus.remainingSec / 60);
      return {
        ok: false,
        status: 429,
        error: `Cuenta temporalmente protegida tras múltiples intentos fallidos. Intentá de nuevo en ${minRestantes} min (${lockStatus.remainingSec} s).`
      };
    }

    const db = CanchaDB.load();
    const candidato = db.usuarios_admin.find(
      (u) =>
        timingSafeEqualStr(u.username.toLowerCase(), user) ||
        timingSafeEqualStr(u.email.toLowerCase(), user)
    );

    if (candidato && Number(candidato.activo) === 0) {
      SecurityAuditLogger.log('LOGIN_SUSPENDED_ACCOUNT', 'WARN', { user });
      return {
        ok: false,
        status: 403,
        error: 'Esta cuenta tiene el acceso suspendido por administración.'
      };
    }

    const encontrado = candidato && Number(candidato.activo) === 1 ? candidato : null;

    // A04:2025 - Comparación en tiempo constante (respeta contraseña personalizada o semilla)
    const passwordValida = encontrado?.password_custom
      ? timingSafeEqualStr(pass, encontrado.password_custom)
      : timingSafeEqualStr(pass, 'Venecia2026!') ||
        timingSafeEqualStr(pass, 'admin123') ||
        timingSafeEqualStr(pass, 'venecia2026');

    if (!encontrado || !passwordValida) {
      const failInfo = LoginBruteForceGuard.recordFailure(user || 'global');
      SecurityAuditLogger.log('LOGIN_FAILED', 'WARN', {
        user: user || 'desconocido',
        attempts: failInfo.attempts
      });

      if (failInfo.locked) {
        return {
          ok: false,
          status: 429,
          error: 'Se superó el límite de 5 intentos fallidos. El acceso fue bloqueado por 15 minutos por seguridad (OWASP A07:2025).'
        };
      }

      return {
        ok: false,
        status: 401,
        error: `Credenciales no válidas. Verificá tu usuario y contraseña (${failInfo.remainingAttempts} intentos restantes).`
      };
    }

    LoginBruteForceGuard.reset(user || 'global');
    const session = this.emitirJWT(encontrado);
    CanchaDB.setAuthSession(session);

    SecurityAuditLogger.log('LOGIN_SUCCESS', 'INFO', {
      username: encontrado.username,
      rol: encontrado.rol
    });

    return { ok: true, status: 200, session };
  }

  static iniciarSesion(usernameInput, passwordInput) {
    return this.validarCredenciales(usernameInput, passwordInput);
  }

  static emitirJWT(usuario) {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 8 * 3600; // 8 horas (PT-API-03)
    const sig = computeIntegritySignature(
      `${usuario.id}:${usuario.username}:${usuario.rol}:${exp}`
    );

    const permisos = Array.isArray(usuario.permisos)
      ? usuario.permisos
      : usuario.rol === 'Tesorero'
      ? ['dashboard', 'reservas', 'reportes']
      : ['dashboard', 'reservas', 'bloqueos', 'reportes', 'usuarios'];

    const adminLimpio = {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      cargo: usuario.cargo || 'Directiva ADI',
      email: usuario.email,
      rol: usuario.rol,
      permisos,
      activo: usuario.activo ?? 1
    };

    const payload = {
      sub: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      cargo: adminLimpio.cargo,
      email: usuario.email,
      rol: usuario.rol,
      permisos,
      iat,
      exp
    };
    const token =
      typeof window !== 'undefined' && window.btoa
        ? `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${window.btoa(
            unescape(encodeURIComponent(JSON.stringify(payload)))
          )}.${sig}`
        : `jwt_token_cancha_venecia.${sig}`;

    return { token, admin: adminLimpio, exp, sig };
  }

  static verificarToken() {
    return CanchaDB.getAuthSession();
  }

  static cerrarSesion() {
    const current = CanchaDB.getAuthSession();
    if (current?.admin) {
      SecurityAuditLogger.log('LOGOUT', 'INFO', { username: current.admin.username });
    }
    CanchaDB.setAuthSession(null);
  }

  static async loginAsync(usernameInput, passwordInput) {
    if (typeof window !== 'undefined') {
      try {
        const resp = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.token && data.admin) {
            const session = {
              token: data.token,
              admin: data.admin,
              exp: data.exp || Math.floor(Date.now() / 1000) + 8 * 3600
            };
            CanchaDB.setAuthSession(session);
            SecurityAuditLogger.log('LOGIN_SUCCESS', 'INFO', {
              username: data.admin.username,
              rol: data.admin.rol
            });
            return { ok: true, session };
          }
        } else if (resp.status === 403) {
          const errData = await resp.json().catch(() => ({}));
          return {
            ok: false,
            status: 403,
            error: errData.error || 'Tu cuenta tiene el acceso suspendido por administración.'
          };
        } else if (resp.status === 401) {
          return {
            ok: false,
            status: 401,
            error: 'Credenciales inválidas. Verificá tu usuario y contraseña.'
          };
        }
      } catch (e) {
        console.warn('Fallback local para login:', e);
      }
    }
    return this.validarCredenciales(usernameInput, passwordInput);
  }
}

/**
 * «Service» UsuarioAdminService
 * Control de Usuarios, Roles, Permisos de Módulos y Accesos (OWASP A01:2025 RBAC)
 */
export const MODULOS_SISTEMA = [
  {
    id: 'dashboard',
    label: 'Resumen y KPIs',
    desc: 'Métricas de ingresos Efectivo/SINPE y ocupación semanal'
  },
  {
    id: 'reservas',
    label: 'Reservas y Pagos',
    desc: 'Conciliar pagos, reprogramar y cancelar reservas'
  },
  {
    id: 'bloqueos',
    label: 'Bloqueos de Cancha',
    desc: 'Inhabilitar horarios por mantenimiento, clima o torneos'
  },
  {
    id: 'reportes',
    label: 'Reportes Contables',
    desc: 'Auditar movimientos y exportar cierres a Excel (CSV)'
  },
  {
    id: 'usuarios',
    label: 'Usuarios y Accesos',
    desc: 'Crear cuentas, asignar roles, permisos y contraseñas'
  }
];

export class UsuarioAdminService {
  static permisosPorDefecto(rol) {
    return rol === 'Tesorero'
      ? ['dashboard', 'reservas', 'reportes']
      : ['dashboard', 'reservas', 'bloqueos', 'reportes', 'usuarios'];
  }

  static listarUsuarios() {
    const db = CanchaDB.load();
    return (db.usuarios_admin || []).map((u) => ({
      ...u,
      cargo: u.cargo || (u.rol === 'Tesorero' ? 'Fiscalía Deportiva' : 'Coordinación Cancha'),
      permisos: Array.isArray(u.permisos) ? u.permisos : this.permisosPorDefecto(u.rol),
      activo: Number(u.activo) === 0 ? 0 : 1
    }));
  }

  static async listarUsuariosAsync(token = null) {
    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/usuarios', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const remotos = await resp.json();
          if (Array.isArray(remotos) && remotos.length > 0) {
            const db = CanchaDB.load();
            const localPassMap = new Map(
              (db.usuarios_admin || []).map((u) => [u.username.toLowerCase(), u.password_custom])
            );
            db.usuarios_admin = remotos.map((r) => ({
              ...r,
              password_custom: localPassMap.get(r.username.toLowerCase()) || undefined
            }));
            CanchaDB.save(db);
            return db.usuarios_admin;
          }
        }
      } catch (e) {
        console.warn('Usando lista local de usuarios_admin:', e);
      }
    }
    return this.listarUsuarios();
  }

  static crearUsuario(dto) {
    const username = sanitizeText(dto?.username, 40)
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase();
    const nombre = sanitizeText(dto?.nombre, 80);
    const cargo = sanitizeText(dto?.cargo || 'Directiva ADI', 80);
    const email = sanitizeText(dto?.email, 80).toLowerCase();
    const rol = dto?.rol === 'Tesorero' ? 'Tesorero' : 'Administrador';
    const password = String(dto?.password || '').trim();
    const permisos =
      Array.isArray(dto?.permisos) && dto.permisos.length > 0
        ? dto.permisos
        : this.permisosPorDefecto(rol);
    const activo = dto?.activo === 0 || dto?.activo === false ? 0 : 1;

    if (!username || username.length < 3) {
      return { ok: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }
    if (!nombre || nombre.length < 3) {
      return { ok: false, error: 'Ingresá el nombre completo del responsable.' };
    }
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'Ingresá un correo electrónico válido.' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const db = CanchaDB.load();
    const duplicado = db.usuarios_admin.find(
      (u) => u.username.toLowerCase() === username || u.email.toLowerCase() === email
    );
    if (duplicado) {
      return { ok: false, error: 'Ya existe un usuario con ese username o correo electrónico.' };
    }

    const maxId = db.usuarios_admin.reduce((acc, u) => Math.max(acc, Number(u.id) || 0), 0);
    const nuevo = {
      id: maxId + 1,
      username,
      nombre,
      cargo,
      email,
      rol,
      permisos,
      activo,
      password_custom: password,
      created_at: new Date().toISOString()
    };

    db.usuarios_admin.push(nuevo);
    CanchaDB.save(db);

    SecurityAuditLogger.log('USUARIO_CREADO', 'INFO', {
      username,
      rol,
      permisos: permisos.join(',')
    });

    return { ok: true, usuario: nuevo };
  }

  static async crearUsuarioAsync(dto, token = null) {
    const localRes = this.crearUsuario(dto);
    if (!localRes.ok) return localRes;

    if (typeof window !== 'undefined' && token) {
      try {
        const resp = await fetch('/api/admin/usuarios', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(dto)
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.usuario?.id) {
            const db = CanchaDB.load();
            const idx = db.usuarios_admin.findIndex(
              (u) => u.username.toLowerCase() === localRes.usuario.username.toLowerCase()
            );
            if (idx >= 0) {
              db.usuarios_admin[idx].id = Number(data.usuario.id);
              CanchaDB.save(db);
            }
          }
        }
      } catch (e) {
        console.warn('Guardado local de nuevo usuario (sin conexión D1):', e);
      }
    }

    return localRes;
  }

  static actualizarUsuario(id, cambios = {}, currentAdminId = null) {
    const db = CanchaDB.load();
    const idx = db.usuarios_admin.findIndex((u) => Number(u.id) === Number(id));
    if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };

    const actual = db.usuarios_admin[idx];

    if (
      cambios.activo !== undefined &&
      Number(cambios.activo) === 0 &&
      currentAdminId &&
      Number(actual.id) === Number(currentAdminId)
    ) {
      return {
        ok: false,
        error: 'Por seguridad no podés suspender el acceso de tu propia cuenta en sesión.'
      };
    }

    const nuevoRol =
      cambios.rol !== undefined
        ? cambios.rol === 'Tesorero'
          ? 'Tesorero'
          : 'Administrador'
        : actual.rol;

    const nuevosPermisos =
      cambios.permisos !== undefined
        ? Array.isArray(cambios.permisos) && cambios.permisos.length > 0
          ? cambios.permisos
          : this.permisosPorDefecto(nuevoRol)
        : cambios.rol !== undefined && cambios.rol !== actual.rol
        ? this.permisosPorDefecto(nuevoRol)
        : actual.permisos || this.permisosPorDefecto(nuevoRol);

    const actualizado = {
      ...actual,
      nombre: cambios.nombre !== undefined ? sanitizeText(cambios.nombre, 80) : actual.nombre,
      cargo: cambios.cargo !== undefined ? sanitizeText(cambios.cargo, 80) : actual.cargo,
      email:
        cambios.email !== undefined
          ? sanitizeText(cambios.email, 80).toLowerCase()
          : actual.email,
      rol: nuevoRol,
      permisos: nuevosPermisos,
      activo:
        cambios.activo !== undefined ? (Number(cambios.activo) === 0 ? 0 : 1) : actual.activo
    };

    if (cambios.password && String(cambios.password).trim().length >= 6) {
      actualizado.password_custom = String(cambios.password).trim();
    }

    db.usuarios_admin[idx] = actualizado;
    CanchaDB.save(db);

    // Si el usuario editado es el que tiene sesión activa, actualizar su sesión en vivo
    const sesionActual = CanchaDB.getAuthSession();
    if (sesionActual?.admin && Number(sesionActual.admin.id) === Number(id)) {
      CanchaDB.setAuthSession({
        ...sesionActual,
        admin: {
          ...sesionActual.admin,
          nombre: actualizado.nombre,
          cargo: actualizado.cargo,
          email: actualizado.email,
          rol: actualizado.rol,
          permisos: actualizado.permisos,
          activo: actualizado.activo
        }
      });
    }

    SecurityAuditLogger.log('USUARIO_ACTUALIZADO', 'INFO', {
      username: actualizado.username,
      rol: actualizado.rol,
      activo: actualizado.activo
    });

    return { ok: true, usuario: actualizado };
  }

  static async actualizarUsuarioAsync(id, cambios = {}, token = null, currentAdminId = null) {
    const localRes = this.actualizarUsuario(id, cambios, currentAdminId);
    if (!localRes.ok) return localRes;

    if (typeof window !== 'undefined' && token) {
      try {
        await fetch('/api/admin/usuarios', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ id, ...cambios, permisos: localRes.usuario.permisos })
        });
      } catch (e) {
        console.warn('Actualización local de usuario (sin conexión D1):', e);
      }
    }

    return localRes;
  }

  static eliminarUsuario(id, currentAdminId = null) {
    if (currentAdminId && Number(id) === Number(currentAdminId)) {
      return {
        ok: false,
        error: 'No podés eliminar la cuenta con la que estás conectado actualmente.'
      };
    }

    const db = CanchaDB.load();
    const target = db.usuarios_admin.find((u) => Number(u.id) === Number(id));
    if (!target) return { ok: false, error: 'Usuario no encontrado.' };

    const adminsActivos = db.usuarios_admin.filter(
      (u) => Number(u.id) !== Number(id) && u.rol === 'Administrador' && Number(u.activo) === 1
    );
    if (adminsActivos.length === 0) {
      return {
        ok: false,
        error: 'Debe permanecer al menos un Administrador activo en el sistema.'
      };
    }

    if (target.username?.toLowerCase() === 'sabo') {
      db.saboRemoved = true;
    }

    db.usuarios_admin = db.usuarios_admin.filter((u) => Number(u.id) !== Number(id));
    CanchaDB.save(db);

    SecurityAuditLogger.log('USUARIO_ELIMINADO', 'WARN', {
      username: target.username,
      rol: target.rol
    });

    return { ok: true };
  }

  static async eliminarUsuarioAsync(id, token = null, currentAdminId = null) {
    const localRes = this.eliminarUsuario(id, currentAdminId);
    if (!localRes.ok) return localRes;

    if (typeof window !== 'undefined' && token) {
      try {
        await fetch(`/api/admin/usuarios?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.warn('Eliminación local de usuario (sin conexión D1):', e);
      }
    }

    return localRes;
  }

  static desbloquearIntentosLogin(username = null) {
    if (username) {
      LoginBruteForceGuard.reset(username.toLowerCase());
    }
    LoginBruteForceGuard.reset('global');
    LoginBruteForceGuard.reset('admin');
    LoginBruteForceGuard.reset('tesoreria');
    LoginBruteForceGuard.reset('sabo');
    SecurityAuditLogger.log('LOCKOUT_RESET', 'INFO', {
      by: 'Administrador',
      target: username || 'todos'
    });
    return true;
  }

  static obtenerBitacoraSeguridad(limit = 12) {
    return SecurityAuditLogger.getRecentLogs(limit);
  }
}
