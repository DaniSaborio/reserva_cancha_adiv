-- =============================================================================
-- DATOS SEMILLA OFICIALES (DML - Seed Data)
-- Sistema de Gestión de Reservas para Cancha Comunal — ADI Venecia
-- =============================================================================

-- 1. Cancha Sintética Comunal de Venecia
INSERT OR IGNORE INTO canchas (id, nombre, tarifa_diurna, tarifa_nocturna, estado) VALUES
  (1, 'Cancha Sintética Comunal — ADI Venecia', 16000.00, 16000.00, 'activa');

-- 2. Usuarios Administrativos Oficiales (Sección 10.2 del Documento Técnico)
INSERT OR IGNORE INTO usuarios_admin (id, username, nombre, email, password_hash, rol, activo) VALUES
  (1, 'admin', 'Carlos Pérez (Encargado)', 'admin@canchavenecia.cr', 'pbkdf2_sha256$100000$venecia2026$8f9d2a1b4c3e5f6a7b8c9d0e1f2a3b4c', 'Administrador', 1),
  (2, 'tesoreria', 'Marta Soto (Tesorera)', 'tesoreria@canchavenecia.cr', 'pbkdf2_sha256$100000$venecia2026$7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b', 'Tesorero', 1);

-- 3. Reservas Semilla Oficiales (Viernes 06/11/2026 y Sábado 07/11/2026)
INSERT OR IGNORE INTO reservas (id, codigo_reserva, cancha_id, cliente_nombre, cliente_telefono, fecha_reserva, hora_inicio, hora_fin, metodo_pago_previsto, estado, monto_total) VALUES
  (1, 'CAN-2026-01', 1, 'Mario Solís Alvarado', '8888-1122', '2026-11-06', '18:00', '19:00', 'SINPE Móvil', 'Confirmada', 16000.00),
  (2, 'CAN-2026-02', 1, 'Equipo Los Amigos FC', '8755-4433', '2026-11-06', '19:00', '20:00', 'Efectivo', 'Confirmada', 16000.00),
  (3, 'CAN-2026-03', 1, 'Carlos Murillo Castro', '8911-2233', '2026-11-06', '20:00', '21:00', 'SINPE Móvil', 'Pendiente', 16000.00),
  (4, 'CAN-2026-04', 1, 'Deportivo La Palmera', '8344-5566', '2026-11-07', '17:00', '18:00', 'SINPE Móvil', 'Confirmada', 16000.00),
  (5, 'CAN-2026-05', 1, 'Asociación Veteranos', '8822-9900', '2026-11-07', '18:00', '19:00', 'Efectivo', 'Confirmada', 16000.00);

-- 4. Pagos Conciliados Semilla (Sección 10.2: ₡32,000 SINPE + ₡32,000 Efectivo = ₡64,000)
INSERT OR IGNORE INTO pagos (id, reserva_id, metodo_pago, monto, numero_comprobante, fecha_pago) VALUES
  (1, 1, 'SINPE Móvil', 16000.00, 'SINPE-98421', '2026-11-06 16:40:00'),
  (2, 2, 'Efectivo', 16000.00, NULL, '2026-11-06 18:50:00'),
  (3, 4, 'SINPE Móvil', 16000.00, 'SINPE-77123', '2026-11-07 15:20:00'),
  (4, 5, 'Efectivo', 16000.00, NULL, '2026-11-07 17:55:00');
