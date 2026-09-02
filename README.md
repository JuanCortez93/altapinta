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
| Turnos | `mañana` y `tarde` (lunes a sábado); `domingo` turno único de media mañana. Un parte por turno. |
| Personas | Lista fija. Seed: Esequiel y Stella (encargado), Graciela (vendedor). |
| Cuentas de dinero | **Tesoro** (efectivo global), **Caja chica** (efectivo operativo, con fondo fijo), **Mercado Pago** (digital). |
| Fondo fijo | Al cierre del día queda un monto fijo en Caja chica; el resto pasa al Tesoro. |
| Arqueo Caja chica | **Uno por turno** (aísla una diferencia a mañana o tarde). |
| Mercado Pago | Sólo se usa para pagar. Por ahora no se retira plata de MP. |
| Conteo de stock | Set clave **diario** + inventario **completo** periódico. Conteo **a ciegas** por defecto (no se ve el teórico hasta cargar). |
| Costeo | Por lote, al costo real de cada compra. Consumo del lote más antiguo primero. |
| Retiros / sueldos | Egresos de la cuenta que corresponda. |
| Promociones | Se deciden según margen + antigüedad de stock. Impacto medido de forma agregada. |

---

## Circuito operativo

### Día normal (lunes a sábado)

```
Apertura       Caja chica arranca con su fondo fijo
Cierre mañana  parte de turno  → + efectivo a Caja chica, + transferencia a Mercado Pago
               arqueo Caja chica (a ciegas)  → diferencia mañana
Cierre tarde   parte de turno  → + efectivo a Caja chica, + transferencia a Mercado Pago
               arqueo Caja chica (a ciegas)  → diferencia tarde
Cierre del día barrido Caja chica → Tesoro, dejando el fondo fijo
               arqueo Mercado Pago (contra el saldo de la app)
Durante el día gastos            → egreso de Caja chica
               compras           → egreso de Tesoro o Mercado Pago
Semanal        arqueo Tesoro + inventario completo
```

Domingo: un solo turno (`domingo`), un parte, un arqueo, un barrido.

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
gap                      = venta estimada por stock − Σ partes de turno del período
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
| Turnos y dinero | `money_accounts`, `shifts`, `money_movements`, `cash_counts` |
| Conteos de stock | `stock_counts`, `stock_count_items` |
| Promociones | `promotions`, `promotion_items` |

Notas:

- **`stock_lots`** es el corazón del stock: cada ingreso (compra / producción /
  ajuste) crea un lote con `fecha_ingreso`, `costo_unitario` y `cantidad_restante`.
  Las salidas consumen el lote más antiguo primero.
- **No hay salida de stock por venta.** El vendido se infiere en la conciliación.
- Campos calculados (total de turno, saldos teóricos, diferencias, valorizaciones)
  no se guardan: se derivan en queries y reportes.
- **`shifts`** reemplaza el Google Form de "Cierre de turno". Al cerrar un parte
  se generan los `money_movements` de venta.

---

## Roadmap

| Fase | Alcance |
|---|---|
| **0 — Base** | Scaffold Next.js + Drizzle + Neon, esquema completo, seed. |
| **1 — MVP plata** | Catálogo, cuentas, parte de turno, movimientos (gastos / retiros / depósito a tesoro), arqueo de Caja chica por turno, dashboard del día. |
| **2 — Stock** | Compras por lote (kg + fecha + precio), salidas registradas, checklist diario a ciegas, inventario completo por zona, reporte de antigüedad. |
| **3 — Conciliación + producción** | Conciliación venta vs stock, recetas y órdenes de producción, margen por producto. |
| **4 — Promos + 2ª sucursal** | Promociones + panel de candidatos, alta de la segunda sucursal. |

---

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Drizzle ORM** + **Neon** (PostgreSQL serverless)
- Deploy en **Vercel**

## Puesta en marcha

```bash
npm install
cp .env.example .env.local        # y pegá la connection string de Neon
npm run db:generate               # genera la migración desde el esquema
npm run db:migrate                # la aplica en Neon
npm run db:seed                   # carga sucursal, usuarios, cuentas, categorías
npm run dev
```

Comandos de base de datos:

| Comando | Qué hace |
|---|---|
| `npm run db:generate` | Genera archivos de migración SQL desde `schema.ts`. |
| `npm run db:migrate` | Aplica las migraciones pendientes. |
| `npm run db:push` | Empuja el esquema directo a la DB (útil en desarrollo temprano). |
| `npm run db:studio` | Abre Drizzle Studio para ver / editar datos. |
| `npm run db:seed` | Carga los datos iniciales (idempotente). |
