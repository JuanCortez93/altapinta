# PRODUCT.md — Alta Pinta

## Registro

`register: product`

Es una herramienta interna de tarea: cierres de turno, arqueos, control de plata y
(más adelante) stock. El diseño sirve a la tarea, no es la marca en sí. La app
tiene que desaparecer detrás de lo que la persona vino a hacer.

## Producto

Sistema de **control y conciliación** para la pollería y pescadería Alta Pinta
(una sucursal, dos turnos). No es un punto de venta: nadie carga ventas ítem por
ítem. Cada turno se declara el total vendido (efectivo y transferencia), se
cargan los gastos, se cuenta la caja, y el sistema verifica que la plata y —más
adelante— el stock cierren.

## Usuarios

- **Graciela** (vendedora, turno mañana): carga el cierre desde su teléfono
  Android, en el mostrador, a plena luz del día. Quiere tipear tres números y
  volver a atender. Poca paciencia para pantallas complicadas.
- **Esequiel y Stella** (encargados): revisan el día, cargan compras y gastos,
  hacen los arqueos. Usan teléfono y a veces una PC.
- Es un equipo chico donde se confía en la gente. El sistema no vigila: da
  visibilidad y detecta descuadres para conversarlos.

## Tono

Directo, en castellano rioplatense, sin jerga contable. "Falta $2.000",
no "Diferencia de arqueo: -2.000,00". Tratar de vos. Nada de signos de
exclamación decorativos. Los mensajes de error dicen qué pasó y qué hacer.

## Principios

1. **Mobile primero, pulgar primero.** El cierre de turno se hace parado con una
   mano. Campos grandes, poco scroll, teclado numérico donde va un número.
2. **El número manda.** La plata y las diferencias son el contenido. Todo lo
   demás (bordes, íconos, color de marca) va atrás.
3. **El cierre nunca se bloquea.** Al cerrar el día se muestra cuánto debería
   haber en la caja; contar es opcional y se confirma coincida o no. La
   diferencia queda registrada para conversarla, no para trabar.
4. **Verde / rojo significan algo.** Verde = cuadra o entra plata. Rojo = falta o
   sale plata. Ámbar = prestá atención. No usar esos colores de adorno.
5. **Low cost.** Vercel + Supabase gratis. Sin dependencias pesadas.

## Anti-referencias

- Software de gestión tipo Tango / Bejerman: denso, gris, lleno de campos que
  nadie completa.
- Dashboards SaaS con la métrica gigante arriba y gradiente de fondo.
- Apps de banco: no queremos que se sienta un trámite.

## Marca

Logo: insignia circular, un pollo con gorro de cocinero y un pescado con gorra de
marinero, ambos sonriendo. Wordmark "ALTA PINTA" en blanco y dorado sobre olas
azules y un sol naciente. Cinta azul: "Pollería y Pescadería".

Paleta de marca: azul profundo y azul brillante, dorado cálido, blanco, rojo
(cresta del pollo). En la **app** el azul es el acento funcional; el dorado se
reserva para momentos de identidad (login, splash, el propio logo). Los verdes,
rojos y ámbar de estado son independientes de la marca.
