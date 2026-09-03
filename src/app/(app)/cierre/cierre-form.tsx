"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { fmtARS } from "@/lib/format";
import { etiquetaSalida } from "@/lib/gastos";
import { GastoQuickAdd } from "@/components/gasto-quick-add";
import { registrarCierreDia, type CierreResult } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-base outline-none transition-colors focus:border-accent";
const lbl = "text-sm font-medium text-muted";
const section = "rounded-2xl border border-line bg-surface p-4";

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

type Gasto = {
  id: number;
  categoria: string;
  gastoCategoria: string | null;
  monto: string;
  descripcion: string | null;
  cuenta: string | null;
  cierreId: number | null;
};

type Props = {
  hoy: string;
  usuarios: { id: number; nombre: string }[];
  gastos: Gasto[];
};

export function CierreForm({ hoy, usuarios, gastos }: Props) {
  const [fecha, setFecha] = useState(hoy);
  const [cerradoPorId, setCerradoPorId] = useState("");
  const [ventaEfectivo, setVentaEfectivo] = useState("");
  const [ventaTransferencia, setVentaTransferencia] = useState("");
  const [efectivoContado, setEfectivoContado] = useState("");
  const [efectivoATesoro, setEfectivoATesoro] = useState("");
  const [saldoReservaApp, setSaldoReservaApp] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [agregarAbierto, setAgregarAbierto] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CierreResult, { ok: true }> | null>(
    null,
  );
  const [pending, start] = useTransition();

  const totalGastos = useMemo(
    () => gastos.reduce((a, g) => a + Number(g.monto), 0),
    [gastos],
  );
  const ventas = num(ventaEfectivo) + num(ventaTransferencia);
  const neto = ventas - totalGastos;

  function submit() {
    setError(null);
    if (!cerradoPorId) return setError("Elegí quién cierra el día.");
    if (efectivoContado.trim() === "")
      return setError("Cargá el efectivo contado en la caja.");

    start(async () => {
      const res = await registrarCierreDia({
        fecha,
        cerradoPorId: Number(cerradoPorId),
        ventaEfectivo: num(ventaEfectivo),
        ventaTransferencia: num(ventaTransferencia),
        efectivoContado: num(efectivoContado),
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

  return (
    <div className="flex flex-col gap-4">
      <section className={section}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={lbl} htmlFor="fecha">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={lbl} htmlFor="cierra">
              Quién cierra
            </label>
            <select
              id="cierra"
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
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="mb-3 font-medium">Ventas del día</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Money id="ef" label="Dinero en cash" value={ventaEfectivo} onChange={setVentaEfectivo} />
          <Money
            id="tr"
            label="Dinero en transferencias"
            value={ventaTransferencia}
            onChange={setVentaTransferencia}
          />
        </div>
        <p className="mt-3 text-sm text-subtle">
          Venta total{" "}
          <span className="tnum font-semibold text-ink">{fmtARS(ventas)}</span>{" "}
          <span className="text-xs">(bruto, antes de gastos)</span>
        </p>
      </section>

      <section className={section}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Gastos del día</h2>
          <span className="tnum text-sm text-subtle">{fmtARS(totalGastos)}</span>
        </div>

        {gastos.length === 0 ? (
          <p className="text-sm text-subtle">Sin gastos cargados hoy.</p>
        ) : (
          <ul className="divide-y divide-line">
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {g.descripcion ||
                      etiquetaSalida(g.categoria, g.gastoCategoria)}
                  </div>
                  <div className="text-xs text-subtle">
                    {etiquetaSalida(g.categoria, g.gastoCategoria)} · {g.cuenta}
                  </div>
                </div>
                <span className="tnum shrink-0 font-medium text-neg">
                  − {fmtARS(Number(g.monto))}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3">
          {agregarAbierto ? (
            <GastoQuickAdd onAdded={() => setAgregarAbierto(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setAgregarAbierto(true)}
              className="text-sm font-medium text-accent"
            >
              ＋ Agregar gasto
            </button>
          )}
        </div>
      </section>

      <section className={section}>
        <h2 className="font-medium">Arqueo de Caja chica</h2>
        <p className="mb-3 mt-1 text-xs text-subtle">
          Contá el efectivo que hay en la caja. La diferencia se muestra al
          guardar.
        </p>
        <Money
          id="contado"
          label="Efectivo contado"
          value={efectivoContado}
          onChange={setEfectivoContado}
        />
      </section>

      <section className={section}>
        <h2 className="mb-3 font-medium">Cierre</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Money
            id="tesoro"
            label="Efectivo que pasa al Tesoro"
            value={efectivoATesoro}
            onChange={setEfectivoATesoro}
          />
          <Money
            id="reserva"
            label="Saldo de la Reserva (opcional)"
            value={saldoReservaApp}
            onChange={setSaldoReservaApp}
          />
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

      {/* Resumen */}
      <section className="rounded-2xl border border-line bg-surface-2 p-4">
        <dl className="flex flex-col gap-1.5 text-sm">
          <Linea t="Ventas del día" v={fmtARS(ventas)} />
          <Linea t="Gastos del día" v={"− " + fmtARS(totalGastos)} />
          <div className="my-1 border-t border-line" />
          <Linea t="Neto" v={fmtARS(neto)} fuerte />
        </dl>
      </section>

      {error && (
        <p className="rounded-lg bg-neg-weak px-3 py-2 text-sm font-medium text-neg">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="h-12 rounded-xl bg-accent text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Confirmar y cerrar el día"}
      </button>
    </div>
  );
}

function Money({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={lbl} htmlFor={id}>
        {label}
      </label>
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
  const { arqueoCaja, arqueoReserva } = result;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-1.5 text-pos">
          <span className="size-2 rounded-full bg-pos" />
          <h2 className="font-semibold">Día cerrado</h2>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <ArqueoLinea titulo="Caja chica" a={arqueoCaja} />
          {arqueoReserva && <ArqueoLinea titulo="Reserva" a={arqueoReserva} />}
        </div>
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
