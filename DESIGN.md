# DESIGN.md — Alta Pinta

Sistema de diseño de la app. Registro **product**: familiaridad ganada, la
herramienta desaparece detrás de la tarea. Mobile primero.

## Color

Estrategia: **Restrained**. Neutros tintados hacia el azul de marca. El azul es
el acento funcional (botones primarios, nav activa, foco, links). El dorado se
reserva para identidad (login, logo). Verde / rojo / ámbar son estado, no marca.

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
Los montos de plata llevan `.tnum` (cifras tabulares) para que aa alineen en
columna.

## Layout

Header fijo: lockup (logo + "Alta Pinta") a la izquierda, "Salir" a la derecha,
nav debajo con subrayado de acento en la activa. Contenido en `max-w-3xl`,
`px-4`. Secciones agrupadas en tarjetas `rounded-2xl border border-line
bg-surface` solo cuando son pasos distintos de una tarea; se varía la densidad
interna. Nada de tarjetas anidadas ni grillas de tarjetas idénticas.

## Componentes

- Inputs: `h-11`, `border-line`, foco `border-accent`. Los numéricos con
  `inputMode="decimal"`.
- Botón primario: `bg-accent text-on-accent`, hover `bg-accent-hover`.
- Segmentado (turno): activo `bg-accent text-on-accent`, resto `border-line`.
- Chips de atajo: pill con borde, hover a acento.
- Foco global: anillo `--ring` vía `:focus-visible` (en globals.css).

## Motion

150–250 ms, solo `color` / `background` / `opacity` / `border-color`. Sin
animar layout, sin secuencias de entrada.

## Marca / assets

- `public/logo.png` — logo real (pollo + pescado). Si falta, `LogoMark`
  ([`src/components/brand.tsx`](src/components/brand.tsx)) dibuja un emblema
  SVG con los colores de marca.
- `public/logo.svg` — emblema para el favicon.
- Para el ícono de app en el teléfono: agregar `src/app/icon.png` (512×512) y
  `src/app/apple-icon.png`; Next los toma automáticamente.
