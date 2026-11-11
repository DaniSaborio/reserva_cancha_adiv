'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthMiddleware } from '@/lib/services';
import { CanchaDB } from '@/lib/db';
import {
  FaChartColumn,
  FaCalendarCheck,
  FaBan,
  FaFileCsv,
  FaRightFromBracket,
  FaRotateLeft
} from 'react-icons/fa6';

export default function AdminNav({ subtituloFecha = 'Viernes 06/11/2026', onResetDemo }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const session = AuthMiddleware.verificarToken();

  const tabs = [
    {
      label: 'Resumen',
      href: '/admin/dashboard/',
      icon: FaChartColumn,
      active: pathname.startsWith('/admin/dashboard')
    },
    {
      label: 'Reservas',
      href: '/admin/reservas/',
      icon: FaCalendarCheck,
      active: pathname.startsWith('/admin/reservas')
    },
    {
      label: 'Bloqueos',
      href: '/admin/bloqueos/',
      icon: FaBan,
      active: pathname.startsWith('/admin/bloqueos')
    },
    {
      label: 'Reportes',
      href: '/admin/reportes/',
      icon: FaFileCsv,
      active: pathname.startsWith('/admin/reportes')
    }
  ];

  const handleLogout = () => {
    AuthMiddleware.cerrarSesion();
    router.push('/admin/login/');
  };

  const handleReset = () => {
    CanchaDB.resetToSeed();
    if (onResetDemo) onResetDemo();
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3 no-print">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Administración · {subtituloFecha}
          </p>
          {session?.admin && (
            <p className="text-xs font-bold text-cancha-800 mt-0.5">
              Sesión activa: {session.admin.nombre} ({session.admin.rol})
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Restaurar los 5 registros semilla originales del documento técnico"
          >
            <FaRotateLeft className="w-3 h-3" />
            <span>Restaurar semilla</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
          >
            <FaRightFromBracket className="w-3 h-3" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Pestañas estilo P12_CanchaApp.png (UI-24) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                tab.active
                  ? 'bg-emerald-50 text-cancha-900 border-emerald-300 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${tab.active ? 'text-cancha-700' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
