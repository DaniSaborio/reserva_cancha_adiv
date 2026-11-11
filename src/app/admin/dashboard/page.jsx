'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import {
  DashboardController,
  PagoService,
  ReservaService,
  AuthMiddleware
} from '@/lib/services';
import { formatColones, formatDDMMYYYY, formatFechaCorta } from '@/lib/utils';
import {
  FaCheck,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaMagnifyingGlass,
  FaMobileScreenButton,
  FaMoneyBillWave,
  FaBan,
  FaCircleCheck,
  FaUserShield
} from 'react-icons/fa6';

export default function AdminDashboardPage() {
  const [session, setSession] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [fechaActiva, setFechaActiva] = useState('2026-11-06');
  const [metricas, setMetricas] = useState(null);
  const [reservasDia, setReservasDia] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarOcupacion, setMostrarOcupacion] = useState(true);
  const [mostrarReservasDia, setMostrarReservasDia] = useState(true);
  const [reservaAbiertaId, setReservaAbiertaId] = useState(null);
  const [metodoCobro, setMetodoCobro] = useState('SINPE Móvil');
  const [comprobanteInput, setComprobanteInput] = useState('SINPE-89421');
  const [avisoExito, setAvisoExito] = useState('');
  const [avisoError, setAvisoError] = useState('');

  const recargarDatos = useCallback(() => {
    const ses = AuthMiddleware.verificarToken();
    setSession(ses);
    const m = DashboardController.obtenerMetricasIngresos(fechaActiva);
    setMetricas(m);

    const filtro = busqueda.trim()
      ? { busqueda }
      : { fecha: fechaActiva };
    const lista = DashboardController.listarReservasRecientes(filtro);
    setReservasDia(lista);
  }, [fechaActiva, busqueda]);

  useEffect(() => {
    setMounted(true);
    recargarDatos();
    const handleUpdate = () => recargarDatos();
    window.addEventListener('cancha-db-updated', handleUpdate);
    window.addEventListener('cancha-auth-updated', handleUpdate);
    return () => {
      window.removeEventListener('cancha-db-updated', handleUpdate);
      window.removeEventListener('cancha-auth-updated', handleUpdate);
    };
  }, [recargarDatos]);

  const handleAccesoRapidoDemo = () => {
    AuthMiddleware.validarCredenciales('admin@canchavenecia.cr', 'Venecia2026!');
    recargarDatos();
  };

  const handleConfirmarPago = (reserva) => {
    setAvisoError('');
    setAvisoExito('');
    const res = PagoService.registrarPago(reserva.id, {
      metodo_pago: metodoCobro,
      monto: reserva.monto_total,
      numero_comprobante: metodoCobro === 'SINPE Móvil' ? comprobanteInput : null,
      registrado_por: session?.admin?.nombre || 'Carlos Pérez (Encargado)'
    });

    if (!res.ok) {
      setAvisoError(res.error || 'No se pudo registrar el pago.');
      return;
    }

    setAvisoExito(
      `Pago confirmado para ${reserva.codigo_reserva} (${reserva.cliente_nombre}) por ${formatColones(
        reserva.monto_total
      )} vía ${metodoCobro}.`
    );
    setReservaAbiertaId(null);
    recargarDatos();
  };

  const handleCancelarReserva = (reserva) => {
    ReservaService.cancelarReserva(reserva.id, 'Cancelada desde el panel de control diario');
    setAvisoExito(
      `Reserva ${reserva.codigo_reserva} cancelada. El horario ${reserva.hora_inicio}–${reserva.hora_fin} quedó libre en el calendario público.`
    );
    setReservaAbiertaId(null);
    recargarDatos();
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
        Cargando panel administrativo...
      </div>
    );
  }

  // Protección de ruta con opción de inicio de sesión en 1 toque
  if (!session) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cancha-900 text-emerald-300 flex items-center justify-center mx-auto">
          <FaUserShield className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">
          Sesión Administrativa Requerida
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          El módulo financiero está protegido con autenticación JWT (RF-06 / RNF-04). Iniciá sesión para consultar los ingresos y gestionar cobros.
        </p>
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleAccesoRapidoDemo}
            className="w-full py-3.5 px-4 rounded-xl bg-cancha-800 hover:bg-cancha-900 text-white font-extrabold text-xs sm:text-sm transition-colors"
          >
            Entrar como Carlos Pérez (Encargado ADI)
          </button>
          <Link
            href="/admin/login/"
            className="block w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Ir al formulario de inicio de sesión (/admin/login)
          </Link>
        </div>
      </div>
    );
  }

  const hoyMetrics = metricas?.hoy || {
    totalRecaudado: 32000,
    pendientePorCobrar: 16000
  };
  const globalMetrics = metricas?.global || {
    totalRecaudado: 64000,
    totalSinpe: 32000,
    totalEfectivo: 32000,
    pctSinpe: 50,
    pctEfectivo: 50,
    metaTotal: 64000
  };
  const ocupacion = metricas?.ocupacionSemanal || {
    porcentajeTexto: '10,2%',
    porcentajeNumero: 10.2,
    horasOcupadas: 5,
    horasTotales: 49,
    desgloseDias: []
  };

  return (
    <div className="space-y-5">
      {/* Encabezado Principal de UI-24 (P12_CanchaApp.png) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Resumen de hoy
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Control financiero y operativo · Asociación de Desarrollo Integral de Venecia
          </p>
        </div>

        {/* Selector rápido de jornada operativa */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFechaActiva('2026-11-06')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              fechaActiva === '2026-11-06'
                ? 'bg-cancha-900 text-white border-cancha-900'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Viernes 06/11
          </button>
          <button
            type="button"
            onClick={() => setFechaActiva('2026-11-07')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              fechaActiva === '2026-11-07'
                ? 'bg-cancha-900 text-white border-cancha-900'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            Sábado 07/11
          </button>
          <input
            type="date"
            value={fechaActiva}
            onChange={(e) => e.target.value && setFechaActiva(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-800"
          />
        </div>
      </div>

      {/* Navegación Administrativa (Resumen · Reservas · Bloqueos · Reportes · Cerrar sesión) */}
      <AdminNav
        subtituloFecha={`${formatFechaCorta(fechaActiva)} (${formatDDMMYYYY(fechaActiva)})`}
        onResetDemo={recargarDatos}
      />

      {avisoExito && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-cancha-900 text-xs sm:text-sm font-bold flex items-center gap-2.5">
          <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{avisoExito}</span>
        </div>
      )}

      {avisoError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold">
          {avisoError}
        </div>
      )}

      {/* =================================================================== */}
      {/* TARJETA KPI PRINCIPAL: INGRESOS RECIBIDOS HOY (UI-24 / P12)          */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            Ingresos recibidos hoy
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            <FaClock className="w-3 h-3" />
            <span>Por cobrar: {formatColones(hoyMetrics.pendientePorCobrar)}</span>
          </span>
        </div>

        <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {formatColones(hoyMetrics.totalRecaudado)}
        </div>

        {/* Desglose Global / Noviembre · SINPE vs Efectivo (UI-24) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Global / noviembre</span>
            <span className="font-extrabold text-slate-900">
              {formatColones(globalMetrics.totalRecaudado)} /{' '}
              {formatColones(globalMetrics.totalRecaudado)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <FaMobileScreenButton className="w-3.5 h-3.5 text-cancha-700" />
              <span>SINPE · global</span>
            </span>
            <span className="font-extrabold text-slate-900">
              {formatColones(globalMetrics.totalSinpe)} · {globalMetrics.pctSinpe}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <FaMoneyBillWave className="w-3.5 h-3.5 text-emerald-600" />
              <span>Efectivo · global</span>
            </span>
            <span className="font-extrabold text-slate-900">
              {formatColones(globalMetrics.totalEfectivo)} · {globalMetrics.pctEfectivo}%
            </span>
          </div>

          {/* Barra de proporción SINPE vs Efectivo */}
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="bg-cancha-700 h-full transition-all duration-300"
              style={{ width: `${globalMetrics.pctSinpe}%` }}
              title={`SINPE Móvil: ${globalMetrics.pctSinpe}%`}
            />
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${globalMetrics.pctEfectivo}%` }}
              title={`Efectivo: ${globalMetrics.pctEfectivo}%`}
            />
          </div>

          <p className="text-[11px] text-slate-400 pt-0.5">
            Recibido excluye pendientes y reversos.
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TARJETA OCUPACIÓN SEMANAL · 10,2% (UI-24 / P12)                      */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
        <button
          type="button"
          onClick={() => setMostrarOcupacion(!mostrarOcupacion)}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-sm sm:text-base font-extrabold text-slate-900">
            Ocupación semanal · {ocupacion.porcentajeTexto}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-cancha-800">
            <span>{mostrarOcupacion ? 'Ocultar' : 'Desplegar'}</span>
            {mostrarOcupacion ? (
              <FaChevronUp className="w-3 h-3" />
            ) : (
              <FaChevronDown className="w-3 h-3" />
            )}
          </span>
        </button>

        {mostrarOcupacion && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {ocupacion.horasOcupadas} horas reservadas de {ocupacion.horasTotales} horas semanales disponibles
              </span>
              <span className="font-bold text-cancha-800">{ocupacion.porcentajeTexto}</span>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end pt-2 h-24">
              {ocupacion.desgloseDias.map((d) => {
                const alturaPct = Math.max(12, Math.round((d.ocupadas / d.total) * 100));
                return (
                  <button
                    key={d.fecha}
                    type="button"
                    onClick={() => setFechaActiva(d.fecha)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span className="text-[10px] font-bold text-slate-500">
                      {d.ocupadas}h
                    </span>
                    <div className="w-full bg-slate-100 rounded-lg h-14 flex items-end overflow-hidden p-0.5">
                      <div
                        className={`w-full rounded-md transition-all ${
                          d.ocupadas > 0
                            ? 'bg-cancha-700 group-hover:bg-cancha-800'
                            : 'bg-slate-200'
                        }`}
                        style={{ height: `${alturaPct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[11px] font-bold ${
                        d.fecha === fechaActiva ? 'text-cancha-800 underline' : 'text-slate-600'
                      }`}
                    >
                      {d.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* BUSCADOR RÁPIDO POR CÓDIGO, NOMBRE O TELÉFONO (UI-24)                */}
      {/* =================================================================== */}
      <div className="space-y-1.5">
        <label
          htmlFor="buscar-reserva-admin"
          className="block text-xs font-extrabold text-slate-800 px-1"
        >
          Buscar reserva
        </label>
        <div className="relative">
          <FaMagnifyingGlass className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="buscar-reserva-admin"
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Código, nombre o teléfono..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700 shadow-2xs"
          />
        </div>
      </div>

      {/* =================================================================== */}
      {/* LISTA OPERATIVA: RESERVAS DEL DÍA (UI-24 / P12)                      */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {busqueda.trim() ? 'Resultados de búsqueda' : 'Reservas del día'}
            </h2>
            <p className="text-xs text-slate-500 capitalize">
              {busqueda.trim()
                ? `Filtrando por "${busqueda}"`
                : `${formatFechaCorta(fechaActiva)} · ${reservasDia.length} ${
                    reservasDia.length === 1 ? 'turno registrado' : 'turnos registrados'
                  }`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarReservasDia(!mostrarReservasDia)}
            className="inline-flex items-center gap-1 text-xs font-bold text-cancha-800"
          >
            <span>{mostrarReservasDia ? 'Ocultar' : 'Desplegar'}</span>
            {mostrarReservasDia ? (
              <FaChevronUp className="w-3 h-3" />
            ) : (
              <FaChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {mostrarReservasDia && (
          <div className="space-y-3">
            {reservasDia.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs sm:text-sm text-slate-500">
                No hay reservas registradas para este filtro.
              </div>
            ) : (
              reservasDia.map((res) => {
                const abierto = reservaAbiertaId === res.id;
                const esConfirmada = res.estado === 'Confirmada';
                const esPendiente = res.estado === 'Pendiente';
                const metodoActual = res.pago
                  ? res.pago.metodo_pago === 'SINPE Móvil'
                    ? 'SINPE'
                    : 'Efectivo'
                  : res.metodo_pago_previsto;

                return (
                  <div
                    key={res.id}
                    className="rounded-2xl bg-slate-50/90 border border-slate-200/90 p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                            {res.hora_inicio}–{res.hora_fin}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            · {res.codigo_reserva}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-900">
                          {res.cliente_nombre}
                        </p>

                        <div className="pt-0.5">
                          {esConfirmada && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-cancha-900 border border-emerald-200">
                              <FaCheck className="w-2.5 h-2.5" />
                              <span>
                                {metodoActual} · {formatColones(res.monto_total)}
                              </span>
                            </span>
                          )}
                          {esPendiente && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                              <FaClock className="w-2.5 h-2.5" />
                              <span>Pendiente · {formatColones(res.monto_total)}</span>
                            </span>
                          )}
                          {res.estado === 'Cancelada' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                              <span>Cancelada</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (abierto) {
                            setReservaAbiertaId(null);
                          } else {
                            setReservaAbiertaId(res.id);
                            setMetodoCobro(
                              res.metodo_pago_previsto === 'Efectivo'
                                ? 'Efectivo'
                                : 'SINPE Móvil'
                            );
                            setComprobanteInput(
                              res.pago?.numero_comprobante || 'SINPE-89421'
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-xs font-extrabold text-cancha-800"
                      >
                        <span>{abierto ? 'Cerrar' : 'Abrir'}</span>
                        {abierto ? (
                          <FaChevronUp className="w-2.5 h-2.5" />
                        ) : (
                          <FaChevronDown className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>

                    {/* Panel desplegable de liquidación rápida (HU-09 / PT-APP-03) */}
                    {abierto && (
                      <div className="pt-3 border-t border-slate-200/80 space-y-3 text-xs">
                        <div className="grid sm:grid-cols-2 gap-2 text-slate-600">
                          <p>
                            <strong>Teléfono:</strong> {res.cliente_telefono}
                          </p>
                          <p>
                            <strong>Fecha:</strong> {formatDDMMYYYY(res.fecha_reserva)}
                          </p>
                          {res.pago?.numero_comprobante && (
                            <p className="sm:col-span-2 text-cancha-800 font-bold">
                              Comprobante registrado: {res.pago.numero_comprobante}
                            </p>
                          )}
                        </div>

                        {res.estado !== 'Cancelada' && (
                          <div className="bg-white rounded-xl p-3.5 border border-slate-200 space-y-3">
                            <p className="font-extrabold text-slate-900">
                              {esPendiente
                                ? 'Liquidar y confirmar cobro de la reserva:'
                                : 'Actualizar método de pago o comprobante:'}
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setMetodoCobro('SINPE Móvil')}
                                className={`py-2 px-3 rounded-xl font-bold border flex items-center justify-center gap-1.5 ${
                                  metodoCobro === 'SINPE Móvil'
                                    ? 'bg-emerald-50 border-cancha-700 text-cancha-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <FaMobileScreenButton className="w-3.5 h-3.5" />
                                <span>SINPE Móvil</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setMetodoCobro('Efectivo')}
                                className={`py-2 px-3 rounded-xl font-bold border flex items-center justify-center gap-1.5 ${
                                  metodoCobro === 'Efectivo'
                                    ? 'bg-emerald-50 border-cancha-700 text-cancha-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                <FaMoneyBillWave className="w-3.5 h-3.5" />
                                <span>Efectivo en caseta</span>
                              </button>
                            </div>

                            {metodoCobro === 'SINPE Móvil' && (
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                  Número de comprobante SINPE Móvil *
                                </label>
                                <input
                                  type="text"
                                  value={comprobanteInput}
                                  onChange={(e) => setComprobanteInput(e.target.value)}
                                  placeholder="Ej. SINPE-89421"
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900"
                                />
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleConfirmarPago(res)}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-cancha-700 hover:bg-cancha-800 text-white font-extrabold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <FaCheck className="w-3.5 h-3.5" />
                                <span>
                                  Confirmar pago {formatColones(res.monto_total)} ({metodoCobro})
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancelarReserva(res)}
                                className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center gap-1 transition-colors"
                              >
                                <FaBan className="w-3 h-3" />
                                <span>Cancelar turno</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <Link
          href="/admin/reservas/"
          className="block w-full py-3 px-4 rounded-2xl border border-slate-200 hover:bg-slate-50 text-center text-xs sm:text-sm font-extrabold text-slate-800 transition-colors"
        >
          Ver todas las reservas
        </Link>
      </div>

      {/* Pie de página administrativo estilo UI-24 */}
      <div className="text-[11px] font-semibold text-slate-400 px-1 space-y-0.5">
        <p>Acceso exclusivo para personal autorizado.</p>
        <p>
          Cancha comunal · Venecia, San Carlos, Costa Rica · Sin cuenta · Reserva en tres pasos · ₡16 000 / hora
        </p>
      </div>
    </div>
  );
}
