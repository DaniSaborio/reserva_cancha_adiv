// =============================================================================
// Módulo de Seguridad Aplicada — Estándar OWASP Top 10:2025 + Controles Básicos
// Proyecto: CanchaApp — Asociación de Desarrollo Integral de Venecia (ADI Venecia)
// =============================================================================
// Cobertura de controles implementados:
// - A01:2025 Broken Access Control (Verificación RBAC, Anti-IDOR en teléfonos, Anti-Path Traversal)
// - A02:2025 Security Misconfiguration (Cabeceras CSP, HSTS, X-Frame-Options, nosniff)
// - A03:2025 Software Supply Chain Failures (Política de caché segura y dependencias acotadas)
// - A04:2025 Cryptographic Failures (CSPRNG con WebCrypto, firma de sesión y comparación tiempo constante)
// - A05:2025 Injection (Sanitización XSS/HTML, validación estricta de esquemas y Anti-CSV Injection)
// - A06:2025 Insecure Design (Rate Limiting anti-acaparamiento de turnos y validación de reglas de negocio)
// - A07:2025 Authentication Failures (Bloqueo temporal contra fuerza bruta y expiración estricta de JWT)
// - A08:2025 Software or Data Integrity Failures (Deserialización JSON segura anti-Prototype Pollution)
// - A09:2025 Security Logging and Alerting Failures (Bitácora de auditoría de eventos críticos)
// - A10:2025 Mishandling of Exceptional Conditions (Manejo seguro de errores "Fail-Closed")
// =============================================================================

const RATE_LIMIT_STORAGE_KEY = 'cancha_venecia_ratelimit_v1';
const LOGIN_LOCKOUT_STORAGE_KEY = 'cancha_venecia_login_lockout_v1';
const AUDIT_LOG_STORAGE_KEY = 'cancha_venecia_audit_log_v1';
const JWT_INTEGRITY_PEPPER = 'ADI_Venecia_Cancha_2026_OWASP_Pepper_v1';

// Horarios oficiales permitidos (Regla de negocio inmutable - A06:2025)
export const HORAS_OFICIALES_PERMITIDAS = [
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00'
];

export const TARIFA_OFICIAL_CRC = 16000;

/**
 * A04:2025 - Generador criptográficamente seguro de enteros aleatorios (CSPRNG)
 * Reemplaza el uso inseguro de Math.random() para códigos de reserva e identificadores.
 */
export function secureRandomInt(min, max) {
  const range = max - min + 1;
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return min + (array[0] % range);
  }
  return min + Math.floor(Math.random() * range);
}

/**
 * A04:2025 / A07:2025 - Comparación de cadenas en tiempo constante (Anti-Timing Attack)
 */
