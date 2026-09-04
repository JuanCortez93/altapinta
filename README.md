# Alta Pinta — Sistema de gestión

Sistema de **control y conciliación** para la pollería Alta Pinta.

> No es un punto de venta. Nadie carga ventas ítem por ítem. Cada turno declara
> el **total vendido** (efectivo y transferencia) y el sistema verifica dos cosas
> al cierre:
>
> 1. **Dinero** — la plata que hay (Caja chica + Mercado Pago + Tesoro) coincide
>    con lo declarado menos lo gastado.
> 2. **Venta vs stock** — lo declarado como venta se condice con la mercadería
>    que efectivamente salió del stock (medido por conteo físico).

Vende pollo, pescado, rebozados de pollo y pescado, y milanesas de soja. Produce
hamburguesas y albóndigas de pollo.

---

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Facturación ARCA / tickets | **Fuera de alcance** por ahora. No se registran ventas individuales. |
| Sucursales | 1 hoy (**Alta Pinta**). El modelo ya es multisucursal para el futuro. |
| Balanza | Sin integración. El peso se carga a mano. |
| Stock | Global por producto, pero con **lotes fechados** (fecha de ingreso + costo real) para rotar lo más viejo primero (FEFO). |
| Cierre | **Uno por día** (no por turno). Ventas brutas + gastos del día + arqueo. |
| Personas | Lista fija. Seed: Esequiel y Stella (encargado), Graciela (vendedor). |
| Cuentas de dinero | **Tesoro** (efectivo, la caja del lugar), **Caja chica** (efectivo operativo), **Reserva** (adonde van las transferencias del día; se mueve según rinde el banco). Sin cuenta de provisión de sueldos. |
| Gastos | Se cargan en **cualquier momento** del día (Envíos, Uber, Proveedor, Retiro, Otros) y quedan enganchados al cierre. "Otros" exige descripción. |
| Arqueo Caja chica | Uno por día, con conteo físico y diferencia. |
| Puesta en marcha | **Tabula rasa**: no se importa histórico. El día que arranca el uso real se carga el saldo que hay en ese momento en cada cuenta (`/inicio`, movimiento `fondo_inicial`) y de ahí en más todo sale de la app. |
| Conteo de stock | Set clave **diario** + inventario **completo** periódico. Conteo **a ciegas** por defecto (no se ve el teórico hasta cargar). *(Fase 2, no construido aún.)* |
| Costeo | Por lote, al costo real de cada compra. Consumo del lote más antiguo primero. *(Fase 2.)* |
| Promociones | Se deciden según margen + antigüedad de stock. Impacto medido de forma agregada. *(Fase 4.)* |

---

## Circuito operativo

### Día normal

```
Durante el día  se cargan gastos apenas ocurren (Envíos, Uber, Proveedor,
                Retiro, Otros) → egreso de Caja chica o Tesoro
Cierre del día  dinero en cash + dinero en transferencias (venta bruta)
                → + efectivo a Caja chica, + transferencia a Reserva
                gastos del día ya cargados se enganchan al cierre
                arqueo de Caja chica (a ciegas) → diferencia
                barrido Caja chica → Tesoro
                arqueo de Reserva (opcional, contra el saldo real)
Semanal         arqueo Tesoro + inventario completo (Fase 2)
```

### Las dos conciliaciones

**Dinero — por cuenta y período**

```
saldo teórico = saldo inicial + Σ ingresos − Σ egresos ± transferencias
diferencia    = saldo contado (arqueo / homebanking) − saldo teórico
```

**Venta vs stock — entre dos conteos del mismo tipo**

```
salida estimada = stock del conteo previo
                + ingresos del período (compras + producción)
                − stock del conteo actual
                − salidas registradas (merma, autoconsumo, ...)

venta estimada por stock = salida estimada valorizada a precio de venta
gap                      = venta estimada por stock − Σ cierres del período
```

Un `gap` grande ⇒ venta no declarada, merma no registrada, error de conteo o
precios desactualizados.

---

## Modelo de datos

Definido en [`src/db/schema.ts`](src/db/schema.ts) (Drizzle + PostgreSQL).

