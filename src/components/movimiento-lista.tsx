"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  Bike,
  Car,
  HandCoins,
  Package,
  Pencil,
  Receipt,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { fmtARS } from "@/lib/format";
import {
  SALIDA_CATEGORIAS,
  catDef,
  etiquetaMovimiento,
  metodoDeCuenta,
  type Metodo,
  type SalidaCategoria,
} from "@/lib/gastos";
import {
  borrarMovimiento,
  editarMovimiento,
} from "@/app/(app)/_actions/movimientos";
import { MetodoIcon, MetodoToggle } from "./movimiento-quick-add";

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

export type MovimientoRow = {
  id: number;
  tipo: string;
  categoria: string;
  gastoCategoria: string | null;
  monto: string;
  descripcion: string | null;
  cuenta: string | null;
  cierreId: number | null;
};

export function MovimientoLista({ items }: { items: MovimientoRow[] }) {
  const [editando, setEditando] = useState<number | null>(null);

  if (items.length === 0)
    return <p className="text-sm text-subtle">Nada cargado todavía hoy.</p>;

  return (
    <ul className="divide-y divide-line">
      {items.map((m) =>
        editando === m.id ? (
          <EditRow key={m.id} m={m} onDone={() => setEditando(null)} />
        ) : (
          <ViewRow
            key={m.id}
            m={m}
            onEditar={() => setEditando(m.id)}
          />
        ),
      )}
    </ul>
  );
}

function ViewRow({ m, onEditar }: { m: MovimientoRow; onEditar: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const esVenta = m.categoria.startsWith("venta_");
  const metodo = metodoDeCuenta(m.cuenta);
  const catIcon = esVenta ? null : (catDef(m.gastoCategoria ?? m.categoria)?.icon ?? "Receipt");
  const Icon: LucideIcon = esVenta ? ArrowDownCircle : (ICONS[catIcon ?? "Receipt"] ?? Receipt);
  const editable = !m.cierreId;

  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <Icon className={"size-4 shrink-0 " + (esVenta ? "text-pos" : "text-neg")} />
      <div className="min-w-0 flex-1">
        <div className="truncate">
          {m.descripcion || etiquetaMovimiento(m.categoria, m.gastoCategoria)}
        </div>
        <div className="flex items-center gap-1 text-xs text-subtle">
          <MetodoIcon metodo={metodo} className="size-3" />
          {etiquetaMovimiento(m.categoria, m.gastoCategoria)} ·{" "}
          {metodo === "efectivo" ? "Efectivo" : "Transferencia"}
        </div>
      </div>
      <span
        className={"tnum shrink-0 font-medium " + (esVenta ? "text-pos" : "text-neg")}
      >
        {esVenta ? "+" : "−"} {fmtARS(Number(m.monto))}
      </span>
      {editable && (
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onEditar}
            className="rounded-md border border-transparent p-1.5 text-subtle transition-[color,background-color,border-color] duration-150 hover:border-accent/40 hover:bg-accent-weak hover:text-accent"
            aria-label="Editar"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await borrarMovimiento(m.id);
                router.refresh();
              })
            }
            className="rounded-md border border-transparent p-1.5 text-subtle transition-[color,background-color,border-color] duration-150 hover:border-neg/40 hover:bg-neg-weak hover:text-neg disabled:opacity-50"
            aria-label="Borrar"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

function EditRow({ m, onDone }: { m: MovimientoRow; onDone: () => void }) {
  const router = useRouter();
  const esVenta = m.categoria.startsWith("venta_");
  const [categoria, setCategoria] = useState<SalidaCategoria>(
    (m.gastoCategoria as SalidaCategoria) ??
      (m.categoria === "compra" ? "proveedor" : m.categoria === "retiro" ? "retiro" : "otros"),
  );
  const [metodo, setMetodo] = useState<Metodo>(metodoDeCuenta(m.cuenta));
  const [detalle, setDetalle] = useState(m.descripcion ?? "");
  const [monto, setMonto] = useState(m.monto);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cat = catDef(categoria);

  function guardar() {
    setError(null);
    if (num(monto) <= 0) return setError("Poné un monto.");
    if (!esVenta && cat?.requiereDetalle && !detalle.trim())
      return setError("La descripción es obligatoria.");

    start(async () => {
      const res = await editarMovimiento(m.id, {
        tipo: esVenta ? "venta" : "gasto",
        metodo,
        categoria: esVenta ? null : categoria,
        detalle: detalle.trim(),
        monto: num(monto),
      });
      if (!res.ok) return setError(res.error);
      router.refresh();
      onDone();
    });
  }

  return (
    <li className="rounded-xl border border-accent bg-accent-weak p-3 text-sm">
      {!esVenta && (
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as SalidaCategoria)}
          className="mb-2 h-9 w-full rounded-md border border-line bg-surface px-2 text-sm"
        >
          {SALIDA_CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      )}
      <MetodoToggle value={metodo} onChange={setMetodo} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          placeholder="Detalle"
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
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="btn btn-ghost h-9 px-3 text-sm"
        >
          Cancelar
        </button>
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
    </li>
  );
}
