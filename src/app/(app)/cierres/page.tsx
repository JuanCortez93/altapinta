import Link from "next/link";
import { getCierresRecientes } from "@/lib/queries";
import { fmtARS, fmtFecha } from "@/lib/format";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  domingo: "Domingo",
};

export default async function CierresPage() {
  const cierres = await getCierresRecientes();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cierres</h1>
        <Link href="/cierre" className="btn btn-primary h-10 px-4 text-sm">
          Cerrar turno
        </Link>
      </header>

      {cierres.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-subtle">
          Todavía no hay cierres.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Turno</th>
                <th className="px-3 py-2.5 text-right font-medium">Efvo.</th>
                <th className="px-3 py-2.5 text-right font-medium">Transf.</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Arqueo</th>
              </tr>
            </thead>
            <tbody>
              {cierres.map((c) => {
                const ef = Number(c.ventaEfectivo);
                const tr = Number(c.ventaTransferencia);
                const dif =
                  c.diferenciaEfectivo == null
                    ? null
                    : Number(c.diferenciaEfectivo);
                const ok = dif != null && Math.abs(dif) < 0.01;
                return (
                  <tr key={c.id} className="border-t border-line bg-surface">
                    <td className="whitespace-nowrap px-4 py-2.5 capitalize">
                      {fmtFecha(c.fecha)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {LABEL[c.turno] ?? c.turno}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-muted">
                      {fmtARS(ef)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-muted">
                      {fmtARS(tr)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right font-semibold">
                      {fmtARS(ef + tr)}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right">
                      {dif == null ? (
                        <span className="text-subtle">—</span>
                      ) : ok ? (
                        <span className="text-pos">OK</span>
                      ) : (
                        <span className="font-semibold text-neg">
                          {dif > 0 ? "+" : "−"}
                          {fmtARS(Math.abs(dif))}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
