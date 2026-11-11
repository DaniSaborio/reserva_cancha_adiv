# CanchaApp — Sistema Web de Gestión de Reservas e Ingresos para Cancha Sintética Comunal
**Trabajo Comunal Universitario (TCU-501A) & Proyecto Integrador III (ITI-823)**  
*Universidad Técnica Nacional (UTN) — Sede Regional San Carlos*  
*Socio Comunitario: Asociación de Desarrollo Integral de Venecia (ADI Venecia)*

---

## Descripción General
**CanchaApp** es una plataforma web progresiva (PWA) y serverless de costo operativo perpetuo **$0.00 (₡0)**, desarrollada con **Next.js 14**, **Tailwind CSS**, **Cloudflare Pages**, **Cloudflare Workers** y **Cloudflare D1 (SQLite en el Edge)** —blindada bajo el estándar **OWASP Top 10:2025**— para sistematizar la calendarización, prevención atómica de colisiones de agenda y el control contable de ingresos (Efectivo vs. SINPE Móvil) del alquiler de la cancha sintética comunal de Venecia de San Carlos.

---

## Cumplimiento de Estándares para Cloudflare Free Tier (100% Gratuito)

| Componente | Tecnología Seleccionada | Configuración / Capacidad Free Tier | Costo Mensual |
| :--- | :--- | :--- | :--- |
| **Frontend / PWA** | Cloudflare Pages + Next.js 14 | `output: 'export'`, `trailingSlash: true`, ancho de banda ilimitado | **$0.00** |
| **API Serverless** | Cloudflare Workers / Pages Functions | `/functions/api/*` (100 000 peticiones diarias gratuitas en el Edge) | **$0.00** |
| **Base de Datos SQL** | Cloudflare D1 (SQLite Edge) | `/database/cancha_sintetica.sql` (5M lecturas / 100K escrituras gratis al mes) | **$0.00** |
| **Seguridad y SSL** | TLS 1.3 + JWT + OWASP Top 10:2025 | Cabeceras CSP/HSTS, CSPRNG, Anti-Brute Force y sesiones de 8 horas | **$0.00** |

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
  * **Buscador Doble Vía (`UI-07`):** Consulta sin login por código (`CAN-2026-03`) o por número de teléfono exacto de 8 dígitos (`8911-2233`).
  * **Estado Pendiente (`UI-08` — *"Tu reserva está vigente"*)** y **Estado Confirmado (`UI-09` — *"✓ Todo listo para jugar"*)** con referencia bancaria verificada y saldo en `₡0`.

### 2. Vista Privada Administrativa (Junta Directiva, Encargado y Tesorería ADI Venecia)
* **`/admin/login/` — Autenticación Segura con JWT y Protección Anti-Fuerza Bruta (HU-06):**
  * Inicio de sesión para **Carlos Pérez (Encargado)** (`admin@canchavenecia.cr`) y **Marta Soto (Tesorera)** (`tesoreria@canchavenecia.cr`) con contraseña `Venecia2026!`.
* **`/admin/dashboard/` — Resumen de Hoy, Dashboard Financiero y Bitácora OWASP (`UI-24`, HU-07, HU-08, HU-09):**
  * Tarjeta KPI de **Ingresos recibidos hoy** (`₡32 000`), monto **Por cobrar** (`₡16 000`), consolidado **Global / noviembre** (`₡64 000`) y desglose exacto **SINPE Móvil (`₡32 000 · 50%`)** vs. **Efectivo (`₡32 000 · 50%`)**.
  * Indicador desplegable de **Ocupación semanal (`10,2%`)** con gráfico de barras por día.
  * Buscador instantáneo y listado de **Reservas del día** con botón `Abrir ▾` para confirmar y conciliar pagos en menos de 15 segundos.
  * Panel desplegable de **Blindaje y Bitácora OWASP Top 10:2025** en tiempo real.
* **`/admin/reservas/` — Padrón General, Liquidación, Reprogramación y Cancelación (HU-09, HU-12):**
  * Filtros combinados por estado y método de pago, registro de comprobantes SINPE, reprogramación sin colisiones y cancelación con liberación inmediata del horario.
