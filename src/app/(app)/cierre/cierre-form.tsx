"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fmtARS, todayAR } from "@/lib/format";
import { MovimientoQuickAdd } from "@/components/movimiento-quick-add";
import { MovimientoLista, type MovimientoRow } from "@/components/movimiento-lista";
import { registrarCierreTurno, type CierreResult, type Turno } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-base outline-none transition-colors focus:border-accent";
const lbl = "text-sm font-medium text-muted";
const section = "card p-4";

const LABEL: Record<Turno, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  domingo: "Domingo",
};

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

type Props = {
  usuarios: { id: number; nombre: string }[];
  gastos: MovimientoRow[];
  cajaChicaActual: number;
  turnosDisponibles: Turno[];
};

export function CierreForm({
  usuarios,
  gastos,
  cajaChicaActual,
  turnosDisponibles,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"items" | "confirm">("items");
  const [turno, setTurno] = useState<Turno>(turnosDisponibles[0]);
  const [cerradoPorId, setCerradoPorId] = useState("");
  const [ventaEfectivo, setVentaEfectivo] = useState("");
  const [ventaTransferencia, setVentaTransferencia] = useState("");
  const [gastoIds, setGastoIds] = useState<Set<number>>(
    () => new Set(gastos.map((g) => g.id)),
  );
  const [efectivoContado, setEfectivoContado] = useState("");
  const [efectivoATesoro, setEfectivoATesoro] = useState("");
  const [saldoReservaApp, setSaldoReservaApp] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CierreResult, { ok: true }> | null>(
    null,
  );
  const [pending, start] = useTransition();

  const gastosDelTurno = useMemo(
    () =>
      gastos
        .filter((g) => gastoIds.has(g.id))
        .reduce((a, g) => a + Number(g.monto), 0),
    [gastos, gastoIds],
  );
  const ventas = num(ventaEfectivo) + num(ventaTransferencia);
  const neto = ventas - gastosDelTurno;

  function toggleGasto(id: number) {
    setGastoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function irAConfirmar() {
    setError(null);
    if (!cerradoPorId) return setError("Elegí quién cierra el turno.");
    setStage("confirm");
  }

  function confirmar() {
    setError(null);
    start(async () => {
      const res = await registrarCierreTurno({
        fecha: todayAR(),
        turno,
        cerradoPorId: Number(cerradoPorId),
        ventaEfectivo: num(ventaEfectivo),
        ventaTransferencia: num(ventaTransferencia),
        gastoIds: [...gastoIds],
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
    const dif =
      efectivoContado.trim() !== ""
        ? num(efectivoContado) - cajaChicaActual
        : null;
    return (
      <div className="flex flex-col gap-4">
        <section className={section}>
          <h2 className="mb-1 font-medium">Debería haber en Caja chica</h2>
          <p className="tnum text-2xl font-semibold">{fmtARS(cajaChicaActual)}</p>
          <p className="mt-1 text-xs text-subtle">
            Ventas del turno {fmtARS(ventas)} − Gastos {fmtARS(gastosDelTurno)}
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
          {dif != null && (
            <p
              className={
                "mt-2 text-sm font-medium " +
                (Math.abs(dif) < 0.01 ? "text-pos" : "text-neg")
              }
            >
              {Math.abs(dif) < 0.01
                ? "Coincide."
                : (dif > 0 ? "Sobra " : "Falta ") + fmtARS(Math.abs(dif))}
            </p>
          )}
          <p className="mt-1 text-xs text-subtle">Cierra igual, coincida o no.</p>
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
            className="btn btn-secondary h-12 flex-1 text-base"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className="btn btn-primary h-12 flex-[2] text-base"
          >
            {pending ? "Guardando…" : `Confirmar cierre de ${LABEL[turno].toLowerCase()}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={section}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className={lbl}>Turno</span>
            <div className="flex gap-1.5">
              {turnosDisponibles.map((t) => {
                const active = turno === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTurno(t)}
                    aria-pressed={active}
                    className={
                      "h-11 flex-1 rounded-lg border text-sm font-medium transition-[color,background-color,border-color] duration-150 active:translate-y-px " +
                      (active
                        ? "border-accent bg-accent-weak text-accent"
                        : "border-line text-muted hover:border-line-strong hover:text-ink")
                    }
                  >
                    {LABEL[t]}
                  </button>
                );
              })}
            </div>
          </div>
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
        </div>
      </section>

      <section className={section}>
        <h2 className="mb-3 font-medium">Ventas del turno</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={lbl} htmlFor="v-ef">
              Vendido en efectivo
            </label>
            <Money id="v-ef" value={ventaEfectivo} onChange={setVentaEfectivo} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={lbl} htmlFor="v-tr">
              Vendido en transferencia
            </label>
            <Money
              id="v-tr"
              value={ventaTransferencia}
              onChange={setVentaTransferencia}
            />
          </div>
        </div>
        <p className="mt-3 text-sm text-subtle">
          Total del turno{" "}
          <span className="tnum font-semibold text-ink">{fmtARS(ventas)}</span>
        </p>
      </section>

      <section className={section}>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-medium">Gastos del turno</h2>
          <span className="tnum text-sm text-subtle">
            {fmtARS(gastosDelTurno)}
          </span>
        </div>
        <p className="mb-3 text-xs text-subtle">
          Tildá los gastos del día que son de este turno.
        </p>
        <MovimientoLista
          items={gastos}
          seleccion={{ checked: gastoIds, onToggle: toggleGasto }}
          vacio="No hay gastos cargados hoy."
        />
        <div className="mt-3">
          <MovimientoQuickAdd
            onAdded={() => {
              router.refresh();
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface-2 p-4">
        <dl className="flex flex-col gap-1.5 text-sm">
          <Linea t="Ventas" v={fmtARS(ventas)} />
          <Linea t="Gastos del turno" v={"− " + fmtARS(gastosDelTurno)} />
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
        onClick={irAConfirmar}
        className="btn btn-primary h-12 text-base"
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
  const { arqueoCaja, arqueoReserva, ventaEfectivo, ventaTransferencia, turno } =
    result;
  return (
    <div className="flex flex-col gap-4">
      <section className="card p-5">
        <div className="flex items-center gap-1.5 text-pos">
          <span className="size-2 rounded-full bg-pos" />
          <h2 className="font-semibold">Cierre de {LABEL[turno].toLowerCase()} listo</h2>
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
        <Link href="/" className="btn btn-primary h-11 flex-1 text-sm">
          Ver el día
        </Link>
        <Link href="/cierre" className="btn btn-secondary h-11 flex-1 text-sm">
          Otro turno
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
