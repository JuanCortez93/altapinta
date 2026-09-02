const TZ = "America/Argentina/Buenos_Aires";

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function fmtARS(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : (n ?? 0);
  return ars.format(Number.isFinite(v) ? v : 0);
}

/** Fecha de hoy en Argentina, formato yyyy-mm-dd. */
export function todayAR(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

/** yyyy-mm-dd -> "lun 2 sep" */
export function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const TURNOS = [
  { value: "manana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "domingo", label: "Domingo" },
] as const;

export function labelTurno(v: string): string {
  return TURNOS.find((t) => t.value === v)?.label ?? v;
}
