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

export function generarEnlaceWhatsApp(reserva, cancha) {
  if (!reserva) return 'https://wa.me/';
  const estadoPago = reserva.estado === 'Confirmada' ? 'Pago verificado y confirmado' : 'Pendiente de verificación';
  const instrucciones =
    reserva.metodo_pago_previsto === 'Efectivo'
      ? `Pago presencial en caseta antes del partido (${formatColones(reserva.monto_total)}).`
      : `SINPE Móvil: ${cancha?.sinpe_oficial || '8888-9999'} (ADI Venecia) indicando "${reserva.codigo_reserva}" en el detalle.`;

  const texto = [
    `*CanchaApp — ADI Venecia*`,
    `¡Horario reservado para jugar!`,
    ``,
    `*Código:* ${reserva.codigo_reserva}`,
    `*Cancha:* ${cancha?.nombre_corto || 'Sintética comunal'}`,
    `*Fecha:* ${formatFechaCorta(reserva.fecha_reserva)}`,
    `*Hora:* ${reserva.hora_inicio}–${reserva.hora_fin}`,
    `*Titular / Equipo:* ${reserva.cliente_nombre}`,
    `*Monto:* ${formatColones(reserva.monto_total)}`,
    `*Estado:* ${estadoPago}`,
    ``,
    `${instrucciones}`
  ].join('\n');

  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
