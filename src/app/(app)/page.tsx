import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import {
  getArqueosDelDia,
  getCierresDelDia,
  getCuentasConSaldo,
  getCuentasInicializadas,
  getGastosDelDia,
} from "@/lib/queries";
import { fmtARS, fmtFecha, todayAR } from "@/lib/format";
import { etiquetaMovimiento } from "@/lib/gastos";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  domingo: "Domingo",
};

export default async function HoyPage() {
  const hoy = todayAR();
  const [cierres, gastos, arqueos, cuentas, inicializadas] = await Promise.all([
    getCierresDelDia(hoy),
    getGastosDelDia(hoy),
    getArqueosDelDia(hoy),
    getCuentasConSaldo(),
    getCuentasInicializadas(),
  ]);

  const totalGastos = gastos.reduce((a, g) => a + Number(g.monto), 0);
  const porCategoria = new Map<string, number>();
  for (const g of gastos) {
    const k = etiquetaMovimiento(g.categoria, g.gastoCategoria);
    porCategoria.set(k, (porCategoria.get(k) ?? 0) + Number(g.monto));
  }

  const ventaEfectivo = cierres.reduce(
    (a, c) => a + Number(c.ventaEfectivo),
    0,
  );
  const ventaTransf = cierres.reduce(
    (a, c) => a + Number(c.ventaTransferencia),
    0,
  );
  const turnosCerrados = cierres.map((c) => c.turno);

  const descuadres = arqueos.filter(
    (a) => Math.abs(Number(a.diferencia)) >= 0.01,
  );

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoy</h1>
          <p className="mt-0.5 text-sm capitalize text-subtle">{fmtFecha(hoy)}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/movimiento" className="btn btn-secondary h-10 px-3 text-sm">
            Gasto
          </Link>
          <Link href="/cierre" className="btn btn-primary h-10 px-4 text-sm">
            Cerrar turno
          </Link>
        </div>
      </header>

      {inicializadas.size === 0 && (
        <section className="rounded-2xl border border-gold bg-gold/10 p-4">
          <p className="text-sm font-medium text-ink">
            Todavía no cargaste el saldo inicial de las cuentas.
          </p>
          <Link href="/inicio" className="btn btn-gold mt-2 h-9 px-3 text-sm">
            Cargar saldo inicial
          </Link>
        </section>
      )}

      {/* Ventas */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted">Ventas del día</h2>
          <span className="tnum text-lg font-semibold">
            {fmtARS(ventaEfectivo + ventaTransf)}
          </span>
        </div>
        {cierres.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniStat label="Efectivo" value={fmtARS(ventaEfectivo)} />
            <MiniStat label="Transferencia" value={fmtARS(ventaTransf)} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-subtle">Ningún turno cerrado todavía.</p>
        )}
        <div className="mt-3 flex gap-1.5">
          {(["manana", "tarde", "domingo"] as const).map((t) => (
            <span
              key={t}
              className={
                "rounded-md px-2 py-1 text-xs font-medium " +
                (turnosCerrados.includes(t)
                  ? "bg-pos-weak text-pos"
                  : "bg-surface-2 text-subtle")
              }
            >
              {LABEL[t]}
              {turnosCerrados.includes(t) ? " ✓" : ""}
            </span>
          ))}
        </div>
      </section>

      {descuadres.length > 0 && (
        <section className="rounded-2xl border border-neg/30 bg-neg-weak p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neg">
            <TriangleAlert className="size-4" />
            Arqueo con diferencia
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {descuadres.map((a) => {
              const dif = Number(a.diferencia);
              return (
                <li key={a.id} className="flex justify-between text-ink">
                  <span>{a.cuenta}</span>
                  <span className="tnum font-semibold text-neg">
                    {dif > 0 ? "sobra " : "falta "}
                    {fmtARS(Math.abs(dif))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {arqueos.length > 0 && descuadres.length === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-pos">
          <span className="size-1.5 rounded-full bg-pos" />
          Arqueo sin diferencias
        </p>
      )}

      {/* Gastos */}
      <section className="card">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-muted">Gastos del día</h2>
          <span className="tnum text-sm font-medium">{fmtARS(totalGastos)}</span>
        </div>
        <div className="px-5 py-4">
          {porCategoria.size === 0 ? (
            <p className="text-sm text-subtle">
              Nada cargado.{" "}
              <Link href="/movimiento" className="font-medium text-accent">
                Cargar un gasto
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {[...porCategoria.entries()].map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3">
                  <span className="text-muted">{k}</span>
                  <span className="tnum shrink-0">{fmtARS(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Saldos */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-muted">Saldos</h2>
        <div className="grid grid-cols-3 gap-2">
          {cuentas.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-line bg-surface px-3 py-2.5"
            >
              <div className="truncate text-xs text-subtle">{c.nombre}</div>
              <div className="tnum mt-0.5 text-sm font-semibold">
                {fmtARS(c.saldo)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-xs text-subtle">{label}</div>
      <div className="tnum mt-0.5 text-base font-semibold">{value}</div>
    </div>
  );
}
