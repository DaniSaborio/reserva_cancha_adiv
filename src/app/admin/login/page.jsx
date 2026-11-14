'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthMiddleware } from '@/lib/services';
import {
  FaUserShield,
  FaLock,
  FaUserCheck,
  FaCircleExclamation,
  FaArrowLeft
} from 'react-icons/fa6';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const session = AuthMiddleware.verificarToken();
    if (session) {
      router.replace('/admin/dashboard/');
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const res = AuthMiddleware.validarCredenciales(username, password);
    if (!res.ok) {
      setErrorMsg(res.error || 'Credenciales no válidas.');
      return;
    }

    router.push('/admin/dashboard/');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-cancha-800"
        >
          <FaArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al calendario público</span>
        </Link>
        <span className="text-xs font-bold text-cancha-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Módulo Administrador
        </span>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cancha-900 text-emerald-300 flex items-center justify-center shrink-0">
            <FaUserShield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Acceso Administrativo
            </h1>
            <p className="text-xs text-slate-500">
              Asociación de Desarrollo Integral de Venecia
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <FaCircleExclamation className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-user"
              className="block text-xs font-extrabold text-slate-700 mb-1.5"
            >
              Usuario o correo institucional
            </label>
            <input
              id="admin-user"
              type="text"
              required
              placeholder="Ej. admin@canchavenecia.cr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
            />
          </div>

          <div>
            <label
              htmlFor="admin-pass"
              className="block text-xs font-extrabold text-slate-700 mb-1.5"
            >
              Contraseña
            </label>
            <input
              id="admin-pass"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-5 rounded-xl bg-cancha-800 hover:bg-cancha-900 text-white font-extrabold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <FaUserCheck className="w-4 h-4" />
            <span>Iniciar sesión</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <FaLock className="w-3 h-3 text-cancha-700" />
          <span>Acceso exclusivo para personal autorizado de la ADI Venecia</span>
        </div>
      </div>
    </div>
  );
}