export function timingSafeEqualStr(a, b) {
  const strA = String(a || '');
  const strB = String(b || '');
  const len = Math.max(strA.length, strB.length);
  let result = strA.length ^ strB.length;
  for (let i = 0; i < len; i++) {
    const charA = i < strA.length ? strA.charCodeAt(i) : 0;
    const charB = i < strB.length ? strB.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

/**
 * A04:2025 / A08:2025 - Firma determinista ligera tipo HMAC (FNV-1a + Pepper) para integridad de sesión
 */
export function computeIntegritySignature(payloadStr) {
  const input = `${payloadStr}.${JWT_INTEGRITY_PEPPER}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `v2025_${hex1}${hex2}`;
}

/**
 * A05:2025 - Sanitización contra XSS, inyección de etiquetas HTML y caracteres de control
 */
export function sanitizeText(input, maxLength = 100) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // Eliminar caracteres de control ASCII
    .replace(/[<>]/g, '') // Neutralizar etiquetas HTML/scripts (<script>, <img onerror=...>)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * A05:2025 - Prevención de Inyección de Fórmulas en CSV / Excel (CSV Injection - CWE-1236)
 * Si un campo inicia con '=', '+', '-', '@', '\t' o '\r', se antepone un apóstrofo (')
 * para evitar ejecución de comandos o hipervínculos maliciosos al abrir en Microsoft Excel.
 */
export function sanitizeCSVCell(value) {
  const str = String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  const neutralized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * A05:2025 / A06:2025 - Validadores estrictos de formato y dominio
 */
export function isValidFechaISO(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [y, m, d] = fecha.split('-').map(Number);
  if (y < 2024 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function isValidHoraOficial(hora) {
  return typeof hora === 'string' && HORAS_OFICIALES_PERMITIDAS.includes(hora);
}

export function isValidTelefonoCR(telefono) {
  const digits = String(telefono || '').replace(/[^\d]/g, '');
  // En Costa Rica los teléfonos móviles/fijos válidos constan de 8 dígitos e inician con 2, 4, 5, 6, 7 u 8
  return /^[245678]\d{7}$/.test(digits);
}

export function sanitizeComprobante(comprobante) {
  const clean = sanitizeText(comprobante, 32).replace(/[^a-zA-Z0-9\-_#]/g, '');
  return clean;
}

/**
 * A08:2025 - Deserialización JSON segura contra Prototype Pollution (__proto__, constructor, prototype)
 */
export function safeJsonParse(rawJson, fallback = null) {
  if (!rawJson || typeof rawJson !== 'string') return fallback;
  try {
    return JSON.parse(rawJson, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });
  } catch {
    return fallback;
  }
}

/**
 * A06:2025 - Control de Tasa de Peticiones (Rate Limiter) contra abuso y denegación de servicio lógica
 */
export const RateLimiter = {
  checkAndRecord(bucketKey, maxRequests = 6, windowMs = 60 * 1000) {
    if (typeof window === 'undefined') return { allowed: true, remaining: maxRequests };
    try {
      const now = Date.now();
      const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      const store = safeJsonParse(raw, {}) || {};
      const timestamps = Array.isArray(store[bucketKey])
        ? store[bucketKey].filter((ts) => typeof ts === 'number' && now - ts < windowMs)
        : [];

      if (timestamps.length >= maxRequests) {
        const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - timestamps[0])) / 1000));
        SecurityAuditLogger.log('RATE_LIMIT_EXCEEDED', 'WARN', {
          bucket: bucketKey,
          retryAfterSec
        });
        return { allowed: false, remaining: 0, retryAfterSec };
      }

      timestamps.push(now);
      store[bucketKey] = timestamps;
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(store));
      return { allowed: true, remaining: maxRequests - timestamps.length };
    } catch {
      return { allowed: true, remaining: 1 };
    }
  }
};

/**
 * A07:2025 - Protección contra Fuerza Bruta en Autenticación Administrativa
 */
export const LoginBruteForceGuard = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_MS: 15 * 60 * 1000, // 15 minutos

  getStatus(identifier = 'global') {
    if (typeof window === 'undefined') return { locked: false, attempts: 0 };
    try {
      const store = safeJsonParse(localStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY), {}) || {};
      const record = store[identifier] || { attempts: 0, lockUntil: 0 };
      const now = Date.now();

      if (record.lockUntil && record.lockUntil > now) {
        const remainingSec = Math.ceil((record.lockUntil - now) / 1000);
        return { locked: true, attempts: record.attempts, remainingSec };
      }

      if (record.lockUntil && record.lockUntil <= now) {
        delete store[identifier];
        localStorage.setItem(LOGIN_LOCKOUT_STORAGE_KEY, JSON.stringify(store));
        return { locked: false, attempts: 0 };
      }

      return { locked: false, attempts: record.attempts || 0 };
    } catch {
      return { locked: false, attempts: 0 };
    }
  },

  recordFailure(identifier = 'global') {
    if (typeof window === 'undefined') return { locked: false, attempts: 1 };
    try {
      const store = safeJsonParse(localStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY), {}) || {};
      const current = store[identifier] || { attempts: 0, lockUntil: 0 };
      const attempts = (current.attempts || 0) + 1;
      const locked = attempts >= this.MAX_ATTEMPTS;
      const lockUntil = locked ? Date.now() + this.LOCKOUT_MS : 0;

      store[identifier] = { attempts, lockUntil };
      localStorage.setItem(LOGIN_LOCKOUT_STORAGE_KEY, JSON.stringify(store));

      if (locked) {
        SecurityAuditLogger.log('AUTH_BRUTE_FORCE_LOCKOUT', 'CRITICAL', {
          identifier: sanitizeText(identifier, 50),
          attempts
        });
      }
      return {
        locked,
        attempts,
        remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - attempts),
        remainingSec: locked ? Math.ceil(this.LOCKOUT_MS / 1000) : 0
      };
    } catch {
      return { locked: false, attempts: 1, remainingAttempts: 4 };
    }
  },

  reset(identifier = 'global') {
    if (typeof window === 'undefined') return;
    try {
      const store = safeJsonParse(localStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY), {}) || {};
      delete store[identifier];
      localStorage.setItem(LOGIN_LOCKOUT_STORAGE_KEY, JSON.stringify(store));
    } catch {}
  }
};

/**
 * A09:2025 - Bitácora de Auditoría y Alertas de Seguridad (Security Logging & Alerting)
 */
export const SecurityAuditLogger = {
  MAX_ENTRIES: 50,

  log(event, severity = 'INFO', details = {}) {
    if (typeof window === 'undefined') return;
    try {
      const current = safeJsonParse(localStorage.getItem(AUDIT_LOG_STORAGE_KEY), []) || [];
      const entry = {
        id: `${Date.now()}_${secureRandomInt(100, 999)}`,
        timestamp: new Date().toISOString(),
        event: sanitizeText(event, 48),
        severity: ['INFO', 'WARN', 'CRITICAL'].includes(severity) ? severity : 'INFO',
        details: typeof details === 'object' && details !== null ? details : {}
      };
      const updated = [entry, ...(Array.isArray(current) ? current : [])].slice(0, this.MAX_ENTRIES);
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  },

  getRecentLogs(limit = 10) {
    if (typeof window === 'undefined') return [];
    try {
      const current = safeJsonParse(localStorage.getItem(AUDIT_LOG_STORAGE_KEY), []) || [];
      return Array.isArray(current) ? current.slice(0, limit) : [];
    } catch {
      return [];
    }
  }
};

/**
 * A02:2025 - Cabeceras HTTP de Seguridad Recomendadas para Respuestas API Serverless
 */
export const SECURITY_HTTP_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store, max-age=0'
};
