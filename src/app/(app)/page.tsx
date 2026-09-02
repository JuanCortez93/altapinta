import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import {
  getArqueosDelDia,
  getCuentasConSaldo,
  getMovimientosDelDia,
  getShiftsDelDia,
} from "@/lib/queries";
import { fmtARS, fmtFecha, labelTurno, todayAR } from "@/lib/format";
import { catDef } from "@/lib/gastos";

export const dynamic = "force-dynamic";

export default async function HoyPage() {
  const hoy = todayAR();
  const [shifts, movs, arqueos, cuentas] = await Promise.all([
    getShiftsDelDia(hoy),
    getMovimientosDelDia(hoy),
    getArqueosDelDia(hoy),
    getCuentasConSaldo(),
  ]);

  const ventaEfectivo = shifts.reduce((a, s) => a + Number(s.totalEfectivo), 0);
  const ventaTransf = shifts.reduce(
    (a, s) => a + Number(s.totalTransferencia),
    0,
  );

  const salidas = new Map<string, number>();
  let provision = 0;
  let aTesoro = 0;
  for (const m of movs) {
    const monto = Number(m.monto);
    if (m.categoria === "gasto") {
      const key = m.gastoCategoria ?? "otros";
      salidas.set(key, (salidas.get(key) ?? 0) + monto);
    } else if (m.categoria === "provision_sueldo") provision += monto;
    else if (m.categoria === "deposito_tesoro") aTesoro += monto;
  }
  const totalGastos = [...salidas.values()].reduce((a, b) => a + b, 0);

  const turnos = ["manana", "tarde", "domingo"] as const;
  const hechos = new Set(shifts.map((s) => s.turno));
  const descuadres = arqueos.filter((a) => Math.abs(Number(a.diferencia)) >= 0.01);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hoy</h1>
          <p className="mt-0.5 text-sm capitalize text-subtle">{fmtFecha(hoy)}</p>
        </div>
        <Link
          href="/cierre"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Cargar cierre
        </Link>
      </header>

      {/* Ventas — el titular del día */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted">Ventas del día</h2>
          <span className="tnum text-lg font-semibold">
            {fmtARS(ventaEfectivo + ventaTransf)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MiniStat label="Efectivo" value={fmtARS(ventaEfectivo)} />
          <MiniStat label="Transferencia" value={fmtARS(ventaTransf)} />
        </div>
        <div className="mt-4 flex gap-1.5">
          {turnos.map((t) => (
            <span
              key={t}
              className={
                "rounded-md px-2 py-1 text-xs font-medium " +
                (hechos.has(t)
                  ? "bg-pos-weak text-pos"
                  : "bg-surface-2 text-subtle")
              }
            >
              {labelTurno(t)}
              {hechos.has(t) ? " · cargado" : ""}
            </span>
          ))}
        </div>
      </section>

      {/* Descuadres — sólo aparece si hay algo que mirar */}
      {descuadres.length > 0 && (
        <section className="rounded-2xl border border-neg/30 bg-neg-weak p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neg">
            <TriangleAlert className="size-4" />
            Arqueos con diferencia
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {descuadres.map((a) => {
              const dif = Number(a.diferencia);
              return (
                <li key={a.id} className="flex justify-between text-ink">
                  <span>
                    {a.cuenta} · {labelMomento(a.momento)}
                  </span>
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
          {arqueos.length === 1 ? "Arqueo" : "Arqueos"} sin diferencias
        </p>
      )}

      {/* Salidas */}
      <section className="rounded-2xl border border-line bg-surface">
        <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-muted">Salidas del día</h2>
          <span className="tnum text-sm font-medium">{fmtARS(totalGastos)}</span>
        </div>
        <div className="px-5 py-4">
          {salidas.size === 0 && provision === 0 && aTesoro === 0 ? (
            <p className="text-sm text-subtle">Nada cargado todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {[...salidas.entries()].map(([k, v]) => (
                <Row key={k} label={catDef(k)?.label ?? k} value={fmtARS(v)} />
              ))}
              {provision > 0 && (
                <Row
                  label="Provisión de sueldos (apartado)"
                  value={fmtARS(provision)}
                />
              )}
              {aTesoro > 0 && (
                <Row label="Pasado al Tesoro" value={fmtARS(aTesoro)} />
              )}
            </ul>
          )}
        </div>
      </section>

      {/* Saldos — tira compacta */}
      <section>
        <h2 className="mb-2 px-1 text-sm font-medium text-muted">
          Saldos teóricos
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tnum shrink-0">{value}</span>
    </li>
  );
}

function labelMomento(m: string): string {
  return (
    {
      cierre_manana: "cierre mañana",
      cierre_tarde: "cierre tarde",
      cierre_domingo: "cierre domingo",
      semanal: "semanal",
    }[m] ?? m
  );
}
