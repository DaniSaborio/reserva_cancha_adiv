'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/AdminNav';
import { AgendaManager, AuthMiddleware } from '@/lib/services';
import { formatFechaCorta, formatDDMMYYYY } from '@/lib/utils';
import {
  FaWrench,
  FaBan,
  FaTrashCan,
  FaCircleCheck,
  FaCircleExclamation,
  FaCalendarXmark
} from 'react-icons/fa6';

const FRANJAS_HORAS = [
  { inicio: '16:00', label: '16:00 – 17:00' },
  { inicio: '17:00', label: '17:00 – 18:00' },
  { inicio: '18:00', label: '18:00 – 19:00' },
  { inicio: '19:00', label: '19:00 – 20:00' },
  { inicio: '20:00', label: '20:00 – 21:00' },
  { inicio: '21:00', label: '21:00 – 22:00' },
  { inicio: '22:00', label: '22:00 – 23:00' }
];

const MOTIVOS_FRECUENTES = [
  'Reparación de iluminación LED',
  'Mantenimiento preventivo de césped sintético',
  'Torneo Comunal ADI Venecia',
  'Actividad oficial de la Asociación de Desarrollo',
  'Cierre preventivo por condiciones climáticas / lluvia'
];

export default function AdminBloqueosPage() {
  const [bloqueos, setBloqueos] = useState([]);
  const [fecha, setFecha] = useState('2026-11-06');
  const [horaInicio, setHoraInicio] = useState('16:00');
  const [diaCompleto, setDiaCompleto] = useState(false);
  const [motivo, setMotivo] = useState('Reparación de iluminación LED');
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  const cargarBloqueos = useCallback(() => {
    if (!AuthMiddleware.verificarToken()) {
      AuthMiddleware.validarCredenciales('admin@canchavenecia.cr', 'Venecia2026!');
    }
    setBloqueos(AgendaManager.listarBloqueos());
  }, []);

  useEffect(() => {
    cargarBloqueos();
    const handleUpdate = () => cargarBloqueos();
    window.addEventListener('cancha-db-updated', handleUpdate);
    return () => window.removeEventListener('cancha-db-updated', handleUpdate);
  }, [cargarBloqueos]);

  const handleCrearBloqueo = (e) => {
    e.preventDefault();
    setMensajeError('');
    setMensajeExito('');

    const res = AgendaManager.bloquearHorario({
      fecha,
      hora_inicio: horaInicio,
      motivo,
      dia_completo: diaCompleto
    });

    if (!res.ok) {
      setMensajeError(res.error || 'No se pudo bloquear el horario.');
      return;
    }

    setMensajeExito(
      `Horario bloqueado exitosamente el ${formatDDMMYYYY(fecha)} (${
        diaCompleto ? 'Jornada completa 16:00–23:00' : `${horaInicio} hs`
      }) por "${motivo}". Ya aparece como Mantenimiento en el calendario público.`
    );
    cargarBloqueos();
  };

  const handleLiberar = (id) => {
    AgendaManager.liberarBloqueo(id);
    setMensajeExito('El bloqueo fue eliminado y el horario volvió a estar disponible.');
    cargarBloqueos();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Bloqueo de Horarios por Mantenimiento o Eventos
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-slate-500">
          Inhabilitá turnos en el calendario público durante arreglos de césped, iluminación o torneos comunales (RF-11 / HU-11)
        </p>
      </div>

      <AdminNav subtituloFecha="Control de Disponibilidad y Mantenimiento" onResetDemo={cargarBloqueos} />

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

      {/* Formulario para bloquear horario (HU-11) */}
      <form
        onSubmit={handleCrearBloqueo}
        className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
            <FaWrench className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Programar Nuevo Bloqueo de Cancha
            </h2>
            <p className="text-xs text-slate-500">
              Las franjas bloqueadas no podrán ser reservadas por ningún usuario hasta ser liberadas
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              Fecha del bloqueo *
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold text-slate-700">
                Franja horaria *
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-cancha-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diaCompleto}
                  onChange={(e) => setDiaCompleto(e.target.checked)}
                  className="rounded border-slate-300 text-cancha-800"
                />
                <span>Bloquear toda la jornada (16:00–23:00)</span>
              </label>
            </div>

            <select
              disabled={diaCompleto}
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 bg-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              {FRANJAS_HORAS.map((f) => (
                <option key={f.inicio} value={f.inicio}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
            Motivo oficial del bloqueo *
          </label>
          <input
            type="text"
            required
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Reparación de iluminación o Torneo comunal"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900"
          />

          <div className="flex flex-wrap gap-1.5 mt-2">
            {MOTIVOS_FRECUENTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMotivo(m)}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-cancha-800 border border-slate-200 transition-colors"
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cancha-800 hover:bg-cancha-900 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <FaBan className="w-3.5 h-3.5" />
          <span>Confirmar Bloqueo en Calendario</span>
        </button>
      </form>

      {/* Lista de bloqueos activos */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <FaCalendarXmark className="w-4 h-4 text-slate-600" />
          <span>Horarios Bloqueados Activos ({bloqueos.length})</span>
        </h2>

        {bloqueos.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500">
            No hay horarios bloqueados por mantenimiento en este momento.
          </p>
        ) : (
          <div className="grid gap-2.5">
            {bloqueos.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 capitalize">
                    {formatFechaCorta(b.fecha)} ({formatDDMMYYYY(b.fecha)}) · {b.hora_inicio}–
                    {b.hora_fin}
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    Motivo: {b.motivo}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLiberar(b.id)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <FaTrashCan className="w-3 h-3" />
                  <span>Liberar horario</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