* **`/admin/bloqueos/` — Bloqueo de Horarios por Mantenimiento o Eventos (HU-11):**
  * Inhabilitación de franjas individuales o jornadas completas por mantenimiento de césped sintético, reparación de iluminación LED, lluvia o torneos comunales.
* **`/admin/reportes/` — Filtros por Rango de Fechas y Exportación CSV/Excel Segura (HU-10, HU-14):**
  * Recálculo dinámico de ingresos por periodo (Día, Semana o Mes) y descarga directa de archivo `.csv` blindado contra inyección de fórmulas y compatible con Microsoft Excel.

---

## Estructura de Base de Datos, Clases UML y Seguridad
* **Scripts SQL (Cloudflare D1):** Ubicados en `/database/cancha_sintetica.sql` (DDL) y `/database/seed.sql` (DML con las 5 reservas semilla oficiales `CAN-2026-01` a `CAN-2026-05`).
* **Servicios del Dominio (`src/lib/services.js`):** Implementa fielmente el Diagrama de Clases UML (`ReservaService`, `PagoService`, `AgendaManager`, `DashboardController` y `AuthMiddleware`).
* **Módulo de Seguridad (`src/lib/security.js` y `public/_headers`):** Implementa los 10 controles del estándar **OWASP Top 10:2025** (`A01:2025` a `A10:2025`).

---

## Balance General del Proyecto: Aciertos en Cambios Realizados y Cosas por Hacer

A continuación se documentan los **aciertos logrados** en las mejoras e implementaciones realizadas y la **lista de tareas pendientes (hoja de ruta)** tanto para **CanchaApp (App de Reservas)** como para el proyecto hermano **Portal Informativo para Personas Migrantes**.

### 1. App de Reserva de Canchas (`CanchaApp` — ADI Venecia)

#### ✅ Aciertos en Cambios Realizados
1. **Arquitectura Serverless 100% Gratuita (Cloudflare Free Tier):**
   * Construcción integral en **Next.js 14** (`output: 'export'`, `trailingSlash: true`) y **Tailwind CSS**, combinada con **Cloudflare Workers** (`/functions/api/*`) y base de datos **Cloudflare D1 (SQLite Edge)** (`/database/cancha_sintetica.sql`), garantizando costo operativo **$0.00/mes** para la ADI Venecia.
2. **Prevención Atómica de Colisiones y Flujo Ágil en 3 Pasos:**
   * Restricción transaccional `UNIQUE(cancha_id, fecha_reserva, hora_inicio)` e intercepción de choques de horario (`HTTP 409 Conflict`), sugiriendo horarios contiguos disponibles sin borrar los datos ingresados por el deportista.
   * Comprobante digital (`CAN-2026-XX`) adaptado a **SINPE Móvil** y **Efectivo en caseta** con envío directo a **WhatsApp** y consulta autoservicio sin cuenta (`/mi-reserva/`).
