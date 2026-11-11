'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CanchaDB } from '@/lib/db';
import {
  FaFutbol,
  FaWifi,
  FaFont,
  FaEye,
  FaArrowUpRightFromSquare,
  FaUserShield,
  FaBolt
} from 'react-icons/fa6';
import { MdWifiOff } from 'react-icons/md';

export default function Header() {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [fontLarge, setFontLarge] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const prefs = CanchaDB.getPreferences();
    if (prefs.fontLarge) {
      setFontLarge(true);
      document.body.classList.add('font-large');
    }
    if (prefs.highContrast) {
      setHighContrast(true);
      document.body.classList.add('high-contrast');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleFont = () => {
    const next = !fontLarge;
    setFontLarge(next);
    document.body.classList.toggle('font-large', next);
    CanchaDB.setPreferences({ fontLarge: next, highContrast });
  };

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    document.body.classList.toggle('high-contrast', next);
    CanchaDB.setPreferences({ fontLarge, highContrast: next });
  };

  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Barra superior institucional estilo CanchaApp */}
      <div className="bg-cancha-900 text-emerald-100 px-4 py-1.5 text-[11px] font-semibold">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <FaWifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <MdWifiOff className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>
              {isAdminRoute
                ? 'Panel Administrativo · ADI Venecia'
                : 'Cancha Sintética Comunal · Venecia de San Carlos'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-300">
              <FaBolt className="w-3 h-3" />
              <span>Cloudflare Edge D1 · 0% Colisiones</span>
            </span>
            <button
              onClick={toggleFont}
              className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                fontLarge
                  ? 'bg-white text-cancha-900 border-white font-bold'
                  : 'bg-cancha-800 hover:bg-cancha-700 text-emerald-100 border-emerald-700/60'
              }`}
              title="Ajustar tamaño de letra"
            >
              <FaFont className="w-2.5 h-2.5" />
              <span>{fontLarge ? 'A-' : 'A+'}</span>
            </button>
            <button
              onClick={toggleContrast}
              className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                highContrast
                  ? 'bg-amber-400 text-slate-900 border-amber-300 font-bold'
                  : 'bg-cancha-800 hover:bg-cancha-700 text-emerald-100 border-emerald-700/60'
              }`}
              title="Alternar alto contraste"
            >
              <FaEye className="w-2.5 h-2.5" />
              <span>Contraste</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cabecera principal inspirada en los wireframes P02 - P12 */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cancha-900 text-emerald-300 flex items-center justify-center shadow-xs group-hover:bg-cancha-800 transition-colors">
            <FaFutbol className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-cancha-900">
                CanchaApp
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-cancha-800 border border-emerald-200">
                ₡16 000 / hora
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Asociación de Desarrollo de Venecia
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/mi-reserva/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cancha-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors"
          >
            <span>Mi reserva</span>
            <FaArrowUpRightFromSquare className="w-3 h-3" />
          </Link>

          <Link
            href="/admin/dashboard/"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              isAdminRoute
                ? 'bg-cancha-900 text-white border-cancha-900'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <FaUserShield className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Admin</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
