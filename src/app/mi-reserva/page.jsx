'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ReservaService } from '@/lib/services';
import {
  formatColones,
  formatFechaCorta,
  generarEnlaceWhatsApp
} from '@/lib/utils';
import {
  FaMagnifyingGlass,
  FaPhone,
  FaCheck,
  FaWhatsapp,
  FaCalendarDays,
  FaCircleExclamation,
  FaShieldHalved,
  FaFileInvoiceDollar
} from 'react-icons/fa6';

function MiReservaContent() {
  const searchParams = useSearchParams();
  const [codigoInput, setCodigoInput] = useState('CAN-2026-03');
  const [telefonoInput, setTelefonoInput] = useState('8911-2233');
  const [resultados, setResultados] = useState([]);
  const [mensajeError, setMensajeError] = useState('');
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const ejecutarBusquedaCodigo = (cod) => {
    setMensajeError('');
    setBusquedaRealizada(true);
    const res = ReservaService.consultarPorCodigo(cod);
    if (!res) {
      setResultados([]);
      setMensajeError(`No encontramos ninguna reserva con el código "${cod}". Verificá que esté bien escrito.`);
    } else {
      setResultados([res]);
    }
  };

  const ejecutarBusquedaTelefono = (tel) => {
    setMensajeError('');
    setBusquedaRealizada(true);
    const lista = ReservaService.consultarPorTelefono(tel);
    if (!lista.length) {
      setResultados([]);
      setMensajeError(`No encontramos reservas asociadas al teléfono "${tel}".`);
    } else {
      setResultados(lista);
    }
  };

  useEffect(() => {
    const qCodigo = searchParams.get('codigo');
    if (qCodigo) {
      setCodigoInput(qCodigo);
      ejecutarBusquedaCodigo(qCodigo);
    }
  }, [searchParams]);

  const handleSubmitCodigo = (e) => {
    e.preventDefault();
    ejecutarBusquedaCodigo(codigoInput);
  };

  const handleSubmitTelefono = (e) => {
    e.preventDefault();
    ejecutarBusquedaTelefono(telefonoInput);
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* UI-07 (P08_CanchaApp.png): BUSCADOR DE RESERVA ("Encontrá tu reserva") */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cancha-700">
              Autoservicio Comunal
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-cancha-900">
              Encontrá tu reserva (Sin iniciar sesión)
            </h1>
          </div>

          {/* Botones rápidos para evaluar UI-08 (Pendiente) y UI-09 (Confirmada) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setCodigoInput('CAN-2026-03');
                ejecutarBusquedaCodigo('CAN-2026-03');
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors"
            >
              Ver Pendiente (CAN-2026-03)
            </button>
            <button
              type="button"
              onClick={() => {
                setCodigoInput('CAN-2026-01');
                ejecutarBusquedaCodigo('CAN-2026-01');
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-cancha-900 border border-emerald-200 transition-colors"
            >
              Ver Confirmada (CAN-2026-01)
            </button>
          </div>
        </div>

        {/* Opción 1: Con tu código */}
        <form
          onSubmit={handleSubmitCodigo}
          className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/40"
        >
          <label
            htmlFor="input-codigo-reserva"
            className="block text-xs font-extrabold text-slate-800"
          >
            Opción 1: Con tu código
          </label>
          <input
            id="input-codigo-reserva"
            type="text"
            value={codigoInput}
            onChange={(e) => setCodigoInput(e.target.value)}
            placeholder="Ej. CAN-2026-03"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-cancha-700"
          />
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-cancha-700 hover:bg-cancha-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <FaMagnifyingGlass className="w-3.5 h-3.5" />
            <span>Consultar por código</span>
          </button>
        </form>

        {/* Opción 2: Con tu teléfono */}
        <form
          onSubmit={handleSubmitTelefono}
          className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/40"
        >
          <label
            htmlFor="input-telefono-reserva"
            className="block text-xs font-extrabold text-slate-800"
          >
            Opción 2: Con tu teléfono
          </label>
          <input
            id="input-telefono-reserva"
            type="tel"
            value={telefonoInput}
            onChange={(e) => setTelefonoInput(e.target.value)}
            placeholder="Ej. 8911-2233"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-sky-600"
          />
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-2xs"
          >
            <FaPhone className="w-3.5 h-3.5" />
            <span>Continuar con teléfono</span>
          </button>
        </form>

        <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1.5">
          <FaShieldHalved className="w-3.5 h-3.5 text-cancha-700" />
          <span>Protegemos tus datos: no se muestran reservas de otros usuarios.</span>
        </p>
      </div>

      {/* Mensaje si no se encontró */}
      {busquedaRealizada && mensajeError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5">
          <FaCircleExclamation className="w-4 h-4 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* RESULTADOS: UI-08 (PENDIENTE) Y UI-09 (CONFIRMADA)                  */}
      {/* =================================================================== */}
      {resultados.map(({ reserva, pago, cancha }) => {
        const esConfirmada = reserva.estado === 'Confirmada';
        const esCancelada = reserva.estado === 'Cancelada';

        // UI-09 (P10_CanchaApp.png): Reserva Confirmada ("✓ Todo listo para jugar")
        if (esConfirmada) {
          const refTexto = pago?.numero_comprobante
            ? `${pago.metodo_pago} (Ref: ${pago.numero_comprobante.replace(/^SINPE-/, '')})`
            : `${pago?.metodo_pago || reserva.metodo_pago_previsto} (Verificado en caseta)`;

          return (
            <div
              key={reserva.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-emerald-200 shadow-sm space-y-4"
            >
              <div className="text-center space-y-1">
                <p className="text-base sm:text-lg font-extrabold text-cancha-800 flex items-center justify-center gap-1.5">
                  <FaCheck className="w-4 h-4" />
                  <span>Todo listo para jugar</span>
                </p>
                <p className="text-xs sm:text-sm font-bold text-slate-500">
                  Código: {reserva.codigo_reserva}
                </p>
              </div>

              {/* Sello verde oficial UI-09 */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-300 py-3.5 px-4 text-center text-xs sm:text-sm font-extrabold text-cancha-900 flex items-center justify-center gap-2">
                <FaCheck className="w-4 h-4 text-cancha-700" />
                <span>Pago verificado y confirmado</span>
              </div>

              {/* Ficha de la transacción (UI-09) */}
              <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-1.5 text-xs sm:text-sm text-slate-800">
                <p>
                  <strong className="text-slate-900">Jugador:</strong> {reserva.cliente_nombre}
                </p>
                <p className="capitalize">
                  <strong className="text-slate-900">Horario:</strong>{' '}
                  {formatFechaCorta(reserva.fecha_reserva)} · {reserva.hora_inicio}-{reserva.hora_fin}
                </p>
                <p>
                  <strong className="text-slate-900">Método:</strong> {refTexto}
                </p>
                <p>
                  <strong className="text-slate-900">Saldo pendiente:</strong>{' '}
                  <span className="font-extrabold text-cancha-800">₡0</span>
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
                <Link
                  href="/"
                  className="w-full py-3 px-4 rounded-xl bg-cancha-700 hover:bg-cancha-800 text-white font-extrabold text-xs sm:text-sm text-center flex items-center justify-center gap-2 transition-colors"
                >
                  <FaCalendarDays className="w-3.5 h-3.5" />
                  <span>Ver disponibilidad</span>
                </Link>
                <Link
                  href={`/confirmacion/?codigo=${encodeURIComponent(reserva.codigo_reserva)}`}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm text-center flex items-center justify-center gap-2 transition-colors"
                >
                  <FaFileInvoiceDollar className="w-3.5 h-3.5" />
                  <span>Abrir comprobante</span>
                </Link>
              </div>
            </div>
          );
        }

        // Si fue cancelada
        if (esCancelada) {
          return (
            <div
              key={reserva.id}
              className="bg-white rounded-3xl p-6 border border-rose-200 space-y-3"
            >
              <div className="text-center">
                <p className="text-base font-extrabold text-rose-800">Reserva Cancelada</p>
                <p className="text-xs font-bold text-slate-500">Código: {reserva.codigo_reserva}</p>
              </div>
              <p className="text-xs text-slate-600 text-center">
                Motivo: {reserva.motivo_cancelacion || 'Cancelada por administración'}
              </p>
            </div>
          );
        }

        // UI-08 (P09_CanchaApp.png): Reserva Pendiente ("Tu reserva está vigente")
        return (
          <div
            key={reserva.id}
            className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-amber-200 shadow-sm space-y-4"
          >
            <div className="text-center space-y-1">
              <p className="text-base sm:text-lg font-extrabold text-slate-900">
                Tu reserva está vigente
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-500">
                Código: {reserva.codigo_reserva}
              </p>
            </div>

            {/* Sello ámbar de Saldo por liquidar (UI-08) */}
            <div className="rounded-2xl bg-amber-50 border border-amber-300 py-3.5 px-4 text-center text-xs sm:text-sm font-extrabold text-amber-900">
              Pendiente de pago · {formatColones(reserva.monto_total)}
            </div>

            {/* Ficha del partido (UI-08) */}
            <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-1.5 text-xs sm:text-sm text-slate-800">
              <p className="capitalize">
                <strong className="text-slate-900">Fecha:</strong>{' '}
                {formatFechaCorta(reserva.fecha_reserva)} · {reserva.hora_inicio}-{reserva.hora_fin}
              </p>
              <p>
                <strong className="text-slate-900">Cancha:</strong>{' '}
                {cancha?.nombre_corto || 'Sintética comunal'}
              </p>
              <p>
                <strong className="text-slate-900">Titular:</strong> {reserva.cliente_nombre}
              </p>
            </div>

            {/* Mensaje de tranquilidad (UI-08) */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 leading-relaxed">
              El horario {reserva.hora_inicio}-{reserva.hora_fin} sigue apartado para vos mientras el encargado registra la transferencia o el pago en caseta.
            </div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              <a
                href={generarEnlaceWhatsApp(reserva, cancha)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-cancha-700 hover:bg-cancha-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <FaWhatsapp className="w-4 h-4" />
                <span>Compartir por WhatsApp</span>
              </a>

              <Link
                href={`/confirmacion/?codigo=${encodeURIComponent(reserva.codigo_reserva)}`}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <FaFileInvoiceDollar className="w-3.5 h-3.5" />
                <span>Ver instrucciones de pago</span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MiReservaPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
          Cargando buscador de reservas...
        </div>
      }
    >
      <MiReservaContent />
    </Suspense>
  );
}
