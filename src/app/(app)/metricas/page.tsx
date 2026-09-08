import { getVentasPorDia, getGastosPorCategoria } from "@/lib/queries";
import { fmtARS, fmtFecha } from "@/lib/format";
import { etiquetaMovimiento } from "@/lib/gastos";

export const dynamic = "force-dynamic";

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function hace(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default async function MetricasPage() {
  const desde = hace(60);
  const [ventas, gastosCat] = await Promise.all([
    getVentasPorDia(desde),
    getGastosPorCategoria(desde),
  ]);

  const filas = ventas.map((v) => ({
    fecha: v.fecha,
    efectivo: Number(v.efectivo),
    transferencia: Number(v.transferencia),
    total: Number(v.efectivo) + Number(v.transferencia),
  }));

  const ventaTotal = filas.reduce((a, f) => a + f.total, 0);
  const promedio = filas.length ? ventaTotal / filas.length : 0;
  const maxDia = filas.reduce(
    (m, f) => (f.total > m.total ? f : m),
    { fecha: "", total: 0 },
  );
  const maxBar = Math.max(1, ...filas.map((f) => f.total));

  // promedio por día de semana
  const porDow = new Map<number, { suma: number; n: number }>();
  for (const f of filas) {
    const [y, m, d] = f.fecha.split("-").map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const cur = porDow.get(dow) ?? { suma: 0, n: 0 };
    porDow.set(dow, { suma: cur.suma + f.total, n: cur.n + 1 });
  }

  const gastoTotal = gastosCat.reduce((a, g) => a + Number(g.total), 0);
  const gastoAgrup = new Map<string, number>();
  for (const g of gastosCat) {
    const k = etiquetaMovimiento(g.categoria, g.gastoCategoria);
    gastoAgrup.set(k, (gastoAgrup.get(k) ?? 0) + Number(g.total));
  }

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
        <p className="mt-0.5 text-sm text-subtle">Últimos 60 días</p>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Venta total" value={fmtARS(ventaTotal)} />
        <Kpi label="Promedio / día" value={fmtARS(promedio)} />
        <Kpi
          label="Mejor día"
          value={maxDia.fecha ? fmtARS(maxDia.total) : "—"}
          sub={maxDia.fecha ? fmtFecha(maxDia.fecha) : undefined}
        />
        <Kpi label="Gastos" value={fmtARS(gastoTotal)} />
      </section>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-subtle">
          Todavía no hay días cerrados.
        </p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted">
              Promedio por día de semana
            </h2>
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
                const e = porDow.get(dow);
                const prom = e ? e.suma / e.n : 0;
                const max = Math.max(
                  1,
                  ...[...porDow.values()].map((x) => x.suma / x.n),
                );
                return (
                  <div key={dow} className="flex items-center gap-2 text-sm">
                    <span className="w-8 shrink-0 text-subtle">
                      {DIAS[dow]}
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-surface-2">
                      <div
                        className="h-full rounded bg-accent"
                        style={{ width: `${(prom / max) * 100}%` }}
                      />
                    </div>
                    <span className="tnum w-24 shrink-0 text-right text-muted">
                      {fmtARS(prom)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2 className="border-b border-line px-5 py-3 text-sm font-medium text-muted">
              Venta por día
            </h2>
            <ul className="divide-y divide-line">
              {filas.map((f) => (
                <li
                  key={f.fecha}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <span className="w-16 shrink-0 capitalize text-muted">
                    {fmtFecha(f.fecha)}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-surface-2">
                    <div
                      className="h-full rounded bg-accent"
                      style={{ width: `${(f.total / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="tnum w-24 shrink-0 text-right font-medium">
                    {fmtARS(f.total)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {gastoAgrup.size > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted">
            Gastos por categoría
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {[...gastoAgrup.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-muted">{k}</span>
                  <span className="tnum">{fmtARS(v)}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-3">
      <div className="text-xs text-subtle">{label}</div>
      <div className="tnum mt-1 text-base font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs capitalize text-subtle">{sub}</div>}
    </div>
  );
}
