"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { borrarCierre } from "@/app/(app)/cierre/actions";

export function BorrarCierreButton({ cierreId }: { cierreId: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (confirmando) {
    return (
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        {error && <span className="text-xs text-neg">{error}</span>}
        <span className="text-xs text-subtle">¿Borrar?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await borrarCierre(cierreId);
              if (!res.ok) return setError(res.error);
              router.refresh();
            })
          }
          className="btn btn-danger h-7 px-2 text-xs"
        >
          {pending ? "…" : "Sí"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmando(false);
            setError(null);
          }}
          className="btn btn-ghost h-7 px-2 text-xs"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="ml-auto flex rounded-md border border-transparent p-1.5 text-subtle transition-[color,background-color,border-color] duration-150 hover:border-neg/40 hover:bg-neg-weak hover:text-neg"
      aria-label="Borrar cierre"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
