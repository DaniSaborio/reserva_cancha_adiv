'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReservaService, AgendaManager } from '@/lib/services';
import {
  formatColones,
  formatFechaLarga,
  formatDDMMYYYY,
  sumarDiasISO,
  obtenerLunesDeSemana,
  parseFechaISO
} from '@/lib/utils';
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaCheck,
  FaClock,
  FaWrench,
  FaRegCircle,
  FaArrowRight,
  FaShieldHalved,
  FaMagnifyingGlass,
  FaUserShield
} from 'react-icons/fa6';

const DIAS_MATRIZ = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMBRES_DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const NOMBRES_DIA_COMPLETO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_TITULO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function HomePage() {
  const router = useRouter();
  // Fecha inicial: 2026-11-06 (Viernes 6 de noviembre de 2026) como en UI-01, UI-02, UI-03 y Datos Semilla
  const [vista, setVista] = useState('dia'); // 'dia' | 'semana' | 'mes'
  const [fechaSeleccionada, setFechaSeleccionada] = useState('2026-11-06');
  const [franjasDia, setFranjasDia] = useState([]);
  const [celdaSemanalActiva, setCeldaSemanalActiva] = useState({
    fecha: '2026-11-06',
    hora_inicio: '16:00',
    hora_fin: '17:00',
    precio: 16000,
    disponible: true
  });
  const [matrizSemana, setMatrizSemana] = useState([]);
  const [diasMes, setDiasMes] = useState([]);

  const cargarDisponibilidad = useCallback(() => {
    // 1. Disponibilidad del día seleccionado (UI-01 y panel inferior de UI-03)
    const franjas = ReservaService.verificarDisponibilidad(fechaSeleccionada);
    setFranjasDia(franjas);

    // 2. Matriz de 7 días para la Vista Semanal (UI-02)
    const lunesISO = obtenerLunesDeSemana(fechaSeleccionada);
    const diasDeSemana = [];
    for (let i = 0; i < 7; i++) {
      const fISO = sumarDiasISO(lunesISO, i);
      const dObj = parseFechaISO(fISO);
      const disp = ReservaService.verificarDisponibilidad(fISO);
      diasDeSemana.push({
        fecha: fISO,
        diaNumero: dObj.getDate(),
        letra: DIAS_MATRIZ[i],
        nombreCorto: NOMBRES_DIA_CORTO[dObj.getDay()],
        nombreMinuscula: NOMBRES_DIA_COMPLETO[dObj.getDay()],
        franjas: disp
      });
    }
    setMatrizSemana(diasDeSemana);

    // Ajustar celda semanal activa si la fecha cambió
    const primeraLibre = franjas.find((f) => f.disponible) || franjas[0];
    if (primeraLibre) {
      setCeldaSemanalActiva({
        fecha: fechaSeleccionada,
        hora_inicio: primeraLibre.hora_inicio,
        hora_fin: primeraLibre.hora_fin,
        precio: primeraLibre.precio,
        disponible: primeraLibre.disponible,
        estado: primeraLibre.estado
      });
    }

    // 3. Cuadrícula mensual (UI-03)
    const dSel = parseFechaISO(fechaSeleccionada);
    const calMes = AgendaManager.obtenerCalendarioMensual(dSel.getFullYear(), dSel.getMonth());
    setDiasMes(calMes);
  }, [fechaSeleccionada]);

  useEffect(() => {
    cargarDisponibilidad();
    const handleStorageUpdate = () => cargarDisponibilidad();
    window.addEventListener('cancha-db-updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('cancha-db-updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [cargarDisponibilidad]);

  const cambiarDia = (delta) => {
    setFechaSeleccionada((prev) => sumarDiasISO(prev, delta));
  };

  const cambiarMes = (delta) => {
    const d = parseFechaISO(fechaSeleccionada);
    const nuevo = new Date(d.getFullYear(), d.getMonth() + delta, 1);
    const y = nuevo.getFullYear();
    const m = String(nuevo.getMonth() + 1).padStart(2, '0');
    setFechaSeleccionada(`${y}-${m}-01`);
  };

  const irAReservar = (fecha, horaInicio) => {
    router.push(`/reservar/?fecha=${encodeURIComponent(fecha)}&hora=${encodeURIComponent(horaInicio)}`);
  };

  const dateObj = parseFechaISO(fechaSeleccionada);
  const anioActual = dateObj.getFullYear();
  const mesActualIdx = dateObj.getMonth();
  const primerDiaSemanaMes = new Date(anioActual, mesActualIdx, 1).getDay();
  const offsetLunes = primerDiaSemanaMes === 0 ? 6 : primerDiaSemanaMes - 1;

  // Rango de la semana activa (ej. "2–8 de noviembre de 2026")
  const lunesSemana = matrizSemana[0]?.fecha ? parseFechaISO(matrizSemana[0].fecha) : dateObj;
  const domingoSemana = matrizSemana[6]?.fecha ? parseFechaISO(matrizSemana[6].fecha) : dateObj;
  const textoRangoSemana = `${lunesSemana.getDate()}–${domingoSemana.getDate()} de ${MESES_TITULO[domingoSemana.getMonth()].toLowerCase()} de ${domingoSemana.getFullYear()}`;

  const horasLibresHoy = franjasDia.filter((f) => f.disponible).length;

  return (
    <div className="space-y-6">
      {/* Contenedor Principal estilo tarjeta móvil/desktop de Wireframes UI-01 / UI-02 / UI-03 */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
        {/* Encabezado dinámico según la vista (UI-01, UI-02, UI-03) */}
        <div className="space-y-1.5">
          {vista === 'dia' && (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Nos vemos en la cancha
              </h1>
              <p className="text-sm text-slate-600">
                Elegí una hora y armá tu partido.
              </p>
            </>
          )}
          {vista === 'semana' && (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Tu semana de fútbol
              </h1>
              <p className="text-sm text-slate-600">{textoRangoSemana}</p>
            </>
          )}
          {vista === 'mes' && (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Elegí el día del partido
              </h1>
              <p className="text-sm text-slate-600">Disponibilidad mensual</p>
            </>
          )}
        </div>

        {/* Barra de Progreso en 3 Pasos (Paso 1: Horario · Paso 2: Contacto · Paso 3: Comprobante) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-cancha-800" />
            <p className="text-xs font-bold text-cancha-900">1 · Horario</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-slate-200" />
            <p className="text-xs font-medium text-slate-400">2 · Contacto</p>
          </div>
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-slate-200" />
            <p className="text-xs font-medium text-slate-400">3 · Comprobante</p>
          </div>
        </div>

        {/* Selector Temporal: Pestañas Día, Semana y Mes + Accesos rápidos de Fecha */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center p-1 rounded-full bg-slate-100 border border-slate-200">
            {[
              { id: 'dia', label: 'Día' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  vista === tab.id
                    ? 'bg-emerald-100 text-cancha-900 shadow-2xs border border-emerald-300/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setFechaSeleccionada('2026-11-06')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                fechaSeleccionada === '2026-11-06'
                  ? 'bg-cancha-900 text-white border-cancha-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Viernes 06/11 (Demo)
            </button>
            <button
              onClick={() => setFechaSeleccionada('2026-11-07')}
              className={`px-3 py-1.5 rounded-xl font-bold border transition-colors ${
                fechaSeleccionada === '2026-11-07'
                  ? 'bg-cancha-900 text-white border-cancha-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              Sábado 07/11
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* VISTA 1: VISTA DIARIA DE HORARIOS DISPONIBLES (UI-01 / P02)         */}
        {/* =================================================================== */}
        {vista === 'dia' && (
          <div className="space-y-5">
            {/* Navegador de fecha */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cambiarDia(-1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    aria-label="Día anterior"
                  >
                    <FaChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 capitalize">
                    {formatFechaLarga(fechaSeleccionada)}
                  </span>
                  <button
                    onClick={() => cambiarDia(1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    aria-label="Día siguiente"
                  >
                    <FaChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <span className="text-xs font-bold text-cancha-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {horasLibresHoy} {horasLibresHoy === 1 ? 'hora libre' : 'horas libres'}
                </span>
              </div>

              {/* Input selector de fecha estilo UI-01 ("06/11/2026 · Hoy") */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
                  <FaCalendarDay className="w-4 h-4 text-cancha-700" />
                  <span>{formatDDMMYYYY(fechaSeleccionada)}</span>
                  {fechaSeleccionada === '2026-11-06' && (
                    <span className="text-xs font-semibold text-cancha-700">· Fecha activa</span>
                  )}
                </div>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => e.target.value && setFechaSeleccionada(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cancha-600"
                  aria-label="Seleccionar fecha específica"
                />
              </div>
            </div>

            {/* Bloque de Horarios disponibles (16:00-23:00 · ₡16 000 por hora) */}
            <div className="space-y-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Horarios disponibles
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  16:00–23:00 · ₡16 000 por hora
                </p>
              </div>

              <div className="grid gap-2.5">
                {franjasDia.map((franja) => {
                  if (franja.estado === 'Libre') {
                    return (
                      <button
                        key={franja.hora_inicio}
                        onClick={() => irAReservar(fechaSeleccionada, franja.hora_inicio)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white hover:bg-emerald-50/50 border-2 border-cancha-700/60 hover:border-cancha-700 transition-all group text-left shadow-2xs"
                      >
                        <div>
                          <span className="text-sm sm:text-base font-extrabold text-slate-900">
                            {franja.label}
                          </span>
                          <span className="hidden sm:inline-block ml-3 text-xs font-medium text-slate-500">
                            Cancha sintética · {formatColones(franja.precio)}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-cancha-800 border border-emerald-200 group-hover:bg-cancha-800 group-hover:text-white transition-colors">
                          <FaRegCircle className="w-3 h-3" />
                          <span>Reservar</span>
                        </span>
                      </button>
                    );
                  }

                  if (franja.estado === 'Ocupado') {
                    return (
                      <div
                        key={franja.hora_inicio}
                        aria-disabled="true"
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-900 cursor-not-allowed select-none"
                      >
                        <span className="text-sm sm:text-base font-extrabold text-rose-950/80">
                          {franja.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100/90 text-rose-800 border border-rose-200">
                          <FaCheck className="w-3 h-3" />
                          <span>Ocupado</span>
                        </span>
                      </div>
                    );
                  }

                  if (franja.estado === 'En proceso') {
                    return (
                      <div
                        key={franja.hora_inicio}
                        aria-disabled="true"
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 cursor-not-allowed select-none"
                      >
                        <span className="text-sm sm:text-base font-extrabold text-amber-950/80">
                          {franja.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/90 text-amber-800 border border-amber-200">
                          <FaClock className="w-3 h-3" />
                          <span>En proceso</span>
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={franja.hora_inicio}
                      aria-disabled="true"
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-600 cursor-not-allowed select-none"
                    >
                      <div>
                        <span className="text-sm sm:text-base font-extrabold text-slate-700">
                          {franja.label}
                        </span>
                        {franja.motivo_bloqueo && (
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            {franja.motivo_bloqueo}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                        <FaWrench className="w-3 h-3" />
                        <span>Mantenimiento</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VISTA 2: MATRIZ SEMANAL "TU SEMANA DE FÚTBOL" (UI-02 / P03)         */}
        {/* =================================================================== */}
        {vista === 'semana' && (
          <div className="space-y-5">
            {/* Selector de semana */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50">
              <button
                onClick={() => cambiarDia(-7)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-cancha-800"
              >
                <FaChevronLeft className="w-3 h-3" />
                <span>Semana ant.</span>
              </button>
              <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                {MESES_TITULO[mesActualIdx]} {anioActual} · {lunesSemana.getDate()}–{domingoSemana.getDate()}
              </span>
              <button
                onClick={() => cambiarDia(7)}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-cancha-800"
              >
                <span>Sig. semana</span>
                <FaChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Matriz de 7 días x 7 horas (UI-02) */}
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1.5 text-center">
                <thead>
                  <tr>
                    <th className="text-[11px] font-bold text-slate-500 text-left px-1 py-1">
                      Hora
                    </th>
                    {matrizSemana.map((col) => {
                      const esFechaActiva = col.fecha === celdaSemanalActiva.fecha;
                      return (
                        <th
                          key={col.fecha}
                          className={`text-[11px] font-extrabold px-1 py-1.5 rounded-lg ${
                            esFechaActiva
                              ? 'bg-emerald-100 text-cancha-900'
                              : 'text-slate-700'
                          }`}
                        >
                          {col.letra} {col.diaNumero}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((hora) => (
                    <tr key={hora}>
                      <td className="text-xs font-extrabold text-slate-700 text-left px-1 py-1 whitespace-nowrap">
                        {hora}
                      </td>
                      {matrizSemana.map((col) => {
                        const franja = col.franjas.find((f) => f.hora_inicio === hora) || {
                          hora_inicio: hora,
                          hora_fin: `${parseInt(hora, 10) + 1}:00`,
                          estado: 'Libre',
                          disponible: true,
                          precio: 16000
                        };

                        const seleccionada =
                          celdaSemanalActiva.fecha === col.fecha &&
                          celdaSemanalActiva.hora_inicio === hora;

                        let cellStyle =
                          'bg-emerald-50/90 hover:bg-emerald-100 text-cancha-800 border-emerald-200';
                        if (franja.estado === 'Ocupado') {
                          cellStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                        } else if (franja.estado === 'En proceso') {
                          cellStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                        } else if (franja.estado === 'Mantenimiento') {
                          cellStyle = 'bg-slate-100 text-slate-500 border-slate-300';
                        }

                        if (seleccionada) {
                          cellStyle += ' ring-2 ring-cancha-800 font-black scale-105';
                        }

                        return (
                          <td key={`${col.fecha}-${hora}`}>
                            <button
                              type="button"
                              onClick={() => {
                                setFechaSeleccionada(col.fecha);
                                setCeldaSemanalActiva({
                                  fecha: col.fecha,
                                  diaLabel: `${col.nombreCorto} ${col.diaNumero}`,
                                  diaMinuscula: col.nombreMinuscula,
                                  hora_inicio: franja.hora_inicio,
                                  hora_fin: franja.hora_fin,
                                  precio: franja.precio || 16000,
                                  disponible: franja.disponible,
                                  estado: franja.estado
                                });
                              }}
                              className={`w-full h-9 sm:h-10 rounded-xl border flex items-center justify-center text-xs transition-all ${cellStyle}`}
                              title={`${col.nombreCorto} ${col.diaNumero} · ${hora} (${franja.estado})`}
                            >
                              {franja.estado === 'Libre' && <FaRegCircle className="w-3 h-3" />}
                              {franja.estado === 'Ocupado' && <FaCheck className="w-3 h-3" />}
                              {franja.estado === 'En proceso' && <FaClock className="w-3 h-3" />}
                              {franja.estado === 'Mantenimiento' && <FaWrench className="w-3 h-3" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjeta inferior "Selección actual" de UI-02 (P03_CanchaApp.png) */}
            <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">Selección actual</h3>
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-medium">Día</span>
                  <span className="font-extrabold text-slate-900 capitalize">
                    {formatFechaLarga(celdaSemanalActiva.fecha)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/70">
                  <span className="text-slate-500 font-medium">Hora</span>
                  <span className="font-extrabold text-slate-900">
                    {celdaSemanalActiva.hora_inicio}–{celdaSemanalActiva.hora_fin}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Tarifa</span>
                  <span className="font-extrabold text-cancha-800">
                    {formatColones(celdaSemanalActiva.precio || 16000)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Cada celda representa una hora. Selección: {formatFechaLarga(celdaSemanalActiva.fecha)},{' '}
                {celdaSemanalActiva.hora_inicio}–{celdaSemanalActiva.hora_fin}.
              </p>

              {celdaSemanalActiva.disponible ? (
                <button
                  onClick={() =>
                    irAReservar(celdaSemanalActiva.fecha, celdaSemanalActiva.hora_inicio)
                  }
                  className="w-full py-3.5 px-4 rounded-2xl bg-cancha-800 hover:bg-cancha-900 text-white font-extrabold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>
                    Reservar {NOMBRES_DIA_COMPLETO[parseFechaISO(celdaSemanalActiva.fecha).getDay()]} a las{' '}
                    {celdaSemanalActiva.hora_inicio}
                  </span>
                  <FaArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="w-full py-3 px-4 rounded-2xl bg-rose-100 text-rose-800 font-bold text-xs text-center border border-rose-200">
                  Este turno está {celdaSemanalActiva.estado?.toLowerCase() || 'ocupado'}. Tocá una celda verde libre para reservar.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* VISTA 3: DISPONIBILIDAD MENSUAL DEL CALENDARIO (UI-03 / P04)        */}
        {/* =================================================================== */}
        {vista === 'mes' && (
          <div className="space-y-5">
            {/* Cuadrícula mensual */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-900">
                  {MESES_TITULO[mesActualIdx]} {anioActual}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => cambiarMes(-1)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    aria-label="Mes anterior"
                  >
                    <FaChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => cambiarMes(1)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                    aria-label="Mes siguiente"
                  >
                    <FaChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
                {DIAS_MATRIZ.map((d, idx) => (
                  <div key={idx} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {Array.from({ length: offsetLunes }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10" />
                ))}
                {diasMes.map((item) => {
                  const seleccionado = item.fecha === fechaSeleccionada;
                  const tieneReservas = item.ocupadas > 0;
                  return (
                    <button
                      key={item.fecha}
                      onClick={() => setFechaSeleccionada(item.fecha)}
                      className={`h-10 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all border ${
                        seleccionado
                          ? 'bg-emerald-100 text-cancha-950 border-cancha-700 font-extrabold shadow-2xs'
                          : item.libres > 0
                          ? 'bg-white hover:bg-emerald-50/60 text-slate-800 border-slate-100'
                          : 'bg-rose-50 text-rose-400 border-rose-100'
                      }`}
                    >
                      <span className="flex items-center gap-0.5">
                        {item.dia}
                        {seleccionado && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cancha-800 inline-block" />
                        )}
                      </span>
                      {tieneReservas && !seleccionado && (
                        <span className="w-1 h-1 rounded-full bg-emerald-600 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cancha-800 inline-block" />
              <span>Día seleccionado · Abrí un día para ver sus horas.</span>
            </p>

            {/* Segundo nivel de UI-03: Despliegue de las horas del día seleccionado */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 capitalize">
                  {formatFechaLarga(fechaSeleccionada)} · {horasLibresHoy} horas libres
                </h3>
                <button
                  onClick={() => setVista('dia')}
                  className="text-xs font-bold text-cancha-800 hover:underline"
                >
                  Vista diaria ↗
                </button>
              </div>

              <div className="grid gap-2">
                {franjasDia.map((franja) => (
                  <div key={franja.hora_inicio}>
                    {franja.disponible ? (
                      <button
                        onClick={() => irAReservar(fechaSeleccionada, franja.hora_inicio)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white hover:bg-emerald-50 border border-cancha-700/50 text-left transition-all"
                      >
                        <span className="text-sm font-extrabold text-slate-900">{franja.label}</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-cancha-800 border border-emerald-200">
                          <FaRegCircle className="w-2.5 h-2.5" />
                          <span>Reservar</span>
                        </span>
                      </button>
                    ) : (
                      <div
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-bold ${
                          franja.estado === 'Ocupado'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : franja.estado === 'En proceso'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-slate-100 border-slate-300 text-slate-600'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{franja.label}</span>
                        <span>
                          {franja.estado === 'Ocupado'
                            ? '✓ Ocupado'
                            : franja.estado === 'En proceso'
                            ? 'En proceso'
                            : 'Mantenimiento'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leyenda de estados en tiempo real (presente en UI-01, UI-02 y UI-03) */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-cancha-800 border border-emerald-200">
              <FaRegCircle className="w-3 h-3" />
              <span>Libre</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
              <FaCheck className="w-3 h-3" />
              <span>Ocupado</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <FaClock className="w-3 h-3" />
              <span>En proceso</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <FaWrench className="w-3 h-3" />
              <span>Mantenimiento</span>
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed flex items-start gap-2">
            <FaShieldHalved className="w-4 h-4 text-cancha-700 shrink-0 mt-0.5" />
            <span>
              Una reserva pendiente también ocupa el horario al instante para evitar choques de equipos. Tus datos personales (nombre y teléfono) nunca se muestran en el calendario público.
            </span>
          </p>

          <div className="pt-1 text-[11px] font-semibold text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>Cancha comunal · Venecia, San Carlos, Costa Rica</span>
            <span>Sin cuenta · Reserva en tres pasos · ₡16 000 / hora</span>
          </div>
        </div>
      </div>

      {/* Accesos rápidos inferiores para Consulta de Reserva y Panel Admin */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/mi-reserva/"
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-cancha-600 transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-cancha-800">
              <FaMagnifyingGlass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-cancha-800 transition-colors">
                ¿Ya apartaste tu cancha?
              </h3>
              <p className="text-xs text-slate-500">
                Consultá el estado con tu código CAN o número de teléfono
              </p>
            </div>
          </div>
          <FaArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cancha-700 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/admin/dashboard/"
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-cancha-600 transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <FaUserShield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-cancha-800 transition-colors">
                Panel Administrativo ADI Venecia
              </h3>
              <p className="text-xs text-slate-500">
                Dashboard financiero Efectivo / SINPE y liquidación de cobros
              </p>
            </div>
          </div>
          <FaArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cancha-700 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
