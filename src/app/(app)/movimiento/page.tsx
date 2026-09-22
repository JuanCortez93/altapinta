import {
  getFechasTurnosCerrados,
  getMovimientosSueltosPendientes,
} from "@/lib/queries";
import { fmtARS, fmtFecha, todayAR } from "@/lib/format";
import { fechaCerradaParaSueltos } from "@/lib/gastos";
import { MovimientoQuickAdd } from "@/components/movimiento-quick-add";
import { MovimientoLista } from "@/components/movimiento-lista";

export const dynamic = "force-dynamic";

export default async function MovimientoPage() {
  const hoy = todayAR();
  const [pendientes, cierres] = await Promise.all([
    getMovimientosSueltosPendientes(),
    getFechasTurnosCerrados(),
  ]);

  const porFecha = new Map<string, typeof pendientes>();
  for (const m of pendientes) {
    const arr = porFecha.get(m.fecha) ?? [];
    arr.push(m);
    porFecha.set(m.fecha, arr);
  }
  const fechas = [...porFecha.keys()].sort((a, b) => (a < b ? 1 : -1));
  if (!fechas.includes(hoy)) fechas.unshift(hoy);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cargar movimiento
        </h1>
        <p className="mt-0.5 text-sm capitalize text-subtle">{fmtFecha(hoy)}</p>
      </header>

      <section className="card p-4">
        <MovimientoQuickAdd />
      </section>

      {fechas.map((fecha) => {
        const items = porFecha.get(fecha) ?? [];
        const total = items.reduce((a, m) => a + Number(m.monto), 0);
        const bloqueada = fecha !== hoy && fechaCerradaParaSueltos(fecha, cierres);
        return (
          <section key={fecha} className="card">
            <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
              <h2 className="text-sm font-medium capitalize text-muted">
                {fecha === hoy ? "Hoy, sin cerrar" : fmtFecha(fecha)}
              </h2>
              {items.length > 0 && (
                <span className="tnum text-xs text-neg">−{fmtARS(total)}</span>
              )}
            </div>
            <div className="px-5 py-3">
              {bloqueada && items.length > 0 && (
                <p className="mb-2 text-xs text-subtle">
                  Ese día ya quedó atrás en los cierres — estos quedaron sueltos
                  pero ya no se pueden editar ni borrar acá.
                </p>
              )}
              <MovimientoLista
                items={items}
                bloqueado={bloqueada}
                vacio={
                  fecha === hoy
                    ? "Nada cargado todavía hoy."
                    : "Sin gastos sueltos."
                }
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
