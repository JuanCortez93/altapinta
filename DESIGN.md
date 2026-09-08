# DESIGN.md — Alta Pinta

Sistema de diseño de la app. Registro **product**: familiaridad ganada, la
herramienta desaparece detrás de la tarea. Mobile primero.

## Color

Estrategia: **Restrained**. Neutros tintados hacia el azul de marca. El azul es
el acento funcional (botones primarios, nav activa, foco, links). El dorado se
reserva para identidad (login, primer arranque, logo). Verde / rojo / ámbar son
estado, no marca.

Paleta calibrada contra el logo: `--accent` es el azul de las olas
(`oklch(0.53 0.158 250)`), `--gold` es el aro (`oklch(0.78 0.142 74)`).
`--on-gold` es un marrón oscuro para texto sobre dorado.

Tokens en [`src/app/globals.css`](src/app/globals.css), en OKLCH, con tema claro
y oscuro (por `prefers-color-scheme`). Se usan como utilidades de Tailwind v4:

| Rol | Utilidad | Uso |
|---|---|---|
| Fondo de página | `bg-canvas` | body, inputs |
| Superficie | `bg-surface` | tarjetas, tablas |
| Superficie 2 | `bg-surface-2` | header, chips inertes, mini-stats |
| Texto | `text-ink` | principal |
| Texto atenuado | `text-muted` | labels, secundario |
| Texto sutil | `text-subtle` | metadatos, placeholders |
| Líneas | `border-line`, `border-line-strong` | bordes, divisores |
| Acento | `bg-accent` `text-accent` `bg-accent-weak` `text-on-accent` | acción primaria, selección, foco |
| Identidad | `text-gold` / `--gold` | login, logo |
| Positivo | `text-pos` `bg-pos-weak` | cuadra, ingreso, turno cargado |
| Negativo | `text-neg` `bg-neg-weak` | falta, egreso, alertas |
| Atención | `text-warn` `bg-warn-weak` | avisos (ya hay cierre, etc.) |

Nunca `#000` / `#fff`, ni `zinc-*` / `emerald-*` / `red-*` directos: usar tokens.

## Tipografía

Una familia: **Geist Sans** (`--font-sans`), fallback `system-ui`. Escala rem
fija, ratio ~1.2. Títulos de página `text-2xl font-semibold tracking-tight`.
Los montos de plata llevan `.tnum` (cifras tabulares) para que se alineen en
columna.

## Layout

Header fijo: lockup (logo + "Alta Pinta") a la izquierda, "Salir" a la derecha,
nav debajo con subrayado de acento en la activa. Contenido en `max-w-3xl`,
`px-4`. Secciones agrupadas con `.card` (ver Componentes).

## Componentes

- **Tarjeta**: clase `.card` (superficie + hairline `--line` + `--shadow-sm`).
  Sólo para pasos distintos de una tarea; se varía la densidad interna. Nada de
  tarjetas anidadas ni grillas idénticas. Los tiles chicos (saldos, mini-stats)
  van planos, sin sombra, para diferenciar jerarquía.
- **Botones**: clases `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-ghost` /
  `.btn-gold` (en `@layer components` de globals.css). El tamaño (`h-*`,
  `text-*`, `w-*`, `flex-*`) se pasa por utilidades aparte. Todos llevan un
  **borde fino que reacciona**: en reposo casi no se ve, en `hover` se aviva
  hacia el acento (o se abre el rim claro en el primario/dorado), en `active`
  baja 1px y hunde una sombra interna, en `focus-visible` el anillo `--ring`.
  `btn-gold` es sólo para identidad (login "Entrar", banner de arranque).
- **Inputs**: `h-11`, `border-line`, foco `border-accent`. Numéricos con
  `inputMode="decimal"`.
- **Segmentado / toggles** (método efectivo/transferencia, tipo venta/gasto):
  borde `--line` en reposo, `hover` a `--line-strong`, activo con borde de
  acento + `bg-accent-weak`; `active:translate-y-px`.
- **Íconos de acción** (editar/borrar): borde transparente que aparece tenue en
  hover, con tinte de acento o negativo.

## Motion

140 ms, easing `--ease` (`cubic-bezier(0.2, 0.9, 0.25, 1)`, ease-out, sin
rebote). Sólo `color` / `background-color` / `border-color` / `box-shadow` /
`transform` (translate 1px en `active`). Sin animar layout, sin secuencias de
entrada. `prefers-reduced-motion` anula todo en globals.css.

## Marca / assets

- `public/logo.jpg` — logo real (pollo + pescado). Se muestra recortado en
  círculo (`rounded-full object-cover`), lo que tapa las esquinas negras del
  jpg. Si falta, `LogoMark`
  ([`src/components/brand.tsx`](src/components/brand.tsx)) dibuja un emblema
  SVG con los colores de marca.
- `public/logo.svg` — emblema para el favicon.
- Para el ícono de app en el teléfono: agregar `src/app/icon.png` (512×512) y
  `src/app/apple-icon.png`; Next los toma automáticamente.
