"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Banknote,
  Bike,
  Car,
  HandCoins,
  Package,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import {
  METODOS,
  SALIDA_CATEGORIAS,
  catDef,
  metodoDef,
  type Metodo,
  type SalidaCategoria,
} from "@/lib/gastos";
import { agregarMovimiento } from "@/app/(app)/_actions/movimientos";

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

export function MetodoIcon({
  metodo,
  className,
}: {
  metodo: string;
  className?: string;
}) {
  const Icon = metodoDef(metodo)?.icon === "Banknote" ? Banknote : ArrowRightLeft;
  return <Icon className={className} />;
}

export function MetodoToggle({
  value,
  onChange,
}: {
  value: Metodo;
  onChange: (m: Metodo) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {METODOS.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            aria-pressed={active}
            className={
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-[color,background-color,border-color] duration-150 active:translate-y-px " +
              (active
                ? "border-accent bg-accent-weak text-accent"
                : "border-line text-muted hover:border-line-strong hover:text-ink")
            }
          >
            <MetodoIcon metodo={m.value} className="size-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

/** Carga rápida de un gasto suelto. Las ventas van en el cierre del turno. */
export function MovimientoQuickAdd({ onAdded }: { onAdded?: () => void }) {
  const router = useRouter();
  const [categoria, setCategoria] = useState<SalidaCategoria | null>(null);
  const [metodo, setMetodo] = useState<Metodo>("efectivo");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cat = categoria ? catDef(categoria) : null;

  function reset() {
    setCategoria(null);
    setMetodo("efectivo");
    setDetalle("");
    setMonto("");
    setError(null);
  }

  function guardar() {
    setError(null);
    if (!categoria) return;
    if (num(monto) <= 0) return setError("Poné un monto.");
    if (cat?.requiereDetalle && !detalle.trim())
      return setError("La descripción es obligatoria.");

    start(async () => {
      const res = await agregarMovimiento({
        metodo,
        categoria,
        detalle: detalle.trim(),
        monto: num(monto),
      });
      if (!res.ok) return setError(res.error);
      reset();
      router.refresh();
      onAdded?.();
    });
  }

  if (!categoria) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SALIDA_CATEGORIAS.map((c) => {
          const Icon = ICONS[c.icon] ?? Receipt;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategoria(c.value)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-canvas px-2 py-3 text-xs font-medium text-muted transition-[color,border-color,background-color] duration-150 hover:border-accent hover:bg-accent-weak hover:text-accent active:translate-y-px"
            >
              <Icon className="size-5" />
              {c.label}
            </button>
          );
        })}
      </div>
    );
  }

  const CatIcon = cat ? (ICONS[cat.icon] ?? Receipt) : Receipt;

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CatIcon className="size-4 text-neg" />
        {cat?.label}
        <button
          type="button"
          onClick={reset}
          className="ml-auto text-xs font-normal text-subtle hover:text-ink"
        >
          Cambiar
        </button>
      </div>
      {cat?.ayuda && <p className="mt-1 text-xs text-subtle">{cat.ayuda}</p>}

      <div className="mt-2">
        <MetodoToggle value={metodo} onChange={setMetodo} />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          autoFocus
          placeholder={
            cat?.requiereDetalle
              ? "Descripción (obligatoria)"
              : "Detalle (opcional)"
          }
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

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="btn btn-primary h-9 px-4 text-sm"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-neg">{error}</p>}
    </div>
  );
}
