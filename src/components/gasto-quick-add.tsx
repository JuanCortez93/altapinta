"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Car,
  HandCoins,
  Package,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { SALIDA_CATEGORIAS, catDef, type SalidaCategoria } from "@/lib/gastos";
import { agregarGasto } from "@/app/(app)/cierre/actions";

const ICONS: Record<string, LucideIcon> = {
  Bike,
  Car,
  Package,
  HandCoins,
  Receipt,
};

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function GastoQuickAdd({ onAdded }: { onAdded?: () => void }) {
  const router = useRouter();
  const [cat, setCat] = useState<SalidaCategoria | null>(null);
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [cuenta, setCuenta] = useState<"caja_chica" | "tesoro">("caja_chica");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const def = cat ? catDef(cat) : null;

  function reset() {
    setCat(null);
    setDetalle("");
    setMonto("");
    setCuenta("caja_chica");
    setError(null);
  }

  function guardar() {
    setError(null);
    if (!cat) return;
    if (num(monto) <= 0) return setError("Poné un monto.");
    if (def?.requiereDetalle && !detalle.trim())
      return setError("La descripción es obligatoria.");
    start(async () => {
      const res = await agregarGasto({
        categoria: cat,
        detalle: detalle.trim(),
        monto: num(monto),
        cuenta,
      });
      if (!res.ok) return setError(res.error);
      reset();
      router.refresh();
      onAdded?.();
    });
  }

  if (!cat) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SALIDA_CATEGORIAS.map((c) => {
          const Icon = ICONS[c.icon] ?? Receipt;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCat(c.value)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-canvas px-2 py-3 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Icon className="size-5" />
              {c.label}
            </button>
          );
        })}
      </div>
    );
  }

  const Icon = def ? ICONS[def.icon] ?? Receipt : Receipt;

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-accent" />
        {def?.label}
        <button
          type="button"
          onClick={reset}
          className="ml-auto text-xs font-normal text-subtle hover:text-ink"
        >
          Cambiar
        </button>
      </div>
      {def?.ayuda && (
        <p className="mt-1 text-xs text-subtle">{def.ayuda}</p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          autoFocus
          placeholder={def?.requiereDetalle ? "Descripción (obligatoria)" : "Detalle"}
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          className="h-10 rounded-md border border-line bg-surface px-2.5 text-sm"
        />
        <input
          inputMode="decimal"
          placeholder="Monto"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="tnum h-10 rounded-md border border-line bg-surface px-2.5 text-sm"
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-subtle">
          Pagado con
          <select
            value={cuenta}
            onChange={(e) => setCuenta(e.target.value as "caja_chica" | "tesoro")}
            className="h-8 rounded-md border border-line bg-surface px-2 text-xs"
          >
            <option value="caja_chica">Caja chica</option>
            <option value="tesoro">Tesoro</option>
          </select>
        </label>
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar gasto"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-neg">{error}</p>}
    </div>
  );
}
