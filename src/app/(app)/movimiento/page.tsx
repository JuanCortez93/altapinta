import { getMovimientosSueltosDelDia } from "@/lib/queries";
import { fmtARS, fmtFecha, todayAR } from "@/lib/format";
import { MovimientoQuickAdd } from "@/components/movimiento-quick-add";
import { MovimientoLista } from "@/components/movimiento-lista";

export const dynamic = "force-dynamic";

export default async function MovimientoPage() {
  const hoy = todayAR();
  const items = await getMovimientosSueltosDelDia(hoy);
  const ventas = items.filter((m) => m.categoria.startsWith("venta_"));
  const gastos = items.filter((m) => !m.categoria.startsWith("venta_"));
  const totalVentas = ventas.reduce((a, m) => a + Number(m.monto), 0);
  const totalGastos = gastos.reduce((a, m) => a + Number(m.monto), 0);

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

      <section className="card">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-muted">Hoy, sin cerrar</h2>
          <span className="text-xs text-subtle">
            <span className="tnum text-pos">+{fmtARS(totalVentas)}</span>{" "}
            <span className="tnum text-neg">−{fmtARS(totalGastos)}</span>
          </span>
        </div>
        <div className="px-5 py-3">
          <MovimientoLista items={items} />
        </div>
      </section>
    </div>
  );
}
