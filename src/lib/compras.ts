/**
 * Presentaciones de compra. Un producto define cuáles permite; el formulario
 * muestra el selector sólo si hay más de una.
 */
export type Presentacion = "cajon" | "kg" | "unidad";

export const PRESENTACIONES: {
  value: Presentacion;
  label: string;
  corto: string;
  icon: string; // lucide-react
}[] = [
  { value: "cajon", label: "Cajón", corto: "cjn", icon: "Box" },
  { value: "kg", label: "Kilo", corto: "kg", icon: "Scale" },
  { value: "unidad", label: "Unidad", corto: "un", icon: "Hash" },
];

export function presentacionDef(v: string | null | undefined) {
  return PRESENTACIONES.find((p) => p.value === v);
}

export function labelPresentacion(v: string | null | undefined): string {
  return presentacionDef(v)?.label ?? "";
}
