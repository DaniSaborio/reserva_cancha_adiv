'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReservaService } from '@/lib/services';
import {
  formatColones,
  formatFechaCorta,
  formatRangoHora12,
  getAhoraCostaRica,
  esFranjaPasada,
  sumarDiasISO
} from '@/lib/utils';
import {
  FaArrowLeft,
  FaMobileScreenButton,
  FaMoneyBillWave,
  FaCircleExclamation,
  FaHandPointRight,
  FaShieldHalved,
  FaCheck,
  FaUsers,
  FaMinus,
  FaPlus,
  FaCalculator
} from 'react-icons/fa6';

export default function ReservarPage() {
  const router = useRouter();

  const [fecha, setFecha] = useState('2026-11-06');
  const [horaInicio, setHoraInicio] = useState('16:00');
  const [ahoraCR, setAhoraCR] = useState(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cantidadPersonas, setCantidadPersonas] = useState(10);
  const [metodoPago, setMetodoPago] = useState('SINPE Móvil');
  const [errorValidacion, setErrorValidacion] = useState('');
  const [colisionInfo, setColisionInfo] = useState(null);
  const [franjasDelDia, setFranjasDelDia] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cr = getAhoraCostaRica();
      setAhoraCR(cr);
      const params = new URLSearchParams(window.location.search);
      const f = params.get('fecha');
      const h = params.get('hora');
      const fechaInicial = f && f >= cr.fechaISO ? f : cr.fechaISO;
      setFecha(fechaInicial);
      if (h) setHoraInicio(h);

      const actualizarReloj = () => setAhoraCR(getAhoraCostaRica());
      const intervalId = setInterval(actualizarReloj, 30000);
      window.addEventListener('focus', actualizarReloj);
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', actualizarReloj);
      };
    }
  }, []);

  useEffect(() => {
    const cr = getAhoraCostaRica();
    const disp = ReservaService.verificarDisponibilidad(fecha);
    setFranjasDelDia(disp);
    const maxLocal = Number(disp[0]?.max_jugadores) || 16;
    setCantidadPersonas((prev) => (Number(prev) > maxLocal ? maxLocal : prev));

    // Si la hora seleccionada ya pasó hoy, seleccionar la primera hora futura disponible
    const visiblesLocal = disp.filter((f) => !esFranjaPasada(fecha, f.hora_inicio, cr));
    if (visiblesLocal.length > 0 && !visiblesLocal.some((f) => f.hora_inicio === horaInicio)) {
      const primeraDisp = visiblesLocal.find((f) => f.disponible) || visiblesLocal[0];
      setHoraInicio(primeraDisp.hora_inicio);
    }

    ReservaService.verificarDisponibilidadAsync(fecha).then((remotas) => {
      if (remotas && remotas.length) {
        setFranjasDelDia(remotas);
        const maxRemoto = Number(remotas[0]?.max_jugadores) || 16;
        setCantidadPersonas((prev) => (Number(prev) > maxRemoto ? maxRemoto : prev));
      }
    });
  }, [fecha, horaInicio]);

  const franjasVisibles = ahoraCR
    ? franjasDelDia.filter((f) => !esFranjaPasada(fecha, f.hora_inicio, ahoraCR))
    : franjasDelDia;

  const horaNum = parseInt(horaInicio.split(':')[0], 10) || 16;
  const horaFin = `${String(horaNum + 1).padStart(2, '0')}:00`;
  const franjaSeleccionada = franjasDelDia.find((f) => f.hora_inicio === horaInicio);
  const tipoCobro =
    franjaSeleccionada?.tipo_cobro === 'por_cancha' ? 'por_cancha' : 'por_persona';
  const maxJugadores =
    Number(franjaSeleccionada?.max_jugadores || franjasDelDia[0]?.max_jugadores) >= 2
      ? Number(franjaSeleccionada?.max_jugadores || franjasDelDia[0]?.max_jugadores)
      : 16;
  const precioUnitario =
    Number(franjaSeleccionada?.precio) || (tipoCobro === 'por_persona' ? 1500 : 16000);
  const personasValidas = Math.min(maxJugadores, Math.max(1, Number(cantidadPersonas) || 1));
  const excedeLimite = Number(cantidadPersonas) > maxJugadores;
  const opcionesRapidas = Array.from(
    new Set([8, 10, 12, 14, 16, 20, maxJugadores].filter((n) => n >= 2 && n <= maxJugadores))
  )
    .sort((a, b) => a - b)
    .slice(0, 5);
  const totalEstimado =
    tipoCobro === 'por_persona' ? precioUnitario * personasValidas : precioUnitario;

  const handleTelefonoChange = (e) => {
    const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
    if (digits.length > 4) {
      setTelefono(`${digits.slice(0, 4)}-${digits.slice(4)}`);
    } else {
      setTelefono(digits);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorValidacion('');
    setColisionInfo(null);
    setEnviando(true);

    const resultado = await ReservaService.crearReservaAsync({
      nombre,
      telefono,
      fecha,
      hora_inicio: horaInicio,
      metodo_pago: metodoPago,
      cantidad_personas: Number(cantidadPersonas)
    });

    setEnviando(false);

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

      {/* Barra de progreso en 3 pasos centrada */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 grid grid-cols-3 gap-2 text-center">
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
                        Elegir {formatRangoHora12(alt.hora_inicio, alt.hora_fin)}
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
        <div className="border-b border-slate-100 pb-3">
          <h1 className="text-lg sm:text-xl font-extrabold text-cancha-900">
            ¿Quién viene a jugar?
          </h1>
        </div>

        {/* Resumen del turno seleccionado + opción de cambiar fecha/hora */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">Turno seleccionado:</p>
              <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 capitalize">
                {formatFechaCorta(fecha)} · {formatRangoHora12(horaInicio, horaFin)} ·{' '}
                {formatColones(precioUnitario)} / {tipoCobro === 'por_persona' ? 'persona' : 'hora'}
              </p>
            </div>
            <span className="text-xs font-bold text-cancha-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Cancha Sintética
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Cambiar fecha
              </label>
              <input
                type="date"
                min={ahoraCR?.fechaISO || undefined}
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
              {franjasVisibles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setFecha(sumarDiasISO(ahoraCR?.fechaISO || fecha, 1))}
                  className="w-full text-xs font-bold text-cancha-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-3 py-2 text-left"
                >
                  Hoy sin turnos · Cambiar a mañana →
                </button>
              ) : (
                <select
                  value={horaInicio}
                  onChange={(e) => {
                    setHoraInicio(e.target.value);
                    setColisionInfo(null);
                  }}
                  className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2"
                >
                  {franjasVisibles.map((f) => (
                    <option key={f.hora_inicio} value={f.hora_inicio}>
                      {formatRangoHora12(f.hora_inicio, f.hora_fin)} —{' '}
                      {f.disponible
                        ? `Libre (${formatColones(f.precio || precioUnitario)}/${tipoCobro === 'por_persona' ? 'pers.' : 'h'})`
                        : f.estado}
                    </option>
                  ))}
                </select>
              )}
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

          {/* Cantidad de personas y cálculo de suma estimada */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="cantidad-personas"
                className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5"
              >
                <FaUsers className="w-3.5 h-3.5 text-cancha-700" />
                <span>¿Cuántas personas asistirán? *</span>
              </label>
              <span className="text-[11px] font-bold text-cancha-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                {tipoCobro === 'por_persona'
                  ? `${formatColones(precioUnitario)} / persona · Máx. ${maxJugadores} jug.`
                  : `Tarifa fija ${formatColones(precioUnitario)} · Máx. ${maxJugadores} jug.`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setCantidadPersonas((p) =>
                      Math.max(1, Math.min(maxJugadores, (Number(p) || 1) - 1))
                    )
                  }
                  className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Restar una persona"
                >
                  <FaMinus className="w-3 h-3" />
                </button>
                <input
                  id="cantidad-personas"
                  type="number"
                  min={1}
                  max={maxJugadores}
                  required
                  value={cantidadPersonas}
                  onChange={(e) => setCantidadPersonas(e.target.value)}
                  className="w-16 text-center py-2 text-sm font-black text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setCantidadPersonas((p) =>
                      Math.min(maxJugadores, Math.max(1, (Number(p) || 1) + 1))
                    )
                  }
                  className="px-3 py-2.5 text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Sumar una persona"
                >
                  <FaPlus className="w-3 h-3" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {opcionesRapidas.map((cant) => (
                  <button
                    key={cant}
                    type="button"
                    onClick={() => setCantidadPersonas(cant)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      Number(cantidadPersonas) === cant
                        ? 'bg-cancha-800 text-white border-cancha-800'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {cant} jug.
                  </button>
                ))}
              </div>
            </div>

            {excedeLimite && (
              <p className="text-[11px] font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                El aforo máximo permitido por la cancha es de {maxJugadores} jugadores por turno.
              </p>
            )}

            {/* Suma estimada en tiempo real */}
            <div className="rounded-xl bg-white border border-emerald-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <FaCalculator className="w-3.5 h-3.5 text-cancha-700 shrink-0" />
                <span>
                  {tipoCobro === 'por_persona' ? (
                    <>
                      <strong className="text-slate-900">Suma estimada:</strong> {personasValidas}{' '}
                      {personasValidas === 1 ? 'persona' : 'personas'} × {formatColones(precioUnitario)}
                    </>
                  ) : (
                    <>
                      <strong className="text-slate-900">Tarifa por cancha:</strong> {personasValidas}{' '}
                      {personasValidas === 1 ? 'asistente' : 'asistentes'} registrados
                    </>
                  )}
                </span>
              </div>
              <span className="text-base sm:text-lg font-black text-cancha-900">
                {formatColones(totalEstimado)}
              </span>
            </div>
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
            disabled={enviando}
            className="w-full py-3.5 px-5 rounded-xl bg-cancha-700 hover:bg-cancha-800 disabled:opacity-60 text-white font-extrabold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {enviando ? (
              <span>Confirmando reserva...</span>
            ) : (
              <span>
                Confirmar reserva · {tipoCobro === 'por_persona' ? 'Est. ' : ''}
                {formatColones(totalEstimado)}
              </span>
            )}
          </button>
        </form>

        {/* Nota de aclaración */}
        <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
          <p className="flex items-center gap-1.5">
            <FaShieldHalved className="w-3.5 h-3.5 text-cancha-700 shrink-0" />
            <span>
              Cero pasarelas complejas: apartar bloquea el turno de inmediato sujeto a confirmación del encargado.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
