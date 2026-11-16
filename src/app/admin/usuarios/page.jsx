'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/AdminNav';
import {
  AuthMiddleware,
  UsuarioAdminService,
  MODULOS_SISTEMA
} from '@/lib/services';
import { formatFechaCorta, getFechaHoyISO } from '@/lib/utils';
import {
  FaUsersGear,
  FaUserShield,
  FaUserPlus,
  FaUserCheck,
  FaUserLock,
  FaPenToSquare,
  FaTrashCan,
  FaKey,
  FaShieldHalved,
  FaCircleCheck,
  FaCircleExclamation,
  FaMagnifyingGlass,
  FaUnlockKeyhole,
  FaEye,
  FaEyeSlash,
  FaWandMagicSparkles,
  FaClockRotateLeft,
  FaCheck,
  FaXmark
} from 'react-icons/fa6';

export default function AdminUsuariosPage() {
  const [session, setSession] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [mensajeExito, setMensajeExito] = useState('');
  const [mensajeError, setMensajeError] = useState('');

  // Estado del formulario de creación / edición
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRol, setFormRol] = useState('Administrador');
  const [formActivo, setFormActivo] = useState(1);
  const [formPassword, setFormPassword] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [formPermisos, setFormPermisos] = useState([
    'dashboard',
    'reservas',
    'bloqueos',
    'reportes',
    'usuarios'
  ]);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(() => {
    const ses = AuthMiddleware.verificarToken();
    setSession(ses);
    if (!ses) return;

    setUsuarios(UsuarioAdminService.listarUsuarios());
    setBitacora(UsuarioAdminService.obtenerBitacoraSeguridad(10));

    if (ses.token) {
      UsuarioAdminService.listarUsuariosAsync(ses.token).then((remotos) => {
        if (remotos) setUsuarios(remotos);
      });
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    cargarDatos();
    const handleUpdate = () => cargarDatos();
    window.addEventListener('cancha-db-updated', handleUpdate);
    window.addEventListener('cancha-auth-updated', handleUpdate);
    return () => {
      window.removeEventListener('cancha-db-updated', handleUpdate);
      window.removeEventListener('cancha-auth-updated', handleUpdate);
    };
  }, [cargarDatos]);

  const mostrarAviso = (exito = '', error = '') => {
    setMensajeExito(exito);
    setMensajeError(error);
    if (exito) {
      setTimeout(() => setMensajeExito(''), 4500);
    }
  };

  const abrirNuevoUsuario = () => {
    setEditandoId(null);
    setFormNombre('');
    setFormCargo('Directiva ADI Venecia');
    setFormUsername('');
    setFormEmail('');
    setFormRol('Administrador');
    setFormActivo(1);
    setFormPassword('');
    setFormPermisos(UsuarioAdminService.permisosPorDefecto('Administrador'));
    setMostrarFormulario(true);
    setMensajeError('');
  };

  const abrirEditarUsuario = (u) => {
    setEditandoId(u.id);
    setFormNombre(u.nombre || '');
    setFormCargo(u.cargo || 'Directiva ADI');
    setFormUsername(u.username || '');
    setFormEmail(u.email || '');
    setFormRol(u.rol || 'Administrador');
    setFormActivo(Number(u.activo) === 0 ? 0 : 1);
    setFormPassword('');
    setFormPermisos(
      Array.isArray(u.permisos) && u.permisos.length > 0
        ? u.permisos
        : UsuarioAdminService.permisosPorDefecto(u.rol)
    );
    setMostrarFormulario(true);
    setMensajeError('');
  };

  const handleCambiarRolForm = (nuevoRol) => {
    setFormRol(nuevoRol);
    setFormPermisos(UsuarioAdminService.permisosPorDefecto(nuevoRol));
  };

  const togglePermiso = (moduloId) => {
    setFormPermisos((prev) =>
      prev.includes(moduloId)
        ? prev.filter((item) => item !== moduloId)
        : [...prev, moduloId]
    );
  };

  const generarClaveSegura = () => {
    const sufijos = ['2026!', 'ADI#26', 'Venecia$9', 'Cancha!26'];
    const randomNum = Math.floor(100 + Math.random() * 900);
    const clave = `Venecia${randomNum}!`;
    setFormPassword(clave);
    setMostrarPass(true);
  };

  const handleGuardarUsuario = async (e) => {
    e.preventDefault();
    setMensajeError('');
    setMensajeExito('');

    if (formPermisos.length === 0) {
      setMensajeError('Seleccioná al menos un módulo de acceso para el usuario.');
      return;
    }

    setGuardando(true);

    if (editandoId) {
      const cambios = {
        nombre: formNombre,
        cargo: formCargo,
        email: formEmail,
        rol: formRol,
        activo: formActivo,
        permisos: formPermisos
      };
      if (formPassword.trim()) {
        if (formPassword.trim().length < 6) {
          setGuardando(false);
          setMensajeError('La nueva contraseña debe tener al menos 6 caracteres.');
          return;
        }
        cambios.password = formPassword.trim();
      }

      const res = await UsuarioAdminService.actualizarUsuarioAsync(
        editandoId,
        cambios,
        session?.token,
        session?.admin?.id
      );
      setGuardando(false);

      if (!res.ok) {
        setMensajeError(res.error || 'No se pudo actualizar el usuario.');
        return;
      }

      setMostrarFormulario(false);
      cargarDatos();
      mostrarAviso(
        `Permisos y datos de "${res.usuario.nombre}" actualizados correctamente.`
      );
    } else {
      const res = await UsuarioAdminService.crearUsuarioAsync(
        {
          username: formUsername,
          nombre: formNombre,
          cargo: formCargo,
          email: formEmail,
          rol: formRol,
          activo: formActivo,
          password: formPassword,
          permisos: formPermisos
        },
        session?.token
      );
      setGuardando(false);

      if (!res.ok) {
        setMensajeError(res.error || 'No se pudo crear el usuario.');
        return;
      }

      setMostrarFormulario(false);
      cargarDatos();
      mostrarAviso(
        `Usuario "@${res.usuario.username}" (${res.usuario.rol}) creado con éxito.`
      );
    }
  };

  const handleCambiarRolRapido = async (u, nuevoRol) => {
    const res = await UsuarioAdminService.actualizarUsuarioAsync(
      u.id,
      {
        rol: nuevoRol,
        permisos: UsuarioAdminService.permisosPorDefecto(nuevoRol)
      },
      session?.token,
      session?.admin?.id
    );
    if (!res.ok) {
      mostrarAviso('', res.error);
      return;
    }
    cargarDatos();
    mostrarAviso(`Rol de "${u.nombre}" cambiado a ${nuevoRol}.`);
  };

  const handleAlternarAcceso = async (u) => {
    const nuevoEstado = Number(u.activo) === 1 ? 0 : 1;
    const res = await UsuarioAdminService.actualizarUsuarioAsync(
      u.id,
      { activo: nuevoEstado },
      session?.token,
      session?.admin?.id
    );
    if (!res.ok) {
      mostrarAviso('', res.error);
      return;
    }
    cargarDatos();
    mostrarAviso(
      nuevoEstado === 1
        ? `Acceso reactivado para "${u.nombre}".`
        : `Acceso suspendido para "${u.nombre}".`
    );
  };

  const handleEliminarUsuario = async (u) => {
    const res = await UsuarioAdminService.eliminarUsuarioAsync(
      u.id,
      session?.token,
      session?.admin?.id
    );
    if (!res.ok) {
      mostrarAviso('', res.error);
      return;
    }
    cargarDatos();
    mostrarAviso(`Usuario "@${u.username}" eliminado del sistema.`);
  };

  const handleDesbloquearLogins = () => {
    UsuarioAdminService.desbloquearIntentosLogin();
    cargarDatos();
    mostrarAviso(
      'Se restablecieron todos los bloqueos temporales por intentos fallidos de inicio de sesión.'
    );
  };

  if (!mounted) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center text-sm font-semibold text-slate-500">
        Cargando panel de usuarios, roles y accesos...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cancha-900 text-emerald-300 flex items-center justify-center mx-auto">
          <FaUserShield className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">
          Sesión Administrativa Requerida
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Iniciá sesión como Administrador para controlar roles, accesos y usuarios.
        </p>
        <div className="pt-2">
          <Link
            href="/admin/login/"
            className="block w-full py-3.5 px-4 rounded-xl bg-cancha-800 hover:bg-cancha-900 text-white font-extrabold text-xs sm:text-sm transition-colors"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  const esAdmin = session?.admin?.rol === 'Administrador';

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroRol !== 'Todos' && u.rol !== filtroRol) return false;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      return (
        u.nombre?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.cargo?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalActivos = usuarios.filter((u) => Number(u.activo) === 1).length;
  const totalSuspendidos = usuarios.length - totalActivos;
  const totalAdmins = usuarios.filter((u) => u.rol === 'Administrador').length;
  const totalTesoreros = usuarios.filter((u) => u.rol === 'Tesorero').length;

  return (
    <div className="space-y-6">
      <AdminNav subtituloFecha={formatFechaCorta(getFechaHoyISO())} />

      {/* Encabezado y KPIs de Control de Acceso */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cancha-900 text-emerald-300 flex items-center justify-center shrink-0">
              <FaUsersGear className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Control de Roles, Accesos y Usuarios
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-cancha-800 border border-emerald-200">
                  RBAC · OWASP A01 / A07
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Administrá quién puede entrar al panel de la cancha, sus permisos por módulo y sus credenciales.
              </p>
            </div>
          </div>

          {esAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDesbloquearLogins}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                title="Restablecer bloqueos por intentos fallidos de contraseña"
              >
                <FaUnlockKeyhole className="w-3.5 h-3.5 text-cancha-700" />
                <span>Desbloquear logins</span>
              </button>

              <button
                type="button"
                onClick={abrirNuevoUsuario}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-cancha-800 hover:bg-cancha-900 text-white shadow-sm transition-colors"
              >
                <FaUserPlus className="w-3.5 h-3.5" />
                <span>Nuevo usuario</span>
              </button>
            </div>
          )}
        </div>

        {/* 4 Tarjetas KPI de Usuarios y Seguridad */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80 space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Usuarios Totales
            </p>
            <p className="text-2xl font-black text-slate-900">{usuarios.length}</p>
            <p className="text-[11px] font-semibold text-emerald-700">
              {totalActivos} activos · {totalSuspendidos} suspendidos
            </p>
          </div>

          <div className="rounded-2xl p-3.5 bg-emerald-50/60 border border-emerald-200/80 space-y-1">
            <p className="text-[11px] font-bold text-cancha-800 uppercase tracking-wider">
              Administradores
            </p>
            <p className="text-2xl font-black text-cancha-900">{totalAdmins}</p>
            <p className="text-[11px] font-semibold text-cancha-700">
              Control total del sistema
            </p>
          </div>

          <div className="rounded-2xl p-3.5 bg-sky-50/70 border border-sky-200/80 space-y-1">
            <p className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
              Tesorería / Finanzas
            </p>
            <p className="text-2xl font-black text-sky-950">{totalTesoreros}</p>
            <p className="text-[11px] font-semibold text-sky-700">
              Pagos, reservas y reportes
            </p>
          </div>

          <div className="rounded-2xl p-3.5 bg-amber-50/60 border border-amber-200/80 space-y-1">
            <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Sesión y Protección
            </p>
            <p className="text-sm font-black text-amber-950 pt-1">
              JWT 8h · Anti-BruteForce
            </p>
            <p className="text-[11px] font-semibold text-amber-800">
              Máx. 5 intentos fallidos
            </p>
          </div>
        </div>

        {mensajeExito && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-cancha-900 text-xs font-bold flex items-center gap-2">
            <FaCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {mensajeError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <FaCircleExclamation className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensajeError}</span>
          </div>
        )}

        {!esAdmin && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            Estás conectado con el rol <strong>{session.admin.rol}</strong> (modo lectura). Para crear usuarios, cambiar contraseñas o modificar roles iniciá sesión con una cuenta de <strong>Administrador</strong> (por ejemplo <code>sabo</code> o <code>admin</code>).
          </div>
        )}
      </div>

      {/* Formulario Desplegable para Crear o Editar Usuario y Permisos */}
      {mostrarFormulario && esAdmin && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-cancha-700/80 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-cancha-900 flex items-center justify-center">
                {editandoId ? (
                  <FaPenToSquare className="w-4 h-4" />
                ) : (
                  <FaUserPlus className="w-4 h-4" />
                )}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {editandoId
                    ? `Editar usuario y accesos (@${formUsername})`
                    : 'Registrar nuevo usuario administrativo'}
                </h2>
                <p className="text-xs text-slate-500">
                  Definí sus credenciales, su rol en la ADI y los módulos a los que tendrá acceso.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMostrarFormulario(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Cerrar formulario"
            >
              <FaXmark className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleGuardarUsuario} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Daniel Saborío Rodríguez"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Cargo o función en la ADI *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Dirección General / Encargado / Tesorería"
                  value={formCargo}
                  onChange={(e) => setFormCargo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Usuario de acceso (username) *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editandoId)}
                  placeholder="Ej. sabo"
                  value={formUsername}
                  onChange={(e) =>
                    setFormUsername(
                      e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()
                    )
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Correo institucional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ej. sabo@canchavenecia.cr"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
                />
              </div>
            </div>

            {/* Contraseña y Rol */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  {editandoId
                    ? 'Nueva contraseña (opcional)'
                    : 'Contraseña de acceso *'}
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={mostrarPass ? 'text' : 'password'}
                      required={!editandoId}
                      placeholder={
                        editandoId ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'
                      }
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPass(!mostrarPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title="Mostrar u ocultar contraseña"
                    >
                      {mostrarPass ? (
                        <FaEyeSlash className="w-3.5 h-3.5" />
                      ) : (
                        <FaEye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generarClaveSegura}
                    className="px-2.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold shrink-0"
                    title="Generar contraseña segura"
                  >
                    <FaWandMagicSparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Rol asignado *
                </label>
                <select
                  value={formRol}
                  onChange={(e) => handleCambiarRolForm(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-cancha-700"
                >
                  <option value="Administrador">Administrador (Control Total)</option>
                  <option value="Tesorero">Tesorero (Finanzas y Consultas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Estado de acceso *
                </label>
                <select
                  value={formActivo}
                  onChange={(e) => setFormActivo(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-cancha-700"
                >
                  <option value={1}>Activo (Puede iniciar sesión)</option>
                  <option value={0}>Suspendido (Acceso bloqueado)</option>
                </select>
              </div>
            </div>

            {/* Permisos granulares por módulo */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700">
                  Módulos y permisos habilitados para este usuario:
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormPermisos(MODULOS_SISTEMA.map((m) => m.id))
                  }
                  className="text-[11px] font-bold text-cancha-800 hover:underline"
                >
                  Marcar todos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {MODULOS_SISTEMA.map((mod) => {
                  const marcado = formPermisos.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => togglePermiso(mod.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                        marcado
                          ? 'bg-emerald-50/70 border-cancha-700 text-cancha-950 shadow-sm'
                          : 'bg-slate-50/70 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center shrink-0 border ${
                          marcado
                            ? 'bg-cancha-800 border-cancha-800 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {marcado && <FaCheck className="w-2.5 h-2.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold leading-tight">
                          {mod.label}
                        </p>
                        <p className="text-[11px] opacity-80 leading-snug mt-0.5">
                          {mod.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-cancha-800 hover:bg-cancha-900 disabled:opacity-60 text-white shadow-sm transition-colors"
              >
                {guardando
                  ? 'Guardando cambios...'
                  : editandoId
                  ? 'Guardar cambios de acceso'
                  : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador, Filtro por Rol y Lista de Usuarios */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <FaMagnifyingGlass className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, @usuario, correo o cargo..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-cancha-700"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['Todos', 'Administrador', 'Tesorero'].map((rolFiltro) => (
              <button
                key={rolFiltro}
                type="button"
                onClick={() => setFiltroRol(rolFiltro)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  filtroRol === rolFiltro
                    ? 'bg-emerald-50 text-cancha-900 border-emerald-300'
                    : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {rolFiltro}
              </button>
            ))}
          </div>
        </div>

        {/* Tarjetas de cada usuario */}
        <div className="space-y-3">
          {usuariosFiltrados.map((u) => {
            const esMiCuenta =
              Number(session?.admin?.id) === Number(u.id) ||
              session?.admin?.username?.toLowerCase() === u.username?.toLowerCase();
            const estaActivo = Number(u.activo) === 1;
            const permisosUsuario = Array.isArray(u.permisos)
              ? u.permisos
              : UsuarioAdminService.permisosPorDefecto(u.rol);

            return (
              <div
                key={u.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  estaActivo
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      {u.nombre}
                    </span>

                    {esMiCuenta && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cancha-900 text-emerald-200">
                        Tu sesión actual
                      </span>
                    )}

                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        u.rol === 'Administrador'
                          ? 'bg-emerald-50 text-cancha-800 border-emerald-200'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      {u.rol}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        estaActivo
                          ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {estaActivo ? (
                        <>
                          <FaUserCheck className="w-2.5 h-2.5" />
                          <span>Acceso Activo</span>
                        </>
                      ) : (
                        <>
                          <FaUserLock className="w-2.5 h-2.5" />
                          <span>Acceso Suspendido</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>
                      <strong className="text-slate-800">Usuario:</strong>{' '}
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-cancha-900 font-bold">
                        @{u.username}
                      </code>
                    </span>
                    <span>
                      <strong className="text-slate-800">Correo:</strong> {u.email}
                    </span>
                    <span>
                      <strong className="text-slate-800">Cargo:</strong>{' '}
                      {u.cargo || 'Directiva ADI'}
                    </span>
                    <span>
                      <strong className="text-slate-800">Clave:</strong>{' '}
                      {u.password_custom ? 'Personalizada' : 'Oficial (Venecia2026!)'}
                    </span>
                  </div>

                  {/* Chips de módulos con acceso */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">
                      Accesos:
                    </span>
                    {MODULOS_SISTEMA.map((mod) => {
                      const permitido = permisosUsuario.includes(mod.id);
                      return (
                        <span
                          key={mod.id}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                            permitido
                              ? 'bg-slate-100 text-slate-800 border-slate-200'
                              : 'bg-slate-50 text-slate-400 border-slate-100 line-through'
                          }`}
                        >
                          {mod.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Controles de Rol, Edición y Suspensión */}
                {esAdmin && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <label className="sr-only" htmlFor={`rol-${u.id}`}>
                      Cambiar rol de {u.nombre}
                    </label>
                    <select
                      id={`rol-${u.id}`}
                      value={u.rol}
                      onChange={(e) => handleCambiarRolRapido(u, e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 focus:outline-none focus:border-cancha-700"
                      title="Cambiar rol rápidamente"
                    >
                      <option value="Administrador">Rol: Administrador</option>
                      <option value="Tesorero">Rol: Tesorero</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => abrirEditarUsuario(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
                      title="Editar permisos, datos o cambiar contraseña"
                    >
                      <FaKey className="w-3 h-3 text-cancha-700" />
                      <span>Accesos / Clave</span>
                    </button>

                    <button
                      type="button"
                      disabled={esMiCuenta}
                      onClick={() => handleAlternarAcceso(u)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        estaActivo
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                      }`}
                      title={
                        esMiCuenta
                          ? 'No podés suspender tu propia sesión activa'
                          : estaActivo
                          ? 'Suspender acceso de este usuario'
                          : 'Reactivar acceso de este usuario'
                      }
                    >
                      {estaActivo ? (
                        <>
                          <FaUserLock className="w-3 h-3" />
                          <span>Suspender</span>
                        </>
                      ) : (
                        <>
                          <FaUserCheck className="w-3 h-3" />
                          <span>Activar</span>
                        </>
                      )}
                    </button>

                    {!esMiCuenta && (
                      <button
                        type="button"
                        onClick={() => handleEliminarUsuario(u)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                        title="Eliminar usuario"
                        aria-label={`Eliminar usuario ${u.nombre}`}
                      >
                        <FaTrashCan className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Matriz de Roles + Bitácora de Auditoría de Accesos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Matriz de Roles */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FaShieldHalved className="w-4 h-4 text-cancha-700" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Matriz de Roles y Nivel de Autorización
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Privilegios base asignados por rol según las políticas de control de acceso de la ADI Venecia.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2 font-bold">Módulo / Acción</th>
                  <th className="py-2 px-2 font-bold text-center text-cancha-800">
                    Administrador
                  </th>
                  <th className="py-2 pl-2 font-bold text-center text-sky-800">
                    Tesorero
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-2 pr-2 font-semibold">
                    Resumen y KPIs de ingresos
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                  <td className="py-2 pl-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-semibold">
                    Registrar pagos SINPE / Efectivo
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                  <td className="py-2 pl-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-semibold">
                    Cambiar precios y tarifas de la cancha
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                  <td className="py-2 pl-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-semibold">
                    Exportar cierres contables CSV
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                  <td className="py-2 pl-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-semibold">
                    Bloquear horarios por mantenimiento
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-700 font-bold">✓ Completo</td>
                  <td className="py-2 pl-2 text-center text-slate-400 font-semibold">Opcional</td>
                </tr>
                <tr>
                  <td className="py-2 pr-2 font-semibold">
                    Controlar usuarios, roles y accesos
                  </td>
                  <td className="py-2 px-2 text-center text-emerald-700 font-bold">✓ Exclusivo</td>
                  <td className="py-2 pl-2 text-center text-rose-600 font-semibold">Solo lectura</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bitácora de Auditoría de Seguridad en Vivo */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaClockRotateLeft className="w-4 h-4 text-cancha-700" />
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Bitácora Reciente de Accesos y Seguridad
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              OWASP A09
            </span>
          </div>

          {bitacora.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Aún no se registran eventos de seguridad en esta sesión.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {bitacora.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : item.severity === 'WARN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-cancha-900'
                        }`}
                      >
                        {item.event}
                      </span>
                      <span className="text-slate-600 font-semibold truncate">
                        {item.details?.username ||
                          item.details?.user ||
                          item.details?.codigo ||
                          ''}
                        {item.details?.rol ? ` (${item.details.rol})` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 shrink-0 tabular-nums">
                    {item.timestamp ? item.timestamp.slice(11, 19) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
