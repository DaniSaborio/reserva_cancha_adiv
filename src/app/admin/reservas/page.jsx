'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/AdminNav';
import {
  DashboardController,
  PagoService,
  ReservaService,
  AuthMiddleware
} from '@/lib/services';
import { formatColones, formatFechaCorta, formatDDMMYYYY } from '@/lib/utils';
import {
  FaCheck,
  FaClock,
  FaBan,
  FaCalendarPlus,
  FaMagnifyingGlass,
  FaMobileScreenButton,
  FaMoneyBillWave,
  FaArrowsRotate,
  FaCircleCheck,
  FaCircleExclamation
} from 'react-icons/fa6';

const HORAS_DISPONIBLES = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

export default function AdminReservasPage() {
  const [reservas, setReservas] = useState([]);
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [metodoFiltro, setMetodoFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  // Estado para liquidación de pago (HU-09)
  const [reservaPagoActiva, setReservaPagoActiva] = useState(null);
  const [metodoPagoForm, setMetodoPagoForm] = useState('SINPE Móvil');
  const [comprobanteForm, setComprobanteForm] = useState('SINPE-89421');

  // Estado para reprogramación (HU-12)
  const [reservaReprogActiva, setReservaReprogActiva] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState('2026-11-06');
  const [nuevaHora, setNuevaHora] = useState('16:00');

  // Estado para cancelación con motivo (HU-12)
  const [reservaCancelActiva, setReservaCancelActiva] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState(
    'Aviso anticipado del equipo / lluvia en Venecia'
  );

  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const cargarReservas = useCallback(() => {
    if (!AuthMiddleware.verificarToken()) {
      AuthMiddleware.validarCredenciales('admin@canchavenecia.cr', 'Venecia2026!');
    }
    const lista = DashboardController.listarReservasRecientes({
      estado: estadoFiltro,
      metodo: metodoFiltro,
      busqueda
    });
    setReservas(lista);
  }, [estadoFiltro, metodoFiltro, busqueda]);

  useEffect(() => {
    cargarReservas();
    const handleUpdate = () => cargarReservas();
    window.addEventListener('cancha-db-updated', handleUpdate);
    return () => window.removeEventListener('cancha-db-updated', handleUpdate);
  }, [cargarReservas]);

  const handleConfirmarPago = (e) => {
    e.preventDefault();
    if (!reservaPagoActiva) return;
    setMensajeError('');
    setMensajeExito('');

    const res = PagoService.registrarPago(reservaPagoActiva.id, {
      metodo_pago: metodoPagoForm,
      monto: reservaPagoActiva.monto_total,
      numero_comprobante: metodoPagoForm === 'SINPE Móvil' ? comprobanteForm : null
    });

    if (!res.ok) {
      setMensajeError(res.error);
      return;
    }

    setMensajeExito(
      `Pago liquidado exitosamente para ${reservaPagoActiva.codigo_reserva} (${reservaPagoActiva.cliente_nombre}) vía ${metodoPagoForm}.`
    );
    setReservaPagoActiva(null);
    cargarReservas();
  };

  const handleConfirmarReprogramacion = (e) => {
    e.preventDefault();
    if (!reservaReprogActiva) return;
    setMensajeError('');
    setMensajeExito('');

    const res = ReservaService.reprogramarReserva(
      reservaReprogActiva.id,
      nuevaFecha,
      nuevaHora
    );

    if (!res.ok) {
      setMensajeError(res.error);
      return;
    }

    setMensajeExito(
      `Reserva ${reservaReprogActiva.codigo_reserva} reprogramada al ${formatDDMMYYYY(
        nuevaFecha
      )} a las ${nuevaHora}.`
    );
    setReservaReprogActiva(null);
    cargarReservas();
  };

  const handleConfirmarCancelacion = (e) => {
    e.preventDefault();
    if (!reservaCancelActiva) return;
    setMensajeError('');
    setMensajeExito('');

    const res = ReservaService.cancelarReserva(
      reservaCancelActiva.id,
      motivoCancelacion
    );

    if (!res.ok) {
      setMensajeError(res.error);
      return;
    }

    setMensajeExito(
      `Reserva ${reservaCancelActiva.codigo_reserva} cancelada y horario liberado en el calendario público.`
    );
    setReservaCancelActiva(null);
    cargarReservas();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Gestión de Reservas y Liquidación de Pagos
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500">
          Conciliación de SINPE Móvil, cobros en efectivo, reprogramaciones y cancelaciones
        </p>
      </div>

      <AdminNav subtituloFecha=" Padrón General de Reservas" onResetDemo={cargarReservas} />

      {mensajeExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-cancha-900 text-xs sm:text-sm font-bold flex items-center gap-2">
          <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2">
          <FaCircleExclamation className="w-4 h-4 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Filtros de búsqueda */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar código, nombre o teléfono..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
            />
          </div>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
          >
            <option value="Todos">Estado: Todos ({reservas.length})</option>
            <option value="Pendiente">Pendientes de Pago</option>
            <option value="Confirmada">Confirmadas / Pagadas</option>
            <option value="Cancelada">Canceladas</option>
          </select>

          <select
            value={metodoFiltro}
            onChange={(e) => setMetodoFiltro(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
          >
            <option value="Todos">Método: Todos (Efectivo + SINPE)</option>
            <option value="SINPE Móvil">Solo SINPE Móvil</option>
            <option value="Efectivo">Solo Efectivo en caseta</option>
          </select>
        </div>
      </div>

      {/* Modal inline para Liquidación de Pago (HU-09) */}
      {reservaPagoActiva && (
        <form
          onSubmit={handleConfirmarPago}
          className="bg-emerald-50/90 rounded-3xl p-5 border-2 border-cancha-700 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-cancha-950">
              Registrar / Confirmar Pago — {reservaPagoActiva.codigo_reserva} (
              {reservaPagoActiva.cliente_nombre})
            </h2>
            <button
              type="button"
              onClick={() => setReservaPagoActiva(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Método de pago recibido
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPagoForm('SINPE Móvil')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 ${
                    metodoPagoForm === 'SINPE Móvil'
                      ? 'bg-cancha-800 text-white border-cancha-800'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <FaMobileScreenButton className="w-3.5 h-3.5" />
                  <span>SINPE Móvil</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPagoForm('Efectivo')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 ${
                    metodoPagoForm === 'Efectivo'
                      ? 'bg-cancha-800 text-white border-cancha-800'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <FaMoneyBillWave className="w-3.5 h-3.5" />
                  <span>Efectivo</span>
                </button>
              </div>
            </div>

            {metodoPagoForm === 'SINPE Móvil' && (
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Comprobante transferencia SINPE *
                </label>
                <input
                  type="text"
                  required
                  value={comprobanteForm}
                  onChange={(e) => setComprobanteForm(e.target.value)}
                  placeholder="Ej. SINPE-89421"
                  className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReservaPagoActiva(null)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cancha-800 hover:bg-cancha-900 text-white text-xs font-extrabold"
            >
              Confirmar cobro de {formatColones(reservaPagoActiva.monto_total)}
            </button>
          </div>
        </form>
      )}

      {/* Modal inline para Reprogramar Reserva (HU-12) */}
      {reservaReprogActiva && (
        <form
          onSubmit={handleConfirmarReprogramacion}
          className="bg-sky-50 rounded-3xl p-5 border-2 border-sky-400 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-sky-950">
              Reprogramar Turno — {reservaReprogActiva.codigo_reserva} (
              {reservaReprogActiva.cliente_nombre})
            </h2>
            <button
              type="button"
              onClick={() => setReservaReprogActiva(null)}
              className="text-xs font-bold text-slate-500"
            >
              Cerrar ✕
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Nueva fecha
              </label>
              <input
                type="date"
                required
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Nueva hora de inicio
              </label>
              <select
                value={nuevaHora}
                onChange={(e) => setNuevaHora(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold"
              >
                {HORAS_DISPONIBLES.map((h) => (
                  <option key={h} value={h}>
                    {h} – {parseInt(h, 10) + 1}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReservaReprogActiva(null)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-extrabold"
            >
              Guardar nueva fecha y hora
            </button>
          </div>
        </form>
      )}

      {/* Modal inline para Cancelar Reserva con motivo (HU-12) */}
      {reservaCancelActiva && (
        <form
          onSubmit={handleConfirmarCancelacion}
          className="bg-rose-50 rounded-3xl p-5 border-2 border-rose-300 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-rose-950">
              Cancelar Reserva y Liberar Horario — {reservaCancelActiva.codigo_reserva}
            </h2>
            <button
              type="button"
              onClick={() => setReservaCancelActiva(null)}
              className="text-xs font-bold text-slate-500"
            >
              Cerrar ✕
            </button>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-rose-900 mb-1">
              Motivo de cancelación (para auditoría de la Asociación) *
            </label>
            <input
              type="text"
              required
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-rose-300 text-xs font-bold text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReservaCancelActiva(null)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700"
            >
              Volver
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold"
            >
              Confirmar cancelación y liberar cancha
            </button>
          </div>
        </form>
      )}

      {/* Listado de Reservas */}
      <div className="space-y-3">
        {reservas.map((r) => {
          const esConfirmada = r.estado === 'Confirmada';
          const esPendiente = r.estado === 'Pendiente';
          const metodoTexto = r.pago ? r.pago.metodo_pago : `${r.metodo_pago_previsto} (Previsto)`;

          return (
            <div
              key={r.id}
              className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                    {r.codigo_reserva}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 capitalize">
                    {formatFechaCorta(r.fecha_reserva)} · {r.hora_inicio}–{r.hora_fin}
                  </span>
                  {esConfirmada && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-cancha-900 border border-emerald-200">
                      <FaCheck className="w-2.5 h-2.5" />
                      <span>Confirmada</span>
                    </span>
                  )}
                  {esPendiente && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                      <FaClock className="w-2.5 h-2.5" />
                      <span>Pendiente de Pago</span>
                    </span>
                  )}
                  {r.estado === 'Cancelada' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                      <span>Cancelada</span>
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base font-extrabold text-slate-900">
                  {r.cliente_nombre}{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    · Tel: {r.cliente_telefono}
                  </span>
                </p>

                <p className="text-xs text-slate-600">
                  <strong>Monto:</strong> {formatColones(r.monto_total)} ·{' '}
                  <strong>Método:</strong> {metodoTexto}
                  {r.pago?.numero_comprobante && (
                    <span className="ml-2 font-bold text-cancha-800">
                      (Ref: {r.pago.numero_comprobante})
                    </span>
                  )}
                </p>
              </div>

              {/* Botones operativos del administrador */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {r.estado !== 'Cancelada' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setReservaPagoActiva(r);
                        setReservaReprogActiva(null);
                        setReservaCancelActiva(null);
                        setMetodoPagoForm(
                          r.metodo_pago_previsto === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil'
                        );
                        setComprobanteForm(r.pago?.numero_comprobante || 'SINPE-89421');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-cancha-700 hover:bg-cancha-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                    >
                      <FaCheck className="w-3 h-3" />
                      <span>{esPendiente ? 'Registrar Pago' : 'Editar Pago'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReservaReprogActiva(r);
                        setReservaPagoActiva(null);
                        setReservaCancelActiva(null);
                        setNuevaFecha(r.fecha_reserva);
                        setNuevaHora(r.hora_inicio);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <FaArrowsRotate className="w-3 h-3" />
                      <span>Reprogramar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReservaCancelActiva(r);
                        setReservaPagoActiva(null);
                        setReservaReprogActiva(null);
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <FaBan className="w-3 h-3" />
                      <span>Cancelar</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
