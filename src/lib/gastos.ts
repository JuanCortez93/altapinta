/**
 * Movimientos sueltos del día: ventas y gastos. Se cargan en cualquier
 * momento (o durante el cierre) y quedan enganchados al cierre del día.
 *
 * Cada movimiento tiene un método de pago (efectivo / transferencia), que
 * define la cuenta: efectivo -> Caja chica, transferencia -> Reserva.
 *
 * Cómo se guarda cada gasto en money_movements:
 *  - envios / uber / otros -> categoria "gasto" + gasto_categoria
 *  - proveedor             -> categoria "compra"
 *  - retiro                -> categoria "retiro"
 */
export type SalidaCategoria = "envios" | "uber" | "proveedor" | "retiro" | "otros";
export type Metodo = "efectivo" | "transferencia";

export interface SalidaCatDef {
  value: SalidaCategoria;
  label: string;
  icon: string; // nombre de icono de lucide-react
  ayuda: string;
  /** El detalle es obligatorio al cargar. */
  requiereDetalle?: boolean;
}

export const SALIDA_CATEGORIAS: SalidaCatDef[] = [
  {
    value: "envios",
    label: "Envíos",
    icon: "Bike",
    ayuda: "Reparto a domicilio (cadete propio, moto).",
  },
  {
    value: "uber",
    label: "Uber",
    icon: "Car",
    ayuda: "Uber Envíos.",
  },
  {
    value: "proveedor",
    label: "Proveedor",
    icon: "Package",
    ayuda: "Compra a proveedor pagada de la caja.",
  },
  {
    value: "retiro",
    label: "Retiro",
    icon: "HandCoins",
    ayuda: "Plata que se saca del negocio (dueño).",
  },
  {
    value: "otros",
    label: "Otros",
    icon: "Receipt",
    ayuda: "Cualquier otra salida (galletas, etc.).",
    requiereDetalle: true,
  },
];

export const METODOS: { value: Metodo; label: string; icon: string }[] = [
  { value: "efectivo", label: "Efectivo", icon: "Banknote" },
  { value: "transferencia", label: "Transferencia", icon: "ArrowRightLeft" },
];

export function catDef(v: string): SalidaCatDef | undefined {
  return SALIDA_CATEGORIAS.find((c) => c.value === v);
}

export function metodoDef(v: string) {
  return METODOS.find((m) => m.value === v);
}

/** categoria / gasto_categoria que van a money_movements, para un gasto. */
export function movimientoDeGasto(cat: SalidaCategoria): {
  categoria: "gasto" | "compra" | "retiro";
  gastoCategoria: "envios" | "uber" | "otros" | null;
} {
  if (cat === "proveedor") return { categoria: "compra", gastoCategoria: null };
  if (cat === "retiro") return { categoria: "retiro", gastoCategoria: null };
  return { categoria: "gasto", gastoCategoria: cat };
}

/** categoria de money_movements para una venta, según el método. */
export function categoriaDeVenta(
  metodo: Metodo,
): "venta_efectivo" | "venta_transferencia" {
  return metodo === "efectivo" ? "venta_efectivo" : "venta_transferencia";
}

/** Etiqueta legible para un movimiento ya guardado. */
export function etiquetaMovimiento(
  categoria: string,
  gastoCategoria: string | null,
): string {
  if (categoria === "venta_efectivo" || categoria === "venta_transferencia")
    return "Venta";
  if (categoria === "compra") return "Proveedor";
  if (categoria === "retiro") return "Retiro";
  return catDef(gastoCategoria ?? "otros")?.label ?? "Gasto";
}

/**
 * Método de pago según el nombre de la cuenta que tocó el movimiento.
 * Los movimientos sueltos sólo pegan en Caja chica (efectivo) o Reserva
 * (transferencia); Tesoro sólo se usa en el barrido del cierre.
 */
export function metodoDeCuenta(nombreCuenta: string | null): Metodo {
  return nombreCuenta === "Reserva" ? "transferencia" : "efectivo";
}
