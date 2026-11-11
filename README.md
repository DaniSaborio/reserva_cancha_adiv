# CanchaApp — Sistema Web de Gestión de Reservas e Ingresos para Cancha Sintética Comunal
**Trabajo Comunal Universitario (TCU-501A) & Proyecto Integrador III (ITI-823)**  
*Universidad Técnica Nacional (UTN) — Sede Regional San Carlos*  
*Socio Comunitario: Asociación de Desarrollo Integral de Venecia (ADI Venecia)*

---

## Descripción General
**CanchaApp** es una plataforma web progresiva (PWA) y serverless de costo operativo perpetuo **$0.00 (₡0)**, desarrollada con **Next.js 14**, **Tailwind CSS**, **Cloudflare Pages**, **Cloudflare Workers** y **Cloudflare D1 (SQLite en el Edge)** para sistematizar la calendarización, prevención atómica de colisiones de agenda y el control contable de ingresos (Efectivo vs. SINPE Móvil) del alquiler de la cancha sintética comunal de Venecia de San Carlos.

---

## Cumplimiento de Estándares para Cloudflare Free Tier (100% Gratuito)

| Componente | Tecnología Seleccionada | Configuración / Capacidad Free Tier | Costo Mensual |
| :--- | :--- | :--- | :--- |
| **Frontend / PWA** | Cloudflare Pages + Next.js 14 | `output: 'export'`, `trailingSlash: true`, ancho de banda ilimitado | **$0.00** |
| **API Serverless** | Cloudflare Workers / Pages Functions | `/functions/api/*` (100 000 peticiones diarias gratuitas en el Edge) | **$0.00** |
| **Base de Datos SQL** | Cloudflare D1 (SQLite Edge) | `/database/cancha_sintetica.sql` (5M lecturas / 100K escrituras gratis al mes) | **$0.00** |
| **Seguridad y SSL** | TLS 1.3 + JWT + WebCrypto | Certificados HTTPS automáticos y sesiones administrativas de 8 horas | **$0.00** |

---

## Mapa de Navegación y Pantallas Oficiales Implementadas (UI-01 a UI-24)

### 1. Vista Pública para Deportistas y Equipos (Sin necesidad de crear cuenta)
* **`/` — Calendario Interactivo en Tiempo Real (HU-01, HU-02):**
  * **Vista Diaria (`UI-01`):** Bloques de 1 hora de `16:00` a `23:00` (`₡16 000 / hora`) con estados en tiempo real: `Libre` (verde), `Ocupado` (rojo), `En proceso` (ámbar) y `Mantenimiento` (gris).
  * **Vista Semanal (`UI-02` — *"Tu semana de fútbol"*):** Matriz interactiva de 7 días (`L` a `D`) × 7 horas con panel táctil de selección rápida.
  * **Vista Mensual (`UI-03` — *"Elegí el día del partido"*):** Calendario mensual completo con despliegue secundario de horas libres.
* **`/reservar/` — Formulario en 2 Pasos y Prevención Atómica de Colisiones (HU-03, HU-04):**
  * **Formulario de Contacto (`UI-04`):** Solicita únicamente nombre/equipo, teléfono de 8 dígitos y método de pago previsto (`SINPE Móvil` o `Efectivo`).
  * **Manejo de Concurrencia (`UI-10` — *"Horario recién ocupado"*):** Bloqueo atómico de doble reserva (`HTTP 409 Conflict` / `UNIQUE(cancha_id, fecha_reserva, hora_inicio)`), conservando los datos del jugador y sugiriendo horarios contiguos disponibles en un toque.
* **`/confirmacion/` y `/confirmacion/[codigo]/` — Comprobante Digital (HU-05):**
  * **Variante SINPE Móvil (`UI-05`):** Código alfanumérico único (`CAN-2026-XX`), sellos de estado (`✓ Horario apartado` / `⌛ Pago pendiente`), instrucciones de transferencia indicando el código en el detalle y botón para **Compartir por WhatsApp**.
  * **Variante Pago en Efectivo (`UI-06`):** Instrucciones presenciales para liquidar en caseta antes del partido y advertencia contra cobros por personas no autorizadas.
* **`/mi-reserva/` — Buscador Autoservicio de Estado de Reserva (HU-13):**
  * **Buscador Doble Vía (`UI-07`):** Consulta sin login por código (`CAN-2026-03`) o por número de teléfono (`8911-2233`).
  * **Estado Pendiente (`UI-08` — *"Tu reserva está vigente"*)** y **Estado Confirmado (`UI-09` — *"✓ Todo listo para jugar"*)** con referencia bancaria verificada y saldo en `₡0`.

### 2. Vista Privada Administrativa (Junta Directiva, Encargado y Tesorería ADI Venecia)
* **`/admin/login/` — Autenticación Segura con JWT (HU-06):**
  * Inicio de sesión para **Carlos Pérez (Encargado)** (`admin@canchavenecia.cr`) y **Marta Soto (Tesorera)** (`tesoreria@canchavenecia.cr`) con contraseña `Venecia2026!`.
* **`/admin/dashboard/` — Resumen de Hoy y Dashboard Financiero (`UI-24`, HU-07, HU-08, HU-09):**
  * Tarjeta KPI de **Ingresos recibidos hoy** (`₡32 000`), monto **Por cobrar** (`₡16 000`), consolidado **Global / noviembre** (`₡64 000`) y desglose exacto **SINPE Móvil (`₡32 000 · 50%`)** vs. **Efectivo (`₡32 000 · 50%`)**.
  * Indicador desplegable de **Ocupación semanal (`10,2%`)** con gráfico de barras por día.
  * Buscador instantáneo y listado de **Reservas del día** con botón `Abrir ▾` para confirmar y conciliar pagos en menos de 15 segundos.
* **`/admin/reservas/` — Padrón General, Liquidación, Reprogramación y Cancelación (HU-09, HU-12):**
  * Filtros combinados por estado y método de pago, registro de comprobantes SINPE, reprogramación sin colisiones y cancelación con liberación inmediata del horario.
* **`/admin/bloqueos/` — Bloqueo de Horarios por Mantenimiento o Eventos (HU-11):**
  * Inhabilitación de franjas individuales o jornadas completas por mantenimiento de césped sintético, reparación de iluminación LED, lluvia o torneos comunales.
* **`/admin/reportes/` — Filtros por Rango de Fechas y Exportación CSV/Excel (HU-10, HU-14):**
  * Recálculo dinámico de ingresos por periodo y descarga directa de archivo `.csv` compatible con Microsoft Excel.

---

## Estructura de Base de Datos y Clases UML
* **Scripts SQL (Cloudflare D1):** Ubicados en `/database/cancha_sintetica.sql` (DDL) y `/database/seed.sql` (DML con las 5 reservas semilla oficiales `CAN-2026-01` a `CAN-2026-05`).
* **Servicios del Dominio (`src/lib/services.js`):** Implementa fielmente el Diagrama de Clases UML (`ReservaService`, `PagoService`, `AgendaManager`, `DashboardController` y `AuthMiddleware`).

---

## Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Generar compilación estática de producción (Cloudflare Pages)
npm run build

# Iniciar servidor de vista previa estática (out/)
npm start
```

---

## Autor y Créditos
* **Estudiante:** Daniel Gerardo Saborío Rodríguez — Cédula: 208560812
* **Tutor Académico:** Juan Luis Gutiérrez Chaves
* **Socio Comunitario:** Asociación de Desarrollo Integral de Venecia (ADI Venecia), San Carlos, Alajuela, Costa Rica
