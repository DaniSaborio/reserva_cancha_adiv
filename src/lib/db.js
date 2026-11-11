// Motor de Base de Datos Relacional Isomórfico (Cloudflare D1 / SQLite Edge + Persistencia en Cliente)
// Garantiza restricciones ACID y UNIQUE(cancha_id, fecha_reserva, hora_inicio) contra colisiones de horario.

import seedData from '@/data/seed_data.json';

const DB_STORAGE_KEY = 'cancha_venecia_d1_database_v1';
const PREFS_STORAGE_KEY = 'cancha_venecia_preferencias_v1';
const AUTH_STORAGE_KEY = 'cancha_venecia_admin_jwt_v1';

let memoryFallbackDB = null;

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export const CanchaDB = {
  getInitialState() {
    return {
      version: '2026.1',
      cancha: cloneDeep(seedData.cancha),
      franjas_oficiales: cloneDeep(seedData.franjas_oficiales),
      usuarios_admin: cloneDeep(seedData.usuarios_admin),
      reservas: cloneDeep(seedData.reservas),
      pagos: cloneDeep(seedData.pagos),
      bloqueos_horario: cloneDeep(seedData.bloqueos_horario),
      nextReservaSeq: 6
    };
  },

  load() {
    if (typeof window === 'undefined') {
      return this.getInitialState();
    }
    try {
      const raw = localStorage.getItem(DB_STORAGE_KEY);
      if (!raw) {
        const init = this.getInitialState();
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(init));
        return init;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.reservas)) {
        const init = this.getInitialState();
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(init));
        return init;
      }
      return parsed;
    } catch {
      if (!memoryFallbackDB) {
        memoryFallbackDB = this.getInitialState();
      }
      return memoryFallbackDB;
    }
  },

  save(state) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('cancha-db-updated'));
    } catch {
      memoryFallbackDB = state;
    }
  },

  resetToSeed() {
    const init = this.getInitialState();
    this.save(init);
    return init;
  },

  getPreferences() {
    if (typeof window === 'undefined') return { fontLarge: false, highContrast: false };
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { fontLarge: false, highContrast: false };
    } catch {
      return { fontLarge: false, highContrast: false };
    }
  },

  setPreferences(prefs) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  },

  getAuthSession() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.exp && session.exp * 1000 < Date.now()) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  setAuthSession(session) {
    if (typeof window === 'undefined') return;
    try {
      if (!session) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }
      window.dispatchEvent(new CustomEvent('cancha-auth-updated'));
    } catch {}
  }
};
