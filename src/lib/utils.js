// Utilidades de formato para moneda costarricense (₡), fechas y enlaces de WhatsApp

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export function formatColones(monto) {
  const num = Number(monto || 0);
  return `₡${num.toLocaleString('es-CR')}`;
}

export function parseFechaISO(fechaStr) {
  if (!fechaStr || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return new Date(2026, 10, 6);
  }
  const [y, m, d] = fechaStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toFechaISO(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatFechaLarga(fechaStr) {
  const d = parseFechaISO(fechaStr);
  const diaNombre = DIAS_SEMANA[d.getDay()];
  const diaNum = d.getDate();
  const mesNombre = MESES[d.getMonth()];
  return `${diaNombre}, ${diaNum} de ${mesNombre}`;
}

export function formatFechaCorta(fechaStr) {
  const d = parseFechaISO(fechaStr);
  const diaNombre = DIAS_SEMANA[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${diaNombre} ${dd}/${mm}`;
}

export function formatDDMMYYYY(fechaStr) {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-');
  return `${d}/${m}/${y}`;
}

export function sumarDiasISO(fechaStr, dias) {
  const d = parseFechaISO(fechaStr);
  d.setDate(d.getDate() + dias);
  return toFechaISO(d);
}

export function obtenerLunesDeSemana(fechaStr) {
  const d = parseFechaISO(fechaStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toFechaISO(d);
}

export function formatHora12(hora24) {
  if (!hora24 || typeof hora24 !== 'string' || !hora24.includes(':')) {
    return hora24 || '';
  }
  const [hhRaw, mmRaw] = hora24.split(':');
  const hh = parseInt(hhRaw, 10);
  const mm = String(parseInt(mmRaw, 10) || 0).padStart(2, '0');
  if (!Number.isFinite(hh)) return hora24;
  const periodo = hh >= 12 && hh < 24 ? 'PM' : 'AM';
  const hora12 = hh % 12 || 12;
  return `${hora12}:${mm} ${periodo}`;
}

export function formatRangoHora12(horaInicio, horaFin) {
  if (!horaInicio) return '';
  let hFin = horaFin;
  if (!hFin && horaInicio.includes(':')) {
    const hNum = parseInt(horaInicio.split(':')[0], 10);
    if (Number.isFinite(hNum)) {
      hFin = `${String(hNum + 1).padStart(2, '0')}:00`;
    }
  }
  if (!hFin) return formatHora12(horaInicio);
  return `${formatHora12(horaInicio)} – ${formatHora12(hFin)}`;
}

export function getAhoraCostaRica() {
  try {
    const now = new Date();
    // hourCycle: 'h23' garantiza rango estricto 00-23 en WebKit / Safari
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    }).formatToParts(now);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const hourNum = Number(map.hour) === 24 ? 0 : Number(map.hour);
    const minNum = Number(map.minute) || 0;
    const horaActual = `${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
    return {
      fechaISO: `${map.year}-${map.month}-${map.day}`,
      horaActual,
      hora12: formatHora12(horaActual),
      minutosDelDia: hourNum * 60 + minNum
    };
  } catch {
    const d = new Date();
    const fechaISO = d.toISOString().slice(0, 10);
    const h = d.getHours();
    const m = d.getMinutes();
    const horaActual = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return {
      fechaISO,
      horaActual,
      hora12: formatHora12(horaActual),
      minutosDelDia: h * 60 + m
    };
  }
}

export function esFranjaPasada(fechaISO, horaInicio, ahoraCR = getAhoraCostaRica()) {
  if (!fechaISO || !horaInicio || !ahoraCR?.fechaISO) return false;
  if (fechaISO < ahoraCR.fechaISO) return true;
  if (fechaISO > ahoraCR.fechaISO) return false;
  const [hh, mm] = String(horaInicio).split(':').map(Number);
  const inicioMinutos = (hh || 0) * 60 + (mm || 0);
  return ahoraCR.minutosDelDia >= inicioMinutos;
}

export function generarEnlaceWhatsApp(reserva, cancha) {
  if (!reserva) return 'https://api.whatsapp.com/send';
  const estadoPago = reserva.estado === 'Confirmada' ? 'Pago verificado y confirmado' : 'Pendiente de verificación';
  const instrucciones =
    reserva.metodo_pago_previsto === 'Efectivo'
      ? `Pago presencial en caseta antes del partido (${formatColones(reserva.monto_total)}).`
      : `SINPE Móvil: ${cancha?.sinpe_oficial || '8888-9999'} (${cancha?.sinpe_titular || 'Cancha Venecia'}) indicando "${reserva.codigo_reserva}" en el detalle.`;

  const texto = [
    `*ADIV Cancha — Venecia*`,
    `¡Horario reservado para jugar!`,
    ``,
    `*Código:* ${reserva.codigo_reserva}`,
    `*Cancha:* ${cancha?.nombre_corto || 'Sintética comunal'}`,
    `*Fecha:* ${formatFechaCorta(reserva.fecha_reserva)}`,
    `*Hora:* ${formatRangoHora12(reserva.hora_inicio, reserva.hora_fin)}`,
    `*Titular / Equipo:* ${reserva.cliente_nombre}`,
    reserva.cantidad_personas ? `*Asistentes:* ${reserva.cantidad_personas} personas` : null,
    `*${reserva.cantidad_personas ? 'Monto estimado' : 'Monto'}:* ${formatColones(reserva.monto_total)}`,
    `*Estado:* ${estadoPago}`,
    ``,
    `${instrucciones}`
  ]
    .filter((line) => line !== null)
    .join('\n');

  // api.whatsapp.com/send es compatible con Safari en iOS sin provocar alertas de redirección inválida
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
}

export function getFechaHoyISO() {
  try {
    const cr = getAhoraCostaRica();
    if (cr?.fechaISO) return cr.fechaISO;
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' }).replace(/[^0-9-]/g, '');
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