3. **Blindaje Integral bajo OWASP Top 10:2025 + Controles Básicos (`src/lib/security.js`):**
   * **A01:2025 Broken Access Control:** Protección RBAC obligatoria en todas las páginas administrativas (`/admin/dashboard`, `/admin/reservas`, `/admin/bloqueos`, `/admin/reportes`), verificación de token Bearer JWT en los Workers, prevención **Anti-IDOR** en consultas por teléfono (exigiendo los 8 dígitos completos) y protección **Anti-Path Traversal** en `preview.js`.
   * **A02:2025 Security Misconfiguration:** Configuración de cabeceras de seguridad HTTP (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`) en `public/_headers`, `preview.js` y respuestas API; eliminación de scripts inline (`dangerouslySetInnerHTML`) en `layout.jsx`.
   * **A03:2025 Software Supply Chain Failures:** Aislamiento del Service Worker (`public/sw.js` v2) para cachear solo recursos `GET` estáticos `Same-Origin`, excluyendo `/admin/*` y `/api/*` del caché compartido, y sincronización de `package-lock.json`.
   * **A04:2025 Cryptographic Failures:** Generación criptográficamente segura (`CSPRNG` vía `crypto.getRandomValues`) para códigos de reserva e IDs en lugar de `Math.random()`, comparación de contraseñas en tiempo constante (`timingSafeEqualStr`) y firma de integridad de sesión JWT (`computeIntegritySignature`).
   * **A05:2025 Injection:** Sanitización de entradas contra XSS/HTML (`sanitizeText`, `sanitizeComprobante`), consultas SQL parametrizadas (`.prepare().bind()`) en Cloudflare D1 y protección contra **CSV Formula Injection (CWE-1236)** con `sanitizeCSVCell` al exportar reportes contables.
   * **A06:2025 Insecure Design:** Control de tasa de peticiones (`RateLimiter` — máximo 6 reservas/minuto con respuesta `HTTP 429`) e inmutabilidad de reglas de negocio en servidor (tarifa oficial fija de `₡16 000` y horarios oficiales `16:00`–`22:00`).
   * **A07:2025 Authentication Failures:** Guardia contra fuerza bruta (`LoginBruteForceGuard`) con bloqueo automático por 15 minutos tras 5 intentos fallidos y expiración estricta de sesión JWT (8 horas).
   * **A08:2025 Software or Data Integrity Failures:** Deserialización JSON segura (`safeJsonParse`) que filtra claves peligrosas (`__proto__`, `constructor`, `prototype`) contra *Prototype Pollution*.
   * **A09:2025 Security Logging and Alerting Failures:** Bitácora de auditoría (`SecurityAuditLogger`) integrada visualmente en el Dashboard Administrativo para auditar accesos, bloqueos de seguridad, cobros, cancelaciones y exportaciones CSV.
   * **A10:2025 Mishandling of Exceptional Conditions:** Enfoque *Fail-Closed* ante sesiones adulteradas, URIs malformadas o errores de red sin exponer trazas internas del servidor.
4. **Centrado Visual y Mejoras de Interfaz (UI/UX):**
   * Centrado armónico de las pestañas selectoras de calendario (**Día**, **Semana** y **Mes**) con roles de accesibilidad (`role="tablist"`, `role="tab"`, `aria-selected`), encabezados dinámicos, barra de progreso en 3 pasos, navegadores de fechas, leyenda de estados en tiempo real, navegación administrativa (`AdminNav`) y filtros rápidos de periodo en reportes.

#### 📌 Cosas por Hacer en CanchaApp (Backlog / Mejoras Futuras)
- [ ] **Vinculación del Binding Cloudflare D1 en Producción y Secretos Cifrados:** Conectar la base de datos D1 real en la cuenta de Cloudflare de la ADI Venecia (`wrangler d1 create cancha-venecia-db`) y mover credenciales administrativas y la llave `JWT_SECRET` a secretos de entorno (`wrangler secret put`) usando hashes de contraseñas (`PBKDF2` / `Argon2`).
- [ ] **Adjunto Opcional de Comprobante SINPE en Cloudflare R2:** Permitir subir opcionalmente la captura del comprobante SINPE Móvil a un bucket **Cloudflare R2** (10 GB gratuitos en Free Tier) para respaldar visualmente la conciliación de Tesorería.
- [ ] **Expiración Automática de Reservas "En Proceso" sin Pago (Cron Trigger):** Implementar un *Cron Trigger* en Cloudflare Workers que libere automáticamente los horarios apartados por SINPE Móvil cuyo pago no se haya verificado tras el tiempo límite establecido por la Junta Directiva.
- [ ] **Notificaciones Automatizadas al Jugador:** Integrar notificaciones Web Push (PWA) o disparo de mensajes de confirmación hacia WhatsApp cuando el administrador aprueba el comprobante de pago.
- [ ] **Reservas Recurrentes, Torneos Comunales y Tarifas Diferenciadas:** Añadir soporte para reservas fijas semanales/mensuales, módulo de gestión de campeonatos locales y configuración desde panel para tarifa diurna vs. nocturna (iluminación LED).
- [ ] **Suite de Pruebas Automatizadas End-to-End (E2E):** Configurar pruebas automatizadas con Playwright o Vitest en GitHub Actions para verificar en cada commit la reserva sin colisiones, los bloqueos administrativos y las reglas OWASP.

---

### 2. Portal Informativo para Personas Migrantes (`portal-informacion-migrante`)

#### ✅ Aciertos en Cambios Realizados
1. **Migración a Next.js 14 con Tailwind CSS y Exportación Estática (Cloudflare Pages Free Tier):**
   * Evolución desde una estructura HTML/JS tradicional hacia **Next.js 14 App Router** (`output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`), pre-renderizando las 13 rutas estáticas en `out/` con costo de alojamiento **$0.00**.
2. **Privacidad por Diseño (Arquitectura Local-First / Zero-Knowledge):**
   * Ausencia total de bases de datos remotas o rastreo de usuarios. El avance en el checklist de requisitos documentales y las preferencias visuales se guardan 100% en el navegador local (`window.localStorage`).
3. **Introducción Comunal y Asistente Interactivo de Diagnóstico (`OrientadorFormulario.jsx`):**
   * Incorporación de una bienvenida contextualizada para **Venecia de San Carlos y la Región Huetar Norte**, junto con un cuestionario interactivo paso a paso que diagnostica el caso migratorio de la persona usuaria y la dirige al trámite y sede de ayuda correspondientes.
4. **Migración Completa de Emojis a Iconografía Vectorial (`react-icons`):**
   * Reemplazo de todos los emojis por iconos vectoriales estandarizados de **FontAwesome 6 (`react-icons/fa6`)** y **Material Design (`react-icons/md`)** en las 14 vistas y componentes (`Header`, `BottomNav`, `OrientadorFormulario`, `GuiaDetailClient`, `guias`, `requisitos`, `directorio`, `emergencias`), asegurando nitidez y uniformidad en cualquier dispositivo móvil.
5. **Servidor Estático Local Resiliente (`preview.js`) y Limpieza de Artefactos Git:**
   * Creación de `preview.js` para `npm start` y `npm run preview` con detección automática de puerto ocupado (`EADDRINUSE`) y salto automático al siguiente puerto libre, además de excluir `.next/` y `out/` del repositorio mediante `.gitignore`.
6. **Soporte Offline (PWA) y Accesibilidad Inclusiva:**
   * Service Worker (`public/sw.js`) para consulta sin conexión a internet en zonas rurales o fincas agrícolas, junto con barra de accesibilidad para alto contraste bajo luz solar y aumento de tamaño tipográfico (`A+`).

#### 📌 Cosas por Hacer en el Portal Migrante (Backlog / Mejoras Futuras)
- [ ] **Internacionalización y Soporte Multilenguaje (i18n):** Traducir las guías, el orientador interactivo y el directorio a **Inglés, Francés y Criollo Haitiano (Kreyòl Ayisyen)** para atender a poblaciones migrantes no hispanohablantes en tránsito por la Zona Norte.
- [ ] **Guías con Lectura por Voz (Text-to-Speech / Audio Offline):** Integrar síntesis de voz nativa (`Web Speech API` o cápsulas de audio offline) en cada guía y requisito del checklist para apoyar a personas con baja escolaridad, barreras de lectura o discapacidad visual.
- [ ] **Generación Nativa de Checklist en PDF Descargable Offline:** Permitir descargar directamente en el teléfono un archivo PDF con los requisitos marcados y los datos de la sede correspondiente sin depender únicamente de `window.print()`.
- [ ] **Homologación del Blindaje OWASP Top 10:2025:** Incorporar el archivo `public/_headers` (con políticas `CSP`, `HSTS`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`), deserialización segura (`safeJsonParse`) y protección Anti-Path Traversal en `preview.js`, homologando los controles aplicados en `CanchaApp`.
- [ ] **Mapa Offline y Rutas de Transporte Público en la Región Huetar Norte:** Añadir croquis offline de ubicación de sedes en Venecia, Aguas Zarcas, Ciudad Quesada, Upala y Los Chiles con referencias de paradas de autobús y tiempos de traslado.
- [ ] **Actualización Automatizada de Tipo de Cambio BCCR y Aranceles:** Incorporar actualización periódica de los montos en colones (₡) según el tipo de cambio oficial del Banco Central de Costa Rica y nuevas resoluciones de la DGME/CCSS.

---

## Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Generar compilación estática de producción (Cloudflare Pages)
npm run build

# Iniciar servidor de vista previa estática con cabeceras OWASP (out/)
npm start
```

---

## Autor y Créditos
* **Estudiante:** Daniel Gerardo Saborío Rodríguez — Cédula: 208560812
* **Tutor Académico:** Juan Luis Gutiérrez Chaves
* **Socio Comunitario:** Asociación de Desarrollo Integral de Venecia (ADI Venecia), San Carlos, Alajuela, Costa Rica
