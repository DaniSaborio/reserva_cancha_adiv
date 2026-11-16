'use client';

import { useState, useEffect, useRef } from 'react';
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
  const [visible, setVisible] = useState(false);
  const containerRef = useRef(null);
  const [portalUrl, setPortalUrl] = useState(
    process.env.NEXT_PUBLIC_PORTAL_MIGRANTE_URL || 'https://migracion-info-web.pages.dev/'
  );

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_PORTAL_MIGRANTE_URL &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      const currentPort = window.location.port;
      const targetPort = currentPort === '3001' ? '3000' : '3001';
      setPortalUrl(`${window.location.protocol}//${window.location.hostname}:${targetPort}/`);
    }

    // Animación suave de entrada tipo pop-up superior
    const timer = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  // Cerrar el desplegable flotante al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!expandido) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpandido(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setExpandido(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [expandido]);

  // No mostrar en rutas administrativas ni si el usuario decidió cerrarlo
  if (pathname.startsWith('/admin') || oculto) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="max-w-4xl mx-auto px-4 pt-3 no-print relative z-30"
    >
      <aside
        role="region"
        aria-label="Iniciativa comunitaria Portal de Información Migrante"
        className={`relative bg-white/95 backdrop-blur-md bg-gradient-to-r from-sky-50/95 via-white to-emerald-50/80 rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 border border-sky-200/90 shadow-md ring-1 ring-sky-500/10 transition-all duration-300 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <FaCompass className="w-4 h-4" />
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  Servicio Social · Venecia
                </span>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  Portal de Información para Personas Migrantes
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-snug mt-0.5 line-clamp-2 sm:line-clamp-1">
                Orientación gratuita en residencia, refugio, DIMEX y seguro CCSS en la Región Huetar Norte.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              aria-expanded={expandido}
              onClick={() => setExpandido(!expandido)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                expandido
                  ? 'bg-sky-50 text-sky-900 border-sky-300'
                  : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200'
              }`}
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
            >
              <span>Visitar portal</span>
              <FaArrowUpRightFromSquare className="w-2.5 h-2.5" />
            </a>

            <button
              type="button"
              onClick={() => setOculto(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Cerrar aviso"
              aria-label="Cerrar aviso"
            >
              <FaXmark className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pop-up flotante con el detalle y QR (no desplaza el contenido inferior) */}
        {expandido && (
          <div className="sm:absolute sm:left-0 sm:right-0 sm:top-full sm:mt-2 mt-3 pt-3 sm:pt-3.5 sm:px-4 sm:pb-3.5 bg-white sm:rounded-2xl border-t sm:border border-sky-200/90 sm:shadow-xl grid sm:grid-cols-4 gap-2.5 text-xs text-slate-600 items-center z-40">
            <div className="flex items-start gap-2 bg-sky-50/50 p-2.5 rounded-xl border border-slate-100 h-full">
              <FaBookOpen className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800">5 Guías paso a paso:</strong> Refugio, Categoría Especial, Vínculo, DIMEX y Seguro CCSS sin intermediarios.
              </span>
            </div>
            <div className="flex items-start gap-2 bg-emerald-50/40 p-2.5 rounded-xl border border-slate-100 h-full">
              <FaLocationDot className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800">Directorio Regional:</strong> Sedes oficiales en Venecia, Pital, Aguas Zarcas, Ciudad Quesada, Upala y Los Chiles.
              </span>
            </div>
            <div className="flex items-start gap-2 bg-sky-50/50 p-2.5 rounded-xl border border-slate-100 h-full">
              <FaShieldHalved className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-800">100% Gratuito y Privado:</strong> Funciona sin internet y no solicita datos personales ni contraseñas.
              </span>
            </div>
            <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-sky-200 justify-center sm:justify-start">
              <img
                src="/icons/qr-portal-migrante.png"
                alt="Código QR hacia migracion-info-web.pages.dev"
                className="w-14 h-14 rounded-lg border border-slate-100 shrink-0"
              />
              <div className="text-[11px] leading-tight">
                <p className="font-extrabold text-slate-900">Código QR</p>
                <p className="text-slate-500 mt-0.5">Escaneá para abrir en otro celular</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
