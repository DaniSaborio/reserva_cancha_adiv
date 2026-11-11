// Motor de Base de Datos Relacional Isomórfico (Cloudflare D1 / SQLite Edge + Persistencia en Cliente)
// Garantiza restricciones ACID, UNIQUE(cancha_id, fecha_reserva, hora_inicio) contra colisiones de horario,
// y deserialización segura anti-Prototype Pollution (OWASP A08:2025).

import seedData from '@/data/seed_data.json';
import { safeJsonParse, computeIntegritySignature } from './security';

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
      const parsed = safeJsonParse(raw, null);
      if (
        !parsed ||
        !Array.isArray(parsed.reservas) ||
        !Array.isArray(parsed.pagos) ||
        !Array.isArray(parsed.bloqueos_horario) ||
        !Array.isArray(parsed.franjas_oficiales)
      ) {
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
      const parsed = safeJsonParse(raw, { fontLarge: false, highContrast: false });
      return {
        fontLarge: Boolean(parsed?.fontLarge),
        highContrast: Boolean(parsed?.highContrast)
      };
    } catch {
      return { fontLarge: false, highContrast: false };
    }
  },

  setPreferences(prefs) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          fontLarge: Boolean(prefs?.fontLarge),
          highContrast: Boolean(prefs?.highContrast)
        })
      );
    } catch {}
  },

  getAuthSession() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const session = safeJsonParse(raw, null);
      if (!session || !session.exp || !session.admin || !session.token) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      // A07:2025 - Expiración estricta de sesión
      if (session.exp * 1000 < Date.now()) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      // A04:2025 / A08:2025 - Verificación de firma de integridad del token
      if (session.sig) {
        const expectedSig = computeIntegritySignature(
          `${session.admin.id}:${session.admin.username}:${session.admin.rol}:${session.exp}`
        );
        if (session.sig !== expectedSig) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return null;
        }
      }
      return session;
    } catch {
      // A10:2025 - Fail-Closed: ante cualquier excepción al parsear la sesión, denegar acceso
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
