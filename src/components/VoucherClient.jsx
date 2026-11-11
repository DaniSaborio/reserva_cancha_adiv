'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ReservaService } from '@/lib/services';
import {
  formatColones,
  formatFechaCorta,
  generarEnlaceWhatsApp
} from '@/lib/utils';
import {
  FaCheck,
  FaHourglassHalf,
  FaWhatsapp,
  FaPrint,
  FaCopy,
  FaMobileScreenButton,
  FaMoneyBillWave,
  FaCalendarDays,
  FaMagnifyingGlass,
  FaShieldHalved
} from 'react-icons/fa6';

export default function VoucherClient({ initialCodigo = '' }) {
  const searchParams = useSearchParams();
  const [codigoActivo, setCodigoActivo] = useState(initialCodigo || '');
  const [detalle, setDetalle] = useState(null);
  const [varianteVista, setVarianteVista] = useState('SINPE Móvil'); // 'SINPE Móvil' | 'Efectivo'
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let cod = initialCodigo || searchParams.get('codigo') || '';
    if (!cod && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'confirmacion' && parts[1]) {
        cod = decodeURIComponent(parts[1]);
      }
    }
    if (!cod) {
      cod = 'CAN-2026-03';
    }
    setCodigoActivo(cod);

    const info = ReservaService.consultarPorCodigo(cod) || ReservaService.consultarPorCodigo('CAN-2026-03');
    if (info) {
      setDetalle(info);
      setVarianteVista(
        info.reserva.metodo_pago_previsto === 'Efectivo' ? 'Efectivo' : 'SINPE Móvil'
      );
    }
  }, [initialCodigo, searchParams]);

  const handleCopiarCodigo = () => {
    if (!detalle?.reserva) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(detalle.reserva.codigo_reserva);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  if (!detalle) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">
          Buscando comprobante de reserva {codigoActivo}...
        </p>
        <Link
          href="/mi-reserva/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cancha-800 text-white text-xs font-bold"
        >
          <span>Ir al buscador de reservas</span>
        </Link>
      </div>
    );
  }

  const { reserva, cancha } = detalle;
  const esConfirmada = reserva.estado === 'Confirmada';

  return (
    <div className="space-y-6">
      {/* Barra de progreso en 3 pasos (Paso 3: Comprobante completado) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 grid grid-cols-3 gap-2 no-print">
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs font-bold text-emerald-700">1 · Horario</p>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs font-bold text-emerald-700">2 · Contacto</p>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-cancha-800" />
          <p className="text-xs font-extrabold text-cancha-900">3 · Comprobante</p>
        </div>
      </div>

      {/* Selector de Variante de Comprobante (UI-05 SINPE Móvil vs UI-06 Efectivo) */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <span className="text-xs font-bold text-slate-500">
          Modalidad de comprobante (Paso 3):
        </span>
        <div className="inline-flex p-1 rounded-full bg-white border border-slate-200">
          <button
            type="button"
            onClick={() => setVarianteVista('SINPE Móvil')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              varianteVista === 'SINPE Móvil'
                ? 'bg-emerald-100 text-cancha-900 border border-emerald-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FaMobileScreenButton className="w-3 h-3" />
            <span>Instrucciones SINPE (UI-05)</span>
          </button>
          <button
            type="button"
            onClick={() => setVarianteVista('Efectivo')}
            className={`px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              varianteVista === 'Efectivo'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FaMoneyBillWave className="w-3 h-3" />
            <span>Pago en Efectivo (UI-06)</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VARIANTE 1: UI-05 (P06_CanchaApp.png) — COMPROBANTE SINPE MÓVIL     */}
      {/* =================================================================== */}
      {varianteVista === 'SINPE Móvil' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <p className="text-base sm:text-lg font-extrabold text-cancha-800">
              ¡Tu horario está reservado!
            </p>
            <div className="inline-flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {reserva.codigo_reserva}
              </h1>
              <button
                type="button"
                onClick={handleCopiarCodigo}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs no-print"
                title="Copiar código"
              >
                <FaCopy className="w-3.5 h-3.5" />
              </button>
            </div>
            {copiado && (
              <p className="text-xs font-bold text-emerald-700">¡Código copiado al portapapeles!</p>
            )}

            {/* Estado en dos sellos: ✓ Horario apartado · ⌛ Pago pendiente */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-cancha-900 border border-emerald-200">
                <FaCheck className="w-3 h-3" />
                <span>Horario apartado</span>
              </span>
              {esConfirmada ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-cancha-900 border border-emerald-200">
                  <FaCheck className="w-3 h-3" />
                  <span>Pago confirmado</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                  <FaHourglassHalf className="w-3 h-3" />
                  <span>Pago pendiente</span>
                </span>
              )}
            </div>
          </div>

          {/* Ficha de la reserva */}
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-2 text-xs sm:text-sm text-slate-800">
            <p>
              <strong className="text-slate-900">Cancha:</strong>{' '}
              {cancha?.nombre_corto || 'Sintética comunal'} (ADI Venecia)
            </p>
            <p className="capitalize">
              <strong className="text-slate-900">Fecha:</strong>{' '}
              {formatFechaCorta(reserva.fecha_reserva)} · {reserva.hora_inicio}-{reserva.hora_fin}
            </p>
            <p>
              <strong className="text-slate-900">Jugador / Equipo:</strong> {reserva.cliente_nombre}{' '}
              ({reserva.cliente_telefono})
            </p>
            <p>
              <strong className="text-slate-900">Monto:</strong>{' '}
              <span className="font-extrabold text-cancha-900">
                {formatColones(reserva.monto_total)}
              </span>
            </p>
          </div>

          {/* Instrucciones SINPE Móvil (UI-05) */}
          <div className="rounded-2xl bg-blue-50/90 border border-blue-200 p-4 text-xs sm:text-sm text-blue-900 space-y-1.5">
            <p className="font-bold">
              Instrucciones SINPE: Transferir {formatColones(reserva.monto_total)} al número oficial{' '}
              <span className="underline">{cancha?.sinpe_oficial || '8888-9999'}</span> (
              {cancha?.sinpe_titular || 'ADI Venecia'}) indicando{' '}
              <span className="font-black">&quot;{reserva.codigo_reserva}&quot;</span> en el detalle.
            </p>
            <p className="text-xs text-blue-800/90 flex items-center gap-1.5">
              <FaShieldHalved className="w-3.5 h-3.5 shrink-0" />
              <span>
                Prevención de fraudes: No realicés transferencias a números de terceros ni teléfonos no certificados.
              </span>
            </p>
          </div>

          {/* Botones de Acción: Compartir por WhatsApp e Imprimir */}
          <div className="space-y-2.5 no-print">
            <a
              href={generarEnlaceWhatsApp(reserva, cancha)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Compartir por WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <FaPrint className="w-3.5 h-3.5" />
              <span>Imprimir o guardar comprobante PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VARIANTE 2: UI-06 (P07_CanchaApp.png) — COMPROBANTE PAGO EFECTIVO   */}
      {/* =================================================================== */}
      {varianteVista === 'Efectivo' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="text-center space-y-1.5">
            <p className="text-base sm:text-lg font-extrabold text-cancha-800">
              ¡Nos vemos en la cancha!
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {reserva.codigo_reserva}
            </h1>
          </div>

          {/* Recuadro ámbar de instrucción presencial en caseta (UI-06) */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs sm:text-sm text-amber-950 font-semibold leading-relaxed">
            <strong>Pago al encargado en caseta:</strong> Presentá el código y entregá{' '}
            <strong>{formatColones(reserva.monto_total)}</strong> en efectivo antes de iniciar el
            partido.
          </div>

          {/* Ficha del jugador y monto */}
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-1.5 text-xs sm:text-sm text-slate-800">
            <p>
              <strong className="text-slate-900">Jugador:</strong> {reserva.cliente_nombre}
            </p>
            <p>
              <strong className="text-slate-900">Teléfono:</strong> {reserva.cliente_telefono}
            </p>
            <p className="capitalize">
              <strong className="text-slate-900">Horario:</strong>{' '}
              {formatFechaCorta(reserva.fecha_reserva)} · {reserva.hora_inicio}-{reserva.hora_fin}
            </p>
            <p>
              <strong className="text-slate-900">Monto por cobrar:</strong>{' '}
              <span className="font-extrabold text-slate-900">
                {formatColones(reserva.monto_total)}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-600">
            Conservá el comprobante hasta ver &quot;Pago confirmado&quot;. Entregá el dinero únicamente a administradores autorizados de la ADI Venecia.
          </div>

          <div className="space-y-2.5 no-print">
            <a
              href={generarEnlaceWhatsApp({ ...reserva, metodo_pago_previsto: 'Efectivo' }, cancha)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <FaWhatsapp className="w-5 h-5" />
              <span>Compartir por WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Enlaces de navegación rápida post-reserva */}
      <div className="grid sm:grid-cols-2 gap-3 no-print">
        <Link
          href={`/mi-reserva/?codigo=${encodeURIComponent(reserva.codigo_reserva)}`}
          className="py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:border-cancha-700 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors"
        >
          <FaMagnifyingGlass className="w-3.5 h-3.5 text-cancha-700" />
          <span>Ver estado en &quot;Mi reserva&quot;</span>
        </Link>
        <Link
          href="/"
          className="py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:border-cancha-700 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors"
        >
          <FaCalendarDays className="w-3.5 h-3.5 text-cancha-700" />
          <span>Volver al calendario de disponibilidad</span>
        </Link>
      </div>
    </div>
  );
}
