import { getCuentasConSaldo, getMovimientosRecientes } from "@/lib/queries";
import { fmtARS, fmtFecha } from "@/lib/format";
import { catDef } from "@/lib/gastos";

export const dynamic = "force-dynamic";

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
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Cuentas</h1>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cuentas.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-line bg-surface px-3 py-3"
          >
            <div className="truncate text-xs text-subtle">{c.nombre}</div>
            <div className="tnum mt-1 text-base font-semibold">
              {fmtARS(c.saldo)}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-surface">
        <h2 className="border-b border-line px-5 py-3 text-sm font-medium text-muted">
          Últimos movimientos
        </h2>
        {movs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-subtle">Sin movimientos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {movs.map((m) => {
              const monto = Number(m.monto);
              const signo =
                m.tipo === "ingreso" ? "+" : m.tipo === "egreso" ? "−" : "→";
              const etiqueta =
                m.categoria === "gasto" && m.gastoCategoria
                  ? catDef(m.gastoCategoria)?.label ?? "Gasto"
                  : CAT_LABEL[m.categoria] ?? m.categoria;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-ink">
                      {m.descripcion || etiqueta}
                    </div>
                    <div className="truncate text-xs text-subtle">
                      <span className="capitalize">{fmtFecha(m.fecha)}</span> ·{" "}
                      {etiqueta} · {m.cuenta}
                    </div>
                  </div>
                  <div
                    className={
                      "tnum shrink-0 font-semibold " +
                      (m.tipo === "ingreso"
                        ? "text-pos"
                        : m.tipo === "egreso"
                          ? "text-neg"
                          : "text-muted")
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
