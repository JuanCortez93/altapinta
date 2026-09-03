import { getGastosDelDia } from "@/lib/queries";
import { fmtARS, fmtFecha, todayAR } from "@/lib/format";
import { GastoQuickAdd } from "@/components/gasto-quick-add";
import { GastoLista } from "@/components/gasto-lista";

export const dynamic = "force-dynamic";

export default async function GastoPage() {
  const hoy = todayAR();
  const gastos = await getGastosDelDia(hoy);
  const total = gastos.reduce((a, g) => a + Number(g.monto), 0);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar gasto</h1>
        <p className="mt-0.5 text-sm capitalize text-subtle">{fmtFecha(hoy)}</p>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <GastoQuickAdd />
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-muted">Gastos de hoy</h2>
          <span className="tnum text-sm font-medium">{fmtARS(total)}</span>
        </div>
        <div className="px-5 py-3">
          <GastoLista gastos={gastos} />
        </div>
      </section>
    </div>
  );
}
