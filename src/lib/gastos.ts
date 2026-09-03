/**
 * Categorías de "Gastos y salidas". Se cargan en cualquier momento del día y
 * quedan enganchadas al cierre del día.
 *
 * Cómo se guarda cada una en money_movements:
 *  - envios / uber / otros -> categoria "gasto" + gasto_categoria
 *  - proveedor             -> categoria "compra"
 *  - retiro                -> categoria "retiro"
 */
export type SalidaCategoria = "envios" | "uber" | "proveedor" | "retiro" | "otros";

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

export function catDef(v: string): SalidaCatDef | undefined {
  return SALIDA_CATEGORIAS.find((c) => c.value === v);
}

/** categoria / gasto_categoria que van a money_movements. */
export function movimientoDe(cat: SalidaCategoria): {
  categoria: "gasto" | "compra" | "retiro";
  gastoCategoria: "envios" | "uber" | "otros" | null;
} {
  if (cat === "proveedor") return { categoria: "compra", gastoCategoria: null };
  if (cat === "retiro") return { categoria: "retiro", gastoCategoria: null };
  return { categoria: "gasto", gastoCategoria: cat };
}

/** Etiqueta legible para un movimiento ya guardado. */
export function etiquetaSalida(
  categoria: string,
  gastoCategoria: string | null,
): string {
  if (categoria === "compra") return "Proveedor";
  if (categoria === "retiro") return "Retiro";
  return catDef(gastoCategoria ?? "otros")?.label ?? "Gasto";
}
