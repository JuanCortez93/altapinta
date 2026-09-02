/**
 * Categorías de la sección "Gastos y salidas del turno".
 *
 * `provision_sueldo` no es un gasto: en la base es una transferencia de
 * Caja chica -> Provisión de sueldos. Las otras son egresos con
 * money_movements.categoria = "gasto" y gasto_categoria = value.
 */
export type SalidaCategoria =
  | "envios"
  | "personal_eventual"
  | "provision_sueldo"
  | "insumos"
  | "servicios"
  | "otros";

export interface SalidaCatDef {
  value: SalidaCategoria;
  label: string;
  icon: string; // nombre de icono de lucide-react
  ayuda: string;
  esProvision?: boolean;
}

export const SALIDA_CATEGORIAS: SalidaCatDef[] = [
  {
    value: "envios",
    label: "Envíos",
    icon: "Bike",
    ayuda: "Reparto a domicilio: Uber Envíos, cadete propio.",
  },
  {
    value: "personal_eventual",
    label: "Personal eventual",
    icon: "UserPlus",
    ayuda: "Alguien que cubre la caja o el mostrador por el día.",
  },
  {
    value: "provision_sueldo",
    label: "Provisión de sueldos",
    icon: "PiggyBank",
    ayuda: "Plata que se aparta para el sueldo de fin de mes.",
    esProvision: true,
  },
  {
    value: "insumos",
    label: "Insumos / mercadería",
    icon: "Package",
    ayuda: "Compras chicas pagadas de la caja.",
  },
  {
    value: "servicios",
    label: "Servicios / limpieza",
    icon: "Wrench",
    ayuda: "Luz, gas, artículos de limpieza, changas.",
  },
  { value: "otros", label: "Otros", icon: "Receipt", ayuda: "Lo que no encaje." },
];

export function catDef(v: string): SalidaCatDef | undefined {
  return SALIDA_CATEGORIAS.find((c) => c.value === v);
}

export const SUGERENCIAS_ENVIO = ["Uber", "Nair", "Moto propia"];
