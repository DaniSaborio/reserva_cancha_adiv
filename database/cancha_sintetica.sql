-- =============================================================================
-- UNIVERSIDAD TÉCNICA NACIONAL (UTN) — SEDE REGIONAL SAN CARLOS
-- TCU-501A & ITI-823 (Proyecto Integrador III)
-- Socio Comunitario: Asociación de Desarrollo Integral de Venecia (ADI Venecia)
-- Archivo: database/cancha_sintetica.sql
-- Motor: Cloudflare D1 (SQLite Serverless en el Edge — Costo Operativo $0.00)
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. Tabla de Canchas Comunales
CREATE TABLE IF NOT EXISTS canchas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tarifa_diurna REAL NOT NULL DEFAULT 14000.00,
  tarifa_nocturna REAL NOT NULL DEFAULT 16000.00,
  estado TEXT NOT NULL DEFAULT 'activa' CHECK(estado IN ('activa', 'mantenimiento', 'inactiva')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios Administrativos (Directiva / Encargado / Tesorería ADI Venecia)
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'Administrador' CHECK(rol IN ('Administrador', 'Tesorero')),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Reservas de la Cancha Sintética
-- Incluye restricción atómica UNIQUE(cancha_id, fecha_reserva, hora_inicio) anti-colisión
CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_reserva TEXT NOT NULL UNIQUE,
  cancha_id INTEGER NOT NULL DEFAULT 1 REFERENCES canchas(id),
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  fecha_reserva TEXT NOT NULL, -- Formato ISO YYYY-MM-DD
  hora_inicio TEXT NOT NULL,   -- Formato HH:MM (16:00 a 22:00)
  hora_fin TEXT NOT NULL,      -- Formato HH:MM (17:00 a 23:00)
  metodo_pago_previsto TEXT NOT NULL DEFAULT 'SINPE Móvil' CHECK(metodo_pago_previsto IN ('Efectivo', 'SINPE Móvil')),
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK(estado IN ('Pendiente', 'Confirmada', 'Cancelada')),
  monto_total REAL NOT NULL DEFAULT 16000.00,
  motivo_cancelacion TEXT,
  notas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cancha_id, fecha_reserva, hora_inicio)
);

-- 4. Tabla de Pagos y Conciliación Financiera (Efectivo vs. SINPE Móvil)
CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  metodo_pago TEXT NOT NULL CHECK(metodo_pago IN ('Efectivo', 'SINPE Móvil')),
  monto REAL NOT NULL,
  numero_comprobante TEXT,
  registrado_por TEXT DEFAULT 'Carlos Pérez (Encargado)',
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Bloqueos de Horario (Mantenimiento, Torneos Comunales o Clima)
CREATE TABLE IF NOT EXISTS bloqueos_horario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cancha_id INTEGER NOT NULL DEFAULT 1 REFERENCES canchas(id),
  fecha TEXT NOT NULL,       -- Formato YYYY-MM-DD
  hora_inicio TEXT NOT NULL, -- Formato HH:MM
  hora_fin TEXT NOT NULL,    -- Formato HH:MM
  motivo TEXT NOT NULL,      -- Ej. 'Mantenimiento césped', 'Torneo comunal', 'Reparación de iluminación'
  usuario_id INTEGER REFERENCES usuarios_admin(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cancha_id, fecha, hora_inicio)
);

-- Índices de optimización para consultas sub-10ms en Cloudflare Edge
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha_reserva, estado);
CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_telefono ON reservas(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_pagos_reserva ON pagos(reserva_id, metodo_pago);
CREATE INDEX IF NOT EXISTS idx_bloqueos_fecha ON bloqueos_horario(fecha);
