import Link from "next/link";
import { getShiftsRecientes } from "@/lib/queries";
import { fmtARS, fmtFecha, labelTurno } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CierresPage() {
  const shifts = await getShiftsRecientes();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Cierres</h1>
        <Link
          href="/cierre"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
        >
          Cargar cierre
        </Link>
      </header>

      {shifts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-subtle">
          Todavía no hay cierres cargados.
          <br />
          El primero se carga desde{" "}
          <Link href="/cierre" className="font-medium text-accent">
            Cierre de turno
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-4 py-2.5 font-medium">Fecha</th>
                <th className="px-3 py-2.5 font-medium">Turno</th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Atendió
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Efvo.</th>
                <th className="px-3 py-2.5 text-right font-medium">Transf.</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const ef = Number(s.totalEfectivo);
                const tr = Number(s.totalTransferencia);
                return (
                  <tr
                    key={s.id}
                    className="border-t border-line bg-surface"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 capitalize">
                      {fmtFecha(s.fecha)}
                    </td>
                    <td className="px-3 py-2.5">{labelTurno(s.turno)}</td>
                    <td className="hidden px-3 py-2.5 text-muted sm:table-cell">
                      {s.vendedor ?? "—"}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-muted">
                      {fmtARS(ef)}
                    </td>
                    <td className="tnum px-3 py-2.5 text-right text-muted">
                      {fmtARS(tr)}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right font-semibold">
                      {fmtARS(ef + tr)}
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
