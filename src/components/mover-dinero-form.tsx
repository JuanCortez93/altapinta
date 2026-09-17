"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { moverDinero } from "@/app/(app)/_actions/movimientos";

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function MoverDineroForm({
  cuentas,
}: {
  cuentas: { id: number; nombre: string }[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [origenId, setOrigenId] = useState<string>("");
  const [destinoId, setDestinoId] = useState<string>("");
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setOrigenId("");
    setDestinoId("");
    setMonto("");
    setDetalle("");
    setError(null);
  }

  function guardar() {
    setError(null);
    if (!origenId || !destinoId) return setError("Elegí las dos cuentas.");
    if (origenId === destinoId)
      return setError("Elegí dos cuentas distintas.");
    if (num(monto) <= 0) return setError("Poné un monto.");

    start(async () => {
      const res = await moverDinero({
        origenId: Number(origenId),
        destinoId: Number(destinoId),
        monto: num(monto),
        detalle: detalle.trim(),
      });
      if (!res.ok) return setError(res.error);
      reset();
      setAbierto(false);
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="btn btn-secondary inline-flex h-9 items-center gap-1.5 px-3 text-sm"
      >
        <ArrowRightLeft className="size-4" />
        Mover dinero
      </button>
    );
  }

  const destinos = cuentas.filter((c) => String(c.id) !== origenId);

  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <ArrowRightLeft className="size-4 text-accent" />
        Mover dinero entre cuentas
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={origenId}
          onChange={(e) => {
            setOrigenId(e.target.value);
            if (e.target.value === destinoId) setDestinoId("");
          }}
          className="h-10 rounded-md border border-line bg-surface px-2.5 text-sm"
        >
          <option value="">De…</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <select
          value={destinoId}
          onChange={(e) => setDestinoId(e.target.value)}
          disabled={!origenId}
          className="h-10 rounded-md border border-line bg-surface px-2.5 text-sm disabled:opacity-50"
        >
          <option value="">A…</option>
          {destinos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input
          placeholder="Detalle (opcional)"
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
          onClick={() => {
            reset();
            setAbierto(false);
          }}
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
          {pending ? "Guardando…" : "Mover"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-neg">{error}</p>}
    </div>
  );
}
