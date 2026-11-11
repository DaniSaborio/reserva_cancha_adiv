'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminNav from '@/components/AdminNav';
import {
  DashboardController,
  PagoService,
  AuthMiddleware
} from '@/lib/services';
import { formatColones, formatDDMMYYYY } from '@/lib/utils';
import {
  FaFileCsv,
  FaPrint,
  FaCalendarDays,
  FaMobileScreenButton,
  FaMoneyBillWave,
  FaCoins,
  FaClock
} from 'react-icons/fa6';

export default function AdminReportesPage() {
  const [desde, setDesde] = useState('2026-11-01');
  const [hasta, setHasta] = useState('2026-11-30');
  const [balance, setBalance] = useState(null);
  const [registros, setRegistros] = useState([]);

  const calcularReporte = useCallback(() => {
    if (!AuthMiddleware.verificarToken()) {
      AuthMiddleware.validarCredenciales('admin@canchavenecia.cr', 'Venecia2026!');
    }
    const bal = PagoService.calcularBalance(desde, hasta);
    setBalance(bal);
    const lista = DashboardController.listarReservasRecientes({ desde, hasta });
    setRegistros(lista);
  }, [desde, hasta]);

  useEffect(() => {
    calcularReporte();
    const handleUpdate = () => calcularReporte();
    window.addEventListener('cancha-db-updated', handleUpdate);
    return () => window.removeEventListener('cancha-db-updated', handleUpdate);
  }, [calcularReporte]);

  const handleDescargarCSV = () => {
    const csvContent = DashboardController.exportarReporteCSV({ desde, hasta });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_cancha_venecia_${desde}_a_${hasta}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reportes Financieros y Exportación Contable
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Cierres por rango de fechas y exportación directa a Excel / CSV para la Tesorería y Fiscalía de la ADI Venecia (HU-10 / HU-14)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={handleDescargarCSV}
            className="px-4 py-2.5 rounded-xl bg-cancha-800 hover:bg-cancha-900 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-colors"
          >
            <FaFileCsv className="w-4 h-4" />
            <span>Descargar Reporte en Excel/CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <FaPrint className="w-3.5 h-3.5" />
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>

      <AdminNav
        subtituloFecha={`Periodo ${formatDDMMYYYY(desde)} al ${formatDDMMYYYY(hasta)}`}
        onResetDemo={calcularReporte}
      />

      {/* Selector de Rango de Fechas (HU-10) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <FaCalendarDays className="w-4 h-4 text-cancha-700" />
            <span>Filtrar ingresos y reservas por periodo:</span>
          </h2>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setDesde('2026-11-06');
                setHasta('2026-11-06');
              }}
              className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700"
            >
              Viernes 06/11
            </button>
            <button
              type="button"
              onClick={() => {
                setDesde('2026-11-02');
                setHasta('2026-11-08');
              }}
              className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700"
            >
              Semana 02/11 al 08/11
            </button>
            <button
              type="button"
              onClick={() => {
                setDesde('2026-11-01');
                setHasta('2026-11-30');
              }}
              className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-cancha-900"
            >
              Noviembre 2026 Completo
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Fecha inicial (Desde)
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Fecha final (Hasta)
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Tarjetas KPI del Periodo Seleccionado */}
      {balance && (
        <div className="grid sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <FaCoins className="w-3.5 h-3.5 text-cancha-700" />
              <span>Total Recaudado</span>
            </div>
            <p className="text-2xl font-black text-slate-900">
              {formatColones(balance.totalRecaudado)}
            </p>
            <p className="text-[11px] text-slate-500">
              {balance.conteoSinpe + balance.conteoEfectivo} partidos liquidados
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cancha-800">
              <FaMobileScreenButton className="w-3.5 h-3.5" />
              <span>Total SINPE Móvil</span>
            </div>
            <p className="text-2xl font-black text-cancha-900">
              {formatColones(balance.totalSinpe)}
            </p>
            <p className="text-[11px] font-bold text-cancha-700">
              {balance.pctSinpe}% · {balance.conteoSinpe} transferencias
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <FaMoneyBillWave className="w-3.5 h-3.5" />
              <span>Total en Efectivo</span>
            </div>
            <p className="text-2xl font-black text-emerald-800">
              {formatColones(balance.totalEfectivo)}
            </p>
            <p className="text-[11px] font-bold text-emerald-700">
              {balance.pctEfectivo}% · {balance.conteoEfectivo} cobros en caseta
            </p>
          </div>

          <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <FaClock className="w-3.5 h-3.5" />
              <span>Por Cobrar (Pendientes)</span>
            </div>
            <p className="text-2xl font-black text-amber-900">
              {formatColones(balance.pendientePorCobrar)}
            </p>
            <p className="text-[11px] font-semibold text-amber-800">
              {balance.conteoPendientes} turnos pendientes
            </p>
          </div>
        </div>
      )}

      {/* Tabla Contable Detallada para Exportación / Impresión */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900">
            Detalle Contable de Reservas e Ingresos ({registros.length})
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Asociación de Desarrollo Integral de Venecia
          </span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase">
              <th className="py-2.5 px-2 font-extrabold">Código</th>
              <th className="py-2.5 px-2 font-extrabold">Fecha y Hora</th>
              <th className="py-2.5 px-2 font-extrabold">Cliente / Equipo</th>
              <th className="py-2.5 px-2 font-extrabold">Teléfono</th>
              <th className="py-2.5 px-2 font-extrabold">Método</th>
              <th className="py-2.5 px-2 font-extrabold">Comprobante</th>
              <th className="py-2.5 px-2 font-extrabold">Estado</th>
              <th className="py-2.5 px-2 font-extrabold text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.map((r) => {
              const metodo = r.pago ? r.pago.metodo_pago : r.metodo_pago_previsto;
              const comprobante = r.pago?.numero_comprobante || (r.pago ? 'Caseta' : '—');
              return (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-2 font-black text-slate-900">{r.codigo_reserva}</td>
                  <td className="py-3 px-2 font-semibold text-slate-700">
                    {formatDDMMYYYY(r.fecha_reserva)} · {r.hora_inicio}–{r.hora_fin}
                  </td>
                  <td className="py-3 px-2 font-bold text-slate-900">{r.cliente_nombre}</td>
                  <td className="py-3 px-2 text-slate-600">{r.cliente_telefono}</td>
                  <td className="py-3 px-2 font-semibold text-slate-800">{metodo}</td>
                  <td className="py-3 px-2 font-mono text-slate-600">{comprobante}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        r.estado === 'Confirmada'
                          ? 'bg-emerald-100 text-cancha-900'
                          : r.estado === 'Pendiente'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-extrabold text-slate-900 text-right">
                    {r.estado === 'Cancelada' ? '₡0' : formatColones(r.monto_total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
