"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtARS, todayAR } from "@/lib/format";
import { MovimientoQuickAdd } from "@/components/movimiento-quick-add";
import { MovimientoLista, type MovimientoRow } from "@/components/movimiento-lista";
import { registrarCierreDia, type CierreResult } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-base outline-none transition-colors focus:border-accent";
const lbl = "text-sm font-medium text-muted";
const section = "rounded-2xl border border-line bg-surface p-4";

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

type Props = {
  usuarios: { id: number; nombre: string }[];
  items: MovimientoRow[];
  cajaChicaActual: number;
};

export function CierreForm({ usuarios, items, cajaChicaActual }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"items" | "confirm">("items");
  const [cerradoPorId, setCerradoPorId] = useState("");
  const [efectivoContado, setEfectivoContado] = useState("");
  const [efectivoATesoro, setEfectivoATesoro] = useState("");
  const [saldoReservaApp, setSaldoReservaApp] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CierreResult, { ok: true }> | null>(
    null,
  );
  const [pending, start] = useTransition();

  const totales = useMemo(() => {
    let ventas = 0;
    let gastos = 0;
    for (const it of items) {
      const monto = Number(it.monto);
      if (it.categoria.startsWith("venta_")) ventas += monto;
      else gastos += monto;
    }
    return { ventas, gastos, neto: ventas - gastos };
  }, [items]);

  const diferenciaPreview =
    efectivoContado.trim() !== "" ? num(efectivoContado) - cajaChicaActual : null;

  function irAConfirmar() {
    setError(null);
    if (!cerradoPorId) return setError("Elegí quién cierra el día.");
    setStage("confirm");
  }

  function confirmar() {
    setError(null);
    start(async () => {
      const res = await registrarCierreDia({
        fecha: todayAR(),
        cerradoPorId: Number(cerradoPorId),
        efectivoContado:
          efectivoContado.trim() !== "" ? num(efectivoContado) : null,
        efectivoATesoro: num(efectivoATesoro),
        saldoReservaApp:
          saldoReservaApp.trim() !== "" ? num(saldoReservaApp) : null,
        observaciones: observaciones.trim(),
      });
      if (!res.ok) return setError(res.error);
      setResult(res);
    });
  }

  if (result) return <Resultado result={result} />;

  if (stage === "confirm") {
    return (
      <div className="flex flex-col gap-4">
        <section className={section}>
          <h2 className="mb-1 font-medium">Debería haber en Caja chica</h2>
          <p className="tnum text-2xl font-semibold">{fmtARS(cajaChicaActual)}</p>
          <p className="mt-1 text-xs text-subtle">
            Ventas del día {fmtARS(totales.ventas)} − Gastos {fmtARS(totales.gastos)}
          </p>
        </section>

        <section className={section}>
          <label className="flex flex-col gap-1.5">
            <span className={lbl}>¿Contaste la caja? (opcional)</span>
            <Money
              id="contado"
              value={efectivoContado}
              onChange={setEfectivoContado}
            />
          </label>
          {diferenciaPreview != null && (
            <p
              className={
                "mt-2 text-sm font-medium " +
                (Math.abs(diferenciaPreview) < 0.01
                  ? "text-pos"
                  : "text-neg")
              }
            >
              {Math.abs(diferenciaPreview) < 0.01
                ? "Coincide."
                : (diferenciaPreview > 0 ? "Sobra " : "Falta ") +
                  fmtARS(Math.abs(diferenciaPreview))}
            </p>
          )}
          <p className="mt-1 text-xs text-subtle">
            Cierra igual, coincida o no.
          </p>
        </section>

        <section className={section}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={lbl}>Efectivo que pasa al Tesoro</span>
              <Money
                id="tesoro"
                value={efectivoATesoro}
                onChange={setEfectivoATesoro}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={lbl}>Saldo de la Reserva (opcional)</span>
              <Money
                id="reserva"
                value={saldoReservaApp}
                onChange={setSaldoReservaApp}
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className={lbl}>Observaciones (opcional)</span>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-base outline-none transition-colors focus:border-accent"
            />
          </label>
        </section>

        {error && (
          <p className="rounded-lg bg-neg-weak px-3 py-2 text-sm font-medium text-neg">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStage("items")}
            className="h-12 flex-1 rounded-xl border border-line text-base font-semibold text-muted"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className="h-12 flex-[2] rounded-xl bg-accent text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Confirmar y cerrar el día"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={section}>
        <label className="flex flex-col gap-1.5">
          <span className={lbl}>Quién cierra</span>
          <select
            value={cerradoPorId}
            onChange={(e) => setCerradoPorId(e.target.value)}
            className={field}
          >
            <option value="">Elegir…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={section}>
        <div className="mb-3">
          <h2 className="font-medium">Ventas y gastos del día</h2>
          <p className="text-xs text-subtle">
            Marcá cada uno como efectivo o transferencia.
          </p>
        </div>
        <div className="mb-3">
          <MovimientoQuickAdd onAdded={() => router.refresh()} />
        </div>
        <MovimientoLista items={items} />
      </section>

      <section className="rounded-2xl border border-line bg-surface-2 p-4">
        <dl className="flex flex-col gap-1.5 text-sm">
          <Linea t="Ventas" v={fmtARS(totales.ventas)} />
          <Linea t="Gastos" v={"− " + fmtARS(totales.gastos)} />
          <div className="my-1 border-t border-line" />
          <Linea t="Neto" v={fmtARS(totales.neto)} fuerte />
        </dl>
      </section>

      {error && (
        <p className="rounded-lg bg-neg-weak px-3 py-2 text-sm font-medium text-neg">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={irAConfirmar}
        className="h-12 rounded-xl bg-accent text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Listo
      </button>
    </div>
  );
}

function Money({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">
        $
      </span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className={"tnum " + field + " pl-7"}
      />
    </div>
  );
}

function Linea({ t, v, fuerte }: { t: string; v: string; fuerte?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={fuerte ? "font-medium" : "text-muted"}>{t}</dt>
      <dd className={"tnum " + (fuerte ? "font-semibold" : "")}>{v}</dd>
    </div>
  );
}

function Resultado({
  result,
}: {
  result: Extract<CierreResult, { ok: true }>;
}) {
  const { arqueoCaja, arqueoReserva, ventaEfectivo, ventaTransferencia } =
    result;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-1.5 text-pos">
          <span className="size-2 rounded-full bg-pos" />
          <h2 className="font-semibold">Día cerrado</h2>
        </div>
        <p className="mt-2 text-sm text-subtle">
          Ventas:{" "}
          <span className="tnum font-medium text-ink">
            {fmtARS(ventaEfectivo + ventaTransferencia)}
          </span>
        </p>
        {(arqueoCaja || arqueoReserva) && (
          <div className="mt-4 flex flex-col gap-2.5">
            {arqueoCaja && <ArqueoLinea titulo="Caja chica" a={arqueoCaja} />}
            {arqueoReserva && <ArqueoLinea titulo="Reserva" a={arqueoReserva} />}
          </div>
        )}
      </section>
      <div className="flex gap-2">
        <Link
          href="/"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-on-accent"
        >
          Ver el día
        </Link>
        <Link
          href="/metricas"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-line text-sm font-semibold text-muted"
        >
          Métricas
        </Link>
      </div>
    </div>
  );
}

function ArqueoLinea({
  titulo,
  a,
}: {
  titulo: string;
  a: { teorico: number; contado: number; diferencia: number };
}) {
  const ok = Math.abs(a.diferencia) < 0.01;
  return (
    <div className="rounded-xl border border-line p-3 text-sm">
      <div className="font-medium">{titulo}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-subtle">
        <span className="tnum">Teórico {fmtARS(a.teorico)}</span>
        <span className="tnum">Contado {fmtARS(a.contado)}</span>
        <span className={"tnum font-semibold " + (ok ? "text-pos" : "text-neg")}>
          {ok
            ? "Sin diferencia"
            : (a.diferencia > 0 ? "Sobra " : "Falta ") +
              fmtARS(Math.abs(a.diferencia))}
        </span>
      </div>
    </div>
  );
}
