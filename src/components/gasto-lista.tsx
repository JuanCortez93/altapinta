"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { fmtARS } from "@/lib/format";
import { etiquetaSalida } from "@/lib/gastos";
import { borrarGasto } from "@/app/(app)/cierre/actions";

type Gasto = {
  id: number;
  categoria: string;
  gastoCategoria: string | null;
  monto: string;
  descripcion: string | null;
  cuenta: string | null;
  cierreId: number | null;
};

export function GastoLista({ gastos }: { gastos: Gasto[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (gastos.length === 0)
    return <p className="text-sm text-subtle">Sin gastos cargados hoy.</p>;

  return (
    <ul className="divide-y divide-line">
      {gastos.map((g) => (
        <li key={g.id} className="flex items-center gap-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate">
              {g.descripcion || etiquetaSalida(g.categoria, g.gastoCategoria)}
            </div>
            <div className="text-xs text-subtle">
              {etiquetaSalida(g.categoria, g.gastoCategoria)} · {g.cuenta}
            </div>
          </div>
          <span className="tnum shrink-0 font-medium text-neg">
            − {fmtARS(Number(g.monto))}
          </span>
          {!g.cierreId && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await borrarGasto(g.id);
                  router.refresh();
                })
              }
              className="shrink-0 rounded-md p-1 text-subtle transition-colors hover:bg-neg-weak hover:text-neg disabled:opacity-50"
              aria-label="Borrar gasto"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
