"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bike,
  Package,
  PiggyBank,
  Plus,
  Receipt,
  Trash2,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { fmtARS, labelTurno } from "@/lib/format";
import {
  SALIDA_CATEGORIAS,
  SUGERENCIAS_ENVIO,
  catDef,
  type SalidaCategoria,
} from "@/lib/gastos";
import { registrarCierre, type CierreResult } from "./actions";

const ICONS: Record<string, LucideIcon> = {
  Bike,
  UserPlus,
  PiggyBank,
  Package,
  Wrench,
  Receipt,
};

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-base outline-none transition-colors focus:border-accent";
const label = "text-sm font-medium text-muted";
const section = "rounded-2xl border border-line bg-surface p-4";

type Linea = {
  id: string;
  categoria: SalidaCategoria;
  detalle: string;
  monto: string;
  cuenta: "caja_chica" | "mercado_pago";
};

type Props = {
  hoy: string;
  usuarios: { id: number; nombre: string }[];
  provisionDiaria: number;
  turnosHechos: string[];
};

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function CierreForm({ hoy, usuarios, provisionDiaria, turnosHechos }: Props) {
  const primerTurnoLibre =
    (["manana", "tarde", "domingo"] as const).find(
      (t) => !turnosHechos.includes(t),
    ) ?? "manana";

  const [fecha, setFecha] = useState(hoy);
  const [turno, setTurno] = useState<"manana" | "tarde" | "domingo">(
    primerTurnoLibre,
  );
  const [adminId, setAdminId] = useState("");
  const [vendedorId, setVendedorId] = useState("");
  const [ventaEfectivo, setVentaEfectivo] = useState("");
  const [ventaTransferencia, setVentaTransferencia] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [notaArqueo, setNotaArqueo] = useState("");
  const [esCierreDia, setEsCierreDia] = useState(primerTurnoLibre !== "manana");
  const [efectivoATesoro, setEfectivoATesoro] = useState("");
  const [saldoMpApp, setSaldoMpApp] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CierreResult | null>(null);
  const [pending, startTransition] = useTransition();

  const totalSalidas = useMemo(
    () => lineas.reduce((a, l) => a + num(l.monto), 0),
    [lineas],
  );

  function setTurnoY(t: "manana" | "tarde" | "domingo") {
    setTurno(t);
    setEsCierreDia(t !== "manana");
  }

  function addLinea(preset: Partial<Linea> & { categoria: SalidaCategoria }) {
    setLineas((ls) => [
      ...ls,
      {
        id: crypto.randomUUID(),
        detalle: "",
        monto: "",
        cuenta: "caja_chica",
        ...preset,
      },
    ]);
  }
  function updLinea(id: string, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function delLinea(id: string) {
    setLineas((ls) => ls.filter((l) => l.id !== id));
  }

  function submit() {
    setError(null);
    if (!adminId) return setError("Elegí quién cierra el turno.");
    if (!vendedorId) return setError("Elegí quién atendió el turno.");
    if (efectivoContado.trim() === "")
      return setError("Cargá el efectivo contado en la caja.");
    for (const l of lineas) {
      if (num(l.monto) <= 0)
        return setError(
          `El gasto "${l.detalle || catDef(l.categoria)?.label}" no tiene monto.`,
        );
    }

    startTransition(async () => {
      const res = await registrarCierre({
        fecha,
        turno,
        adminId: Number(adminId),
        vendedorId: Number(vendedorId),
        ventaEfectivo: num(ventaEfectivo),
        ventaTransferencia: num(ventaTransferencia),
        gastos: lineas.map((l) => ({
          categoria: l.categoria,
          detalle: l.detalle.trim(),
          monto: num(l.monto),
          cuenta: l.cuenta,
        })),
        efectivoContado: num(efectivoContado),
        notaArqueo: notaArqueo.trim(),
        esCierreDia,
        efectivoATesoro: num(efectivoATesoro),
        saldoMpApp:
          esCierreDia && saldoMpApp.trim() !== "" ? num(saldoMpApp) : null,
        observaciones: observaciones.trim(),
      });
      setResult(res);
      if (!res.ok) setError(res.error);
    });
  }

  if (result?.ok) return <Resultado result={result} turno={turno} />;

  return (
    <div className="flex flex-col gap-4">
      {/* Datos del turno */}
      <section className={section}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="fecha">
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
            <span className={label}>Turno</span>
            <div className="flex gap-1.5">
              {(["manana", "tarde", "domingo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurnoY(t)}
                  className={
                    "h-11 flex-1 rounded-lg border text-sm font-medium transition-colors " +
                    (turno === t
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line text-muted hover:bg-surface-2") +
                    (turnosHechos.includes(t) && turno !== t
                      ? " opacity-45"
                      : "")
                  }
                >
                  {labelTurno(t)}
                </button>
              ))}
            </div>
            {turnosHechos.includes(turno) && (
              <p className="text-xs text-warn">
                Ya hay un cierre para este turno hoy. No se va a poder guardar
                otro.
              </p>
            )}
          </div>
          <Select
            id="admin"
            label="Quién cierra"
            value={adminId}
            onChange={setAdminId}
            options={usuarios}
          />
          <Select
            id="vendedor"
            label="Quién atendió"
            value={vendedorId}
            onChange={setVendedorId}
            options={usuarios}
          />
        </div>
      </section>

      {/* Ventas */}
      <section className={section}>
        <h2 className="mb-3 font-medium">Ventas del turno</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Money
            id="efectivo"
            label="Vendido en efectivo"
            value={ventaEfectivo}
            onChange={setVentaEfectivo}
          />
          <Money
            id="transferencia"
            label="Vendido en transferencia"
            value={ventaTransferencia}
            onChange={setVentaTransferencia}
          />
        </div>
        <p className="mt-3 text-sm text-subtle">
          Total declarado{" "}
          <span className="tnum font-semibold text-ink">
            {fmtARS(num(ventaEfectivo) + num(ventaTransferencia))}
          </span>
        </p>
      </section>

      {/* Gastos y salidas */}
      <section className={section}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Gastos y salidas</h2>
          <span className="tnum text-sm text-subtle">
            {fmtARS(totalSalidas)}
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <Chip
            icon={Bike}
            label="Envío"
            onClick={() => addLinea({ categoria: "envios" })}
          />
          <Chip
            icon={PiggyBank}
            label="Provisión Graciela"
            onClick={() =>
              addLinea({
                categoria: "provision_sueldo",
                detalle: "Graciela",
                monto: provisionDiaria > 0 ? String(provisionDiaria) : "",
              })
            }
          />
          <Chip
            icon={UserPlus}
            label="Reemplazo caja"
            onClick={() => addLinea({ categoria: "personal_eventual" })}
          />
          <Chip
            icon={Plus}
            label="Otro"
            onClick={() => addLinea({ categoria: "otros" })}
          />
        </div>

        {lineas.length === 0 ? (
          <p className="text-sm text-subtle">Sin gastos cargados.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {lineas.map((l) => {
              const def = catDef(l.categoria);
              const Icon = def ? ICONS[def.icon] ?? Receipt : Receipt;
              const esProv = l.categoria === "provision_sueldo";
              return (
                <li
                  key={l.id}
                  className="rounded-xl border border-line bg-canvas p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-subtle" />
                    <select
                      value={l.categoria}
                      onChange={(e) =>
                        updLinea(l.id, {
                          categoria: e.target.value as SalidaCategoria,
                        })
                      }
                      className="h-9 flex-1 rounded-md border border-line bg-surface px-2 text-sm"
                    >
                      {SALIDA_CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => delLinea(l.id)}
                      className="rounded-md p-1.5 text-subtle transition-colors hover:bg-neg-weak hover:text-neg"
                      aria-label="Quitar gasto"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input
                      list={
                        l.categoria === "envios"
                          ? "sugerencias-envio"
                          : undefined
                      }
                      placeholder="Detalle"
                      value={l.detalle}
                      onChange={(e) =>
                        updLinea(l.id, { detalle: e.target.value })
                      }
                      className="h-10 rounded-md border border-line bg-surface px-2.5 text-sm"
                    />
                    <input
                      inputMode="decimal"
                      placeholder="Monto"
                      value={l.monto}
                      onChange={(e) => updLinea(l.id, { monto: e.target.value })}
                      className="tnum h-10 rounded-md border border-line bg-surface px-2.5 text-sm"
                    />
                  </div>
                  {esProv ? (
                    <p className="mt-1.5 text-xs text-subtle">
                      Se aparta a la cuenta Provisión de sueldos. No es un gasto.
                    </p>
                  ) : (
                    <label className="mt-2 flex items-center gap-2 text-xs text-subtle">
                      Pagado con
                      <select
                        value={l.cuenta}
                        onChange={(e) =>
                          updLinea(l.id, {
                            cuenta: e.target.value as Linea["cuenta"],
                          })
                        }
                        className="h-8 rounded-md border border-line bg-surface px-2 text-xs"
                      >
                        <option value="caja_chica">Caja chica</option>
                        <option value="mercado_pago">Mercado Pago</option>
                      </select>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <datalist id="sugerencias-envio">
          {SUGERENCIAS_ENVIO.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </section>

      {/* Arqueo caja chica */}
      <section className={section}>
        <h2 className="font-medium">Arqueo de Caja chica</h2>
        <p className="mb-3 mt-1 text-xs text-subtle">
          Contá el efectivo que hay en la caja. La diferencia contra el teórico
          se muestra recién al guardar.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Money
            id="contado"
            label="Efectivo contado"
            value={efectivoContado}
            onChange={setEfectivoContado}
          />
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="nota-arqueo">
              Nota (opcional)
            </label>
            <input
              id="nota-arqueo"
              value={notaArqueo}
              onChange={(e) => setNotaArqueo(e.target.value)}
              className={field}
              placeholder="Si sobró o faltó, por qué"
            />
          </div>
        </div>
      </section>

      {/* Cierre del día */}
      <section className={section}>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={esCierreDia}
            onChange={(e) => setEsCierreDia(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          <span className="font-medium">Es el último turno del día</span>
        </label>
        {esCierreDia && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Money
              id="a-tesoro"
              label="Efectivo que pasa al Tesoro"
              value={efectivoATesoro}
              onChange={setEfectivoATesoro}
            />
            <Money
              id="mp-app"
              label="Saldo de Mercado Pago (app)"
              value={saldoMpApp}
              onChange={setSaldoMpApp}
            />
          </div>
        )}
      </section>

      {/* Observaciones */}
      <section className={section}>
        <label className={label} htmlFor="obs">
          Observaciones (opcional)
        </label>
        <textarea
          id="obs"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-base outline-none transition-colors focus:border-accent"
        />
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
        {pending ? "Guardando…" : "Guardar cierre"}
      </button>
    </div>
  );
}

function Select({
  id,
  label: lbl,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: number; nombre: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={label} htmlFor={id}>
        {lbl}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      >
        <option value="">Elegir…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function Money({
  id,
  label: lbl,
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
      <label className={label} htmlFor={id}>
        {lbl}
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

function Chip({
  icon: Icon,
  label: lbl,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <Icon className="size-4" />
      {lbl}
    </button>
  );
}

function Resultado({
  result,
  turno,
}: {
  result: Extract<CierreResult, { ok: true }>;
  turno: string;
}) {
  const { arqueoCaja, arqueoMp } = result;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-center gap-1.5 text-pos">
          <span className="size-2 rounded-full bg-pos" />
          <h2 className="font-semibold">
            Cierre de {labelTurno(turno)} registrado
          </h2>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <ArqueoLinea titulo="Caja chica" a={arqueoCaja} />
          {arqueoMp && <ArqueoLinea titulo="Mercado Pago" a={arqueoMp} />}
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
          href="/cierre"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-line text-sm font-semibold text-muted"
        >
          Cargar otro
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
        <span
          className={
            "tnum font-semibold " + (ok ? "text-pos" : "text-neg")
          }
        >
          {ok
            ? "Sin diferencia"
            : (a.diferencia > 0 ? "Sobra " : "Falta ") +
              fmtARS(Math.abs(a.diferencia))}
        </span>
      </div>
    </div>
  );
}