| Grupo | Tablas |
|---|---|
| Base / config | `branches`, `users`, `settings` |
| Catálogo | `product_categories`, `products`, `price_history` |
| Compras y stock | `suppliers`, `purchases`, `purchase_items`, `stock_lots`, `stock_exits` |
| Producción | `recipes`, `recipe_items`, `production_orders` |
| Dinero | `money_accounts`, `daily_closes`, `money_movements`, `cash_counts` |
| Conteos de stock | `stock_counts`, `stock_count_items` |
| Promociones | `promotions`, `promotion_items` |

Notas:

- **Cuentas:** sólo tres — **Tesoro** (efectivo, la caja del lugar), **Caja chica**
  (efectivo operativo del día) y **Reserva** (adonde van las transferencias del día).
- **`daily_closes`**: un registro por fecha. Se cargan las ventas brutas (efectivo
  y transferencia) y el arqueo de la caja. Los gastos se cargan durante el día
  como `money_movements` y al cerrar se les asigna el `cierre_id`.
- Salidas del día: `envios` / `uber` / `otros` → `money_movements` categoría
  `gasto`; `proveedor` → `compra`; `retiro` → `retiro`. No hay provisión de
  sueldos como cuenta aparte.
- **`stock_lots`** es el corazón del stock: cada ingreso crea un lote con
  `fecha_ingreso` y `costo_unitario`; las salidas consumen el más viejo primero.
- **No hay salida de stock por venta.** El vendido se infiere en la conciliación.
- Campos calculados (saldos teóricos, valorizaciones) no se guardan: se derivan.

---

## Roadmap

| Fase | Alcance |
|---|---|
| **0 — Base** ✅ | Scaffold Next.js + Drizzle + Supabase, esquema completo, seed. |
| **1 — MVP plata** 🚧 | Login con contraseña compartida · **Cargar gasto** (en cualquier momento, categorías con íconos: Envíos, Uber, Proveedor, Retiro, Otros) · **Cierre del día** (ventas brutas efectivo/transferencia, gastos del día enganchados, arqueo de Caja chica, barrido al Tesoro, arqueo de Reserva) · **Hoy** (dashboard) · **Cierres** (historial) · **Métricas** (venta por día, promedio por día de semana, gasto por categoría) · **Cuentas** (saldos + movimientos). |
| **2 — Stock** | Compras por lote (kg + fecha + precio), salidas registradas, checklist diario a ciegas, inventario completo por zona, reporte de antigüedad. |
| **3 — Conciliación + producción** | Conciliación venta vs stock, recetas y órdenes de producción, margen por producto. |
| **4 — Promos + 2ª sucursal** | Promociones + panel de candidatos, alta de la segunda sucursal. |

---

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** con tokens de diseño en OKLCH (ver [DESIGN.md](DESIGN.md))
- **Drizzle ORM** + **Supabase** (PostgreSQL) — driver `postgres` (postgres.js)
- Deploy en **Vercel**

### Logo

El logo real va en `public/logo.png` (arrastralo ahí). Mientras no esté, la app
dibuja un emblema con los colores de marca. Para el ícono en el teléfono,
agregá `src/app/icon.png` (512×512).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local        # pegá las connection strings de Supabase (botón "Connect")
npm run db:migrate                # aplica la migración inicial (usa DIRECT_URL)
npm run db:seed                   # carga sucursal, usuarios, cuentas, categorías
npm run dev
```

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** (6543). La usa la app. |
| `DIRECT_URL` | Supabase **session pooler** (5432). La usan migraciones y seed. |
| `AUTH_SECRET` | Firma la cookie de sesión. `openssl rand -base64 32`. |
| `APP_PASSWORD` | Contraseña única para entrar a la app (v1). |

En Vercel hay que cargar las cuatro en las Environment Variables del proyecto.

Comandos de base de datos:

| Comando | Qué hace |
|---|---|
| `npm run db:generate` | Genera archivos de migración SQL desde `schema.ts`. |
| `npm run db:migrate` | Aplica las migraciones pendientes. |
| `npm run db:push` | Empuja el esquema directo a la DB (útil en desarrollo temprano). |
| `npm run db:studio` | Abre Drizzle Studio para ver / editar datos. |
| `npm run db:seed` | Carga los datos iniciales (idempotente). |

> `drizzle/0002_daily_close.sql` está escrita a mano (drizzle-kit `generate`
> necesita una terminal interactiva para resolver el renombre `shifts` →
> `daily_closes`). `drizzle/meta/0002_snapshot.json` es un placeholder; antes del
> próximo `db:generate` hay que regenerar el snapshot corriendo `drizzle-kit`
> en una terminal real.
