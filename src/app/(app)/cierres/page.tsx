import Link from "next/link";
import { getShiftsRecientes } from "@/lib/queries";
import { fmtARS, fmtFecha, labelTurno } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CierresPage() {
  const shifts = await getShiftsRecientes();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Cierres</h1>
        <Link
          href="/cierre"
          className="h-10 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          Cargar cierre
        </Link>
      </div>

      {shifts.length === 0 ? (
        <p className="text-sm text-zinc-500">Todavía no hay cierres cargados.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Turno</th>
                <th className="px-3 py-2 font-medium">Atendió</th>
                <th className="px-3 py-2 text-right font-medium">Efectivo</th>
                <th className="px-3 py-2 text-right font-medium">Transfer.</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const ef = Number(s.totalEfectivo);
                const tr = Number(s.totalTransferencia);
                return (
                  <tr
                    key={s.id}
                    className="border-t border-black/5 dark:border-white/5"
                  >
                    <td className="whitespace-nowrap px-3 py-2 capitalize">
                      {fmtFecha(s.fecha)}
                    </td>
                    <td className="px-3 py-2">{labelTurno(s.turno)}</td>
                    <td className="px-3 py-2 text-zinc-500">
                      {s.vendedor ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtARS(ef)}</td>
                    <td className="px-3 py-2 text-right">{fmtARS(tr)}</td>
                    <td className="px-3 py-2 text-right font-medium">
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
