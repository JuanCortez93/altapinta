import { getCuentasConSaldo, getMovimientosRecientes } from "@/lib/queries";
import { fmtARS, fmtFecha } from "@/lib/format";
import { catDef } from "@/lib/gastos";

export const dynamic = "force-dynamic";

const card =
  "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";

const CAT_LABEL: Record<string, string> = {
  venta_efectivo: "Venta en efectivo",
  venta_transferencia: "Venta por transferencia",
  compra: "Compra",
  gasto: "Gasto",
  sueldo: "Sueldo",
  retiro: "Retiro",
  deposito_tesoro: "Depósito al Tesoro",
  ajuste_arqueo: "Ajuste de arqueo",
  fondo_inicial: "Fondo inicial",
  provision_sueldo: "Provisión de sueldos",
};

export default async function CuentasPage() {
  const [cuentas, movs] = await Promise.all([
    getCuentasConSaldo(),
    getMovimientosRecientes(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Cuentas</h1>

      <section className="grid gap-2 sm:grid-cols-2">
        {cuentas.map((c) => (
          <div key={c.id} className={card}>
            <div className="text-sm text-zinc-500">{c.nombre}</div>
            <div className="mt-1 text-lg font-semibold">{fmtARS(c.saldo)}</div>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="mb-3 font-medium">Últimos movimientos</h2>
        {movs.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin movimientos.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
            {movs.map((m) => {
              const monto = Number(m.monto);
              const signo =
                m.tipo === "ingreso" ? "+" : m.tipo === "egreso" ? "−" : "→";
              const etiqueta =
                m.categoria === "gasto" && m.gastoCategoria
                  ? catDef(m.gastoCategoria)?.label ?? "Gasto"
                  : CAT_LABEL[m.categoria] ?? m.categoria;
              return (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      {m.descripcion || etiqueta}
                    </div>
                    <div className="text-xs text-zinc-500">
                      <span className="capitalize">{fmtFecha(m.fecha)}</span> ·{" "}
                      {etiqueta} · {m.cuenta}
                    </div>
                  </div>
                  <div
                    className={
                      "shrink-0 font-medium " +
                      (m.tipo === "ingreso"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : m.tipo === "egreso"
                          ? "text-red-600 dark:text-red-400"
                          : "text-zinc-500")
                    }
                  >
                    {signo} {fmtARS(monto)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
