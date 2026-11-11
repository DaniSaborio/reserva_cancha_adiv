'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReservaService } from '@/lib/services';
import { formatColones, formatFechaCorta } from '@/lib/utils';
import {
  FaArrowLeft,
  FaMobileScreenButton,
  FaMoneyBillWave,
  FaCircleExclamation,
  FaHandPointRight,
  FaShieldHalved,
  FaBolt,
  FaCheck
} from 'react-icons/fa6';

function ReservarFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const fechaParam = searchParams.get('fecha') || '2026-11-06';
  const horaParam = searchParams.get('hora') || '16:00';

  const [fecha, setFecha] = useState(fechaParam);
  const [horaInicio, setHoraInicio] = useState(horaParam);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [metodoPago, setMetodoPago] = useState('SINPE Móvil');
  const [errorValidacion, setErrorValidacion] = useState('');
  const [colisionInfo, setColisionInfo] = useState(null);
  const [franjasDelDia, setFranjasDelDia] = useState([]);

  useEffect(() => {
    setFecha(searchParams.get('fecha') || '2026-11-06');
    setHoraInicio(searchParams.get('hora') || '16:00');
  }, [searchParams]);

  useEffect(() => {
    const disp = ReservaService.verificarDisponibilidad(fecha);
    setFranjasDelDia(disp);
  }, [fecha, horaInicio]);

  const horaNum = parseInt(horaInicio.split(':')[0], 10) || 16;
  const horaFin = `${String(horaNum + 1).padStart(2, '0')}:00`;

  const handleTelefonoChange = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
    if (digits.length > 4) {
      setTelefono(`${digits.slice(0, 4)}-${digits.slice(4)}`);
    } else {
      setTelefono(digits);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorValidacion('');
    setColisionInfo(null);

    const resultado = ReservaService.crearReserva({
      nombre,
      telefono,
      fecha,
      hora_inicio: horaInicio,
      metodo_pago: metodoPago
    });

    if (!resultado.ok) {
      if (resultado.code === 'COLLISION' || resultado.status === 409) {
        setColisionInfo({
          titulo: resultado.error || 'Horario recién ocupado',
          mensaje:
            resultado.message ||
            'Otra persona confirmó mientras llenabas tus datos. No se cobró nada.',
          alternativas: resultado.alternativas || []
        });
      } else {
        setErrorValidacion(resultado.error || 'Verificá los datos ingresados.');
      }
      return;
    }

    router.push(`/confirmacion/?codigo=${encodeURIComponent(resultado.reserva.codigo_reserva)}`);
  };

  const handleSimularColisionUI10 = () => {
    if (!nombre.trim()) setNombre('Valeria Rojas Mora');
    if (!telefono.trim()) setTelefono('8777-3344');
    setErrorValidacion('');
    const alts = ReservaService.obtenerAlternativasDisponibles(fecha, horaInicio);
    setColisionInfo({
      titulo: 'Horario recién ocupado',
      mensaje: 'Otra persona confirmó mientras llenabas tus datos. No se cobró nada.',
      alternativas: alts
    });
  };

  const handleElegirAlternativa = (nuevaHora) => {
    setHoraInicio(nuevaHora);
    setColisionInfo(null);
    setErrorValidacion('');
  };

  return (
    <div className="space-y-6">
      {/* Navegación superior e indicador Paso 2 */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-cancha-800 transition-colors"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al calendario</span>
        </Link>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-cancha-800 border border-emerald-200">
          Paso 2: Contacto
        </span>
      </div>

      {/* Barra de progreso en 3 pasos */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs font-bold text-emerald-700">1 · Horario</p>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-cancha-800" />
          <p className="text-xs font-extrabold text-cancha-900">2 · Contacto</p>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-slate-200" />
          <p className="text-xs font-medium text-slate-400">3 · Comprobante</p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* UI-10 (P11_CanchaApp.png): MANEJO DE CONCURRENCIA                   */}
      {/* =================================================================== */}
      {colisionInfo && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-rose-200 shadow-sm space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center space-y-1">
            <h2 className="text-base font-extrabold text-rose-800 flex items-center justify-center gap-2">
              <FaCircleExclamation className="w-4 h-4 text-rose-700" />
              <span>{colisionInfo.titulo}</span>
            </h2>
            <p className="text-xs sm:text-sm text-rose-700 font-medium">
              {colisionInfo.mensaje}
            </p>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs sm:text-sm font-extrabold text-slate-800">
              Elegí una alternativa inmediata:
            </p>

            {colisionInfo.alternativas.length > 0 ? (
              <div className="grid gap-2">
                {colisionInfo.alternativas.slice(0, 4).map((alt, idx) => (
                  <button
                    key={alt.hora_inicio}
                    type="button"
                    onClick={() => handleElegirAlternativa(alt.hora_inicio)}
                    className={`w-full px-4 py-3 rounded-xl text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-all border ${
                      idx === 0
                        ? 'bg-emerald-50/70 border-2 border-cancha-700 text-cancha-950'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FaHandPointRight className="w-3.5 h-3.5 text-cancha-700" />
                      <span>
                        Elegir {alt.hora_inicio} - {alt.hora_fin}
                      </span>
                    </span>
                    <span className="text-xs font-extrabold text-cancha-800">
                      {formatColones(alt.precio)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                No quedan más horas libres en esta fecha. Probá seleccionando otro día.
              </p>
            )}

            <p className="text-[11px] text-center text-slate-500 pt-1">
              Tus datos (nombre y teléfono) fueron conservados.
            </p>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* UI-04 (P05_CanchaApp.png): FORMULARIO DE CONTACTO Y MÉTODO DE PAGO  */}
      {/* =================================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-extrabold text-cancha-900">
            ¿Quién viene a jugar? (Sin cuenta)
          </h1>
          <button
            type="button"
            onClick={() => {
              setNombre('Valeria Rojas Mora');
              setTelefono('8777-3344');
              setMetodoPago('SINPE Móvil');
              setErrorValidacion('');
            }}
            className="text-[11px] font-bold text-cancha-700 hover:underline"
          >
            Autocompletar ejemplo UI-04
          </button>
        </div>

        {/* Resumen del turno seleccionado + opción de cambiar fecha/hora */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">Turno seleccionado:</p>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 capitalize">
                {formatFechaCorta(fecha)} · {horaInicio}-{horaFin} · {formatColones(16000)}
              </p>
            </div>
            <span className="text-xs font-bold text-cancha-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Cancha Sintética ADI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Cambiar fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setColisionInfo(null);
                }}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Cambiar franja horaria
              </label>
              <select
                value={horaInicio}
                onChange={(e) => {
                  setHoraInicio(e.target.value);
                  setColisionInfo(null);
                }}
                className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2"
              >
                {franjasDelDia.map((f) => (
                  <option key={f.hora_inicio} value={f.hora_inicio}>
                    {f.label} — {f.disponible ? 'Libre (₡16 000)' : f.estado}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {errorValidacion && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <FaCircleExclamation className="w-4 h-4 shrink-0" />
            <span>{errorValidacion}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nombre-jugador"
              className="block text-xs font-extrabold text-slate-700 mb-1.5"
            >
              Nombre o equipo *
            </label>
            <input
              id="nombre-jugador"
              type="text"
              required
              placeholder="Ej. Valeria Rojas Mora o Deportivo Venecia"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700 focus:ring-2 focus:ring-cancha-700/20"
            />
          </div>

          <div>
            <label
              htmlFor="telefono-jugador"
              className="block text-xs font-extrabold text-slate-700 mb-1.5"
            >
              Teléfono CR (8 dígitos) *
            </label>
            <input
              id="telefono-jugador"
              type="tel"
              required
              placeholder="8777-3344"
              value={telefono}
              onChange={handleTelefonoChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700 focus:ring-2 focus:ring-cancha-700/20"
            />
          </div>

          <div>
            <span className="block text-xs font-extrabold text-slate-700 mb-2">
              ¿Cómo pensás pagar? *
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('SINPE Móvil')}
                className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                  metodoPago === 'SINPE Móvil'
                    ? 'bg-emerald-50 border-2 border-cancha-700 text-cancha-900 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <FaMobileScreenButton className="w-4 h-4" />
                <span>SINPE Móvil</span>
                {metodoPago === 'SINPE Móvil' && <FaCheck className="w-3 h-3 text-cancha-700" />}
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('Efectivo')}
                className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                  metodoPago === 'Efectivo'
                    ? 'bg-emerald-50 border-2 border-cancha-700 text-cancha-900 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <FaMoneyBillWave className="w-4 h-4" />
                <span>Efectivo</span>
                {metodoPago === 'Efectivo' && <FaCheck className="w-3 h-3 text-cancha-700" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-5 rounded-xl bg-cancha-700 hover:bg-cancha-800 text-white font-extrabold text-sm shadow-sm transition-colors"
          >
            Confirmar reserva {formatColones(16000)}
          </button>
        </form>

        {/* Nota de aclaración y botón para demostrar UI-10 (Manejo de concurrencia) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <FaShieldHalved className="w-3.5 h-3.5 text-cancha-700 shrink-0" />
            <span>
              Cero pasarelas complejas: apartar bloquea el turno de inmediato sujeto a confirmación del encargado.
            </span>
          </p>
          <button
            type="button"
            onClick={handleSimularColisionUI10}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:underline shrink-0"
          >
            <FaBolt className="w-3 h-3" />
            <span>Probar caso de colisión (UI-10)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservarPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
          Cargando formulario de reserva...
        </div>
      }
    >
      <ReservarFormContent />
    </Suspense>
  );
}
