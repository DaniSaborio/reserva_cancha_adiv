'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  FaCompass,
  FaArrowUpRightFromSquare,
  FaChevronDown,
  FaChevronUp,
  FaXmark,
  FaShieldHalved,
  FaBookOpen,
  FaLocationDot
} from 'react-icons/fa6';

export default function PromoPortalMigrante() {
  const pathname = usePathname() || '/';
  const [oculto, setOculto] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const [portalUrl, setPortalUrl] = useState(
    process.env.NEXT_PUBLIC_PORTAL_MIGRANTE_URL || 'http://localhost:3001/'
  );

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PORTAL_MIGRANTE_URL && typeof window !== 'undefined') {
      const currentPort = window.location.port;
      const targetPort = currentPort === '3001' ? '3000' : '3001';
      setPortalUrl(`${window.location.protocol}//${window.location.hostname}:${targetPort}/`);
    }
  }, []);

  // No mostrar en rutas administrativas ni si el usuario decidió cerrarlo
  if (pathname.startsWith('/admin') || oculto) {
    return null;
  }

  return (
    <aside
      aria-label="Iniciativa comunitaria Portal de Información Migrante"
      className="mt-6 bg-gradient-to-r from-sky-50/90 via-white to-emerald-50/60 rounded-2xl p-4 border border-sky-200/80 shadow-2xs no-print transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <FaCompass className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                Servicio Social · ADI Venecia
              </span>
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                Portal de Información para Personas Migrantes
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Conocés a alguien que necesite orientación en trámites de residencia, refugio, DIMEX o seguro de la CCSS en la Región Huetar Norte?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setExpandido(!expandido)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            <span>{expandido ? 'Menos info' : 'Qué incluye'}</span>
            {expandido ? (
              <FaChevronUp className="w-2.5 h-2.5" />
            ) : (
              <FaChevronDown className="w-2.5 h-2.5" />
            )}
          </button>

          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white shadow-2xs transition-colors"
          >
            <span>Visitar portal</span>
            <FaArrowUpRightFromSquare className="w-2.5 h-2.5" />
          </a>

          <button
            type="button"
            onClick={() => setOculto(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Ocultar aviso"
            aria-label="Ocultar aviso"
          >
            <FaXmark className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expandido && (
        <div className="mt-3 pt-3 border-t border-sky-100 grid sm:grid-cols-3 gap-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-100">
            <FaBookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">5 Guías paso a paso:</strong> Refugio, Categoría Especial, Vínculo, DIMEX y Seguro CCSS sin intermediarios.
            </span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-100">
            <FaLocationDot className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">Directorio Regional:</strong> Sedes oficiales en Venecia, Pital, Aguas Zarcas, Ciudad Quesada, Upala y Los Chiles.
            </span>
          </div>
          <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-100">
            <FaShieldHalved className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-800">100% Gratuito y Privado:</strong> Funciona sin internet y no solicita datos personales ni contraseñas.
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
