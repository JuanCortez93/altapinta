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

const card =
  "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";

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
    } else if (m.categoria === "provision_sueldo") {
      provision += monto;
    } else if (m.categoria === "deposito_tesoro") {
      aTesoro += monto;
    }
  }
  const totalGastos = [...salidas.values()].reduce((a, b) => a + b, 0);

  const turnos = ["manana", "tarde", "domingo"] as const;
  const hechos = new Set(shifts.map((s) => s.turno));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Hoy</h1>
          <p className="text-sm capitalize text-zinc-500">{fmtFecha(hoy)}</p>
        </div>
        <Link
          href="/cierre"
          className="h-10 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          Cargar cierre
        </Link>
      </div>

      {/* Ventas */}
      <section className={card}>
        <h2 className="mb-3 font-medium">Ventas del día</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Efectivo" value={fmtARS(ventaEfectivo)} />
          <Stat label="Transferencia" value={fmtARS(ventaTransf)} />
          <Stat
            label="Total"
            value={fmtARS(ventaEfectivo + ventaTransf)}
            strong
          />
        </div>
        <div className="mt-3 flex gap-1.5">
          {turnos.map((t) => (
            <span
              key={t}
              className={
                "rounded-md px-2 py-1 text-xs font-medium " +
                (hechos.has(t)
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900")
              }
            >
              {labelTurno(t)}
              {hechos.has(t) ? " ✓" : ""}
            </span>
          ))}
        </div>
      </section>

      {/* Salidas */}
      <section className={card}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Salidas del día</h2>
          <span className="text-sm text-zinc-500">{fmtARS(totalGastos)}</span>
        </div>
        {salidas.size === 0 && provision === 0 && aTesoro === 0 ? (
          <p className="text-sm text-zinc-500">Nada cargado todavía.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-sm">
            {[...salidas.entries()].map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  {catDef(k)?.label ?? k}
                </span>
                <span>{fmtARS(v)}</span>
              </li>
            ))}
            {provision > 0 && (
              <li className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Provisión de sueldos (apartado)
                </span>
                <span>{fmtARS(provision)}</span>
              </li>
            )}
            {aTesoro > 0 && (
              <li className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Pasado al Tesoro
                </span>
                <span>{fmtARS(aTesoro)}</span>
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Arqueos */}
      <section className={card}>
        <h2 className="mb-3 font-medium">Arqueos de hoy</h2>
        {arqueos.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin arqueos cargados.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {arqueos.map((a) => {
              const dif = Number(a.diferencia);
              const ok = Math.abs(dif) < 0.01;
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                >
                  <span>
                    {a.cuenta} · {labelMomento(a.momento)}
                  </span>
                  <span
                    className={
                      ok
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "flex items-center gap-1 font-semibold text-red-600 dark:text-red-400"
                    }
                  >
                    {!ok && <TriangleAlert className="size-3.5" />}
                    {ok
                      ? "OK"
                      : (dif > 0 ? "Sobra " : "Falta ") + fmtARS(Math.abs(dif))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Saldos */}
      <section className={card}>
        <h2 className="mb-3 font-medium">Saldos (teóricos)</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {cuentas.map((c) => (
            <li key={c.id} className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">
                {c.nombre}
              </span>
              <span className="font-medium">{fmtARS(c.saldo)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg bg-zinc-50 py-2 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div
        className={
          "mt-0.5 " + (strong ? "text-base font-semibold" : "text-sm font-medium")
        }
      >
        {value}
      </div>
    </div>
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
