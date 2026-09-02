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

const inputCls =
  "h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900";
const labelCls = "text-sm font-medium text-zinc-700 dark:text-zinc-300";
const card =
  "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";

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
  const [esCierreDia, setEsCierreDia] = useState(turno !== "manana");
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
        saldoMpApp: esCierreDia && saldoMpApp.trim() !== "" ? num(saldoMpApp) : null,
        observaciones: observaciones.trim(),
      });
      setResult(res);
      if (!res.ok) setError(res.error);
    });
  }

  if (result?.ok) {
    return <Resultado result={result} turno={turno} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Datos del turno */}
      <section className={card}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="fecha">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelCls}>Turno</span>
            <div className="flex gap-1.5">
              {(["manana", "tarde", "domingo"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurnoY(t)}
                  className={
                    "h-11 flex-1 rounded-lg border text-sm font-medium transition-colors " +
                    (turno === t
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-black/15 text-zinc-600 dark:border-white/20 dark:text-zinc-300") +
                    (turnosHechos.includes(t) ? " opacity-50" : "")
                  }
                >
                  {labelTurno(t)}
                </button>
              ))}
            </div>
            {turnosHechos.includes(turno) && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Ya hay un cierre para este turno hoy — no se va a poder guardar
                dos veces.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="admin">
              Quién cierra
            </label>
            <select
              id="admin"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className={inputCls}
            >
              <option value="">Elegir…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelCls} htmlFor="vendedor">
              Quién atendió
            </label>
            <select
              id="vendedor"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              className={inputCls}
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

      {/* Ventas */}
      <section className={card}>
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
        <p className="mt-3 text-sm text-zinc-500">
          Total declarado:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {fmtARS(num(ventaEfectivo) + num(ventaTransferencia))}
          </span>
        </p>
      </section>

      {/* Gastos y salidas */}
      <section className={card}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Gastos y salidas</h2>
          <span className="text-sm text-zinc-500">{fmtARS(totalSalidas)}</span>
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
          <p className="text-sm text-zinc-500">Sin gastos cargados.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lineas.map((l) => {
              const def = catDef(l.categoria);
              const Icon = def ? ICONS[def.icon] ?? Receipt : Receipt;
              const esProv = l.categoria === "provision_sueldo";
              return (
                <li
                  key={l.id}
                  className="rounded-lg border border-black/10 p-3 dark:border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-zinc-500" />
                    <select
                      value={l.categoria}
                      onChange={(e) =>
                        updLinea(l.id, {
                          categoria: e.target.value as SalidaCategoria,
                        })
                      }
                      className="h-9 flex-1 rounded-md border border-black/15 bg-white px-2 text-sm dark:border-white/20 dark:bg-zinc-900"
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
                      className="rounded-md p-1.5 text-zinc-400 hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10"
                      aria-label="Quitar"
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
                      className="h-10 rounded-md border border-black/15 bg-white px-2.5 text-sm dark:border-white/20 dark:bg-zinc-900"
                    />
                    <input
                      inputMode="decimal"
                      placeholder="Monto"
                      value={l.monto}
                      onChange={(e) => updLinea(l.id, { monto: e.target.value })}
                      className="h-10 rounded-md border border-black/15 bg-white px-2.5 text-sm dark:border-white/20 dark:bg-zinc-900"
                    />
                  </div>
                  {esProv ? (
                    <p className="mt-1.5 text-xs text-zinc-500">
                      Se aparta a la cuenta Provisión de sueldos (no es un gasto).
                    </p>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                      <span>Pagado con</span>
                      <select
                        value={l.cuenta}
                        onChange={(e) =>
                          updLinea(l.id, {
                            cuenta: e.target.value as Linea["cuenta"],
                          })
                        }
                        className="h-8 rounded-md border border-black/15 bg-white px-2 text-xs dark:border-white/20 dark:bg-zinc-900"
                      >
                        <option value="caja_chica">Caja chica</option>
                        <option value="mercado_pago">Mercado Pago</option>
                      </select>
                    </div>
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
      <section className={card}>
        <h2 className="mb-1 font-medium">Arqueo de Caja chica</h2>
        <p className="mb-3 text-xs text-zinc-500">
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
            <label className={labelCls} htmlFor="nota-arqueo">
              Nota (opcional)
            </label>
            <input
              id="nota-arqueo"
              value={notaArqueo}
              onChange={(e) => setNotaArqueo(e.target.value)}
              className={inputCls}
              placeholder="Si sobró o faltó, por qué"
            />
          </div>
        </div>
      </section>

      {/* Cierre del día */}
      <section className={card}>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={esCierreDia}
            onChange={(e) => setEsCierreDia(e.target.checked)}
            className="size-4"
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
      <section className={card}>
        <label className={labelCls} htmlFor="obs">
          Observaciones (opcional)
        </label>
        <textarea
          id="obs"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={2}
          className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-base outline-none focus:border-black/40 dark:border-white/20 dark:bg-zinc-900"
        />
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="h-12 rounded-xl bg-zinc-900 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Guardando…" : "Guardar cierre"}
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
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          $
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={inputCls + " pl-7"}
        />
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
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
      className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-black/5 dark:border-white/20 dark:text-zinc-200 dark:hover:bg-white/10"
    >
      <Icon className="size-4" />
      {label}
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
      <div className={card}>
        <h2 className="font-medium text-emerald-700 dark:text-emerald-400">
          Cierre de {labelTurno(turno)} registrado
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <ArqueoLinea titulo="Caja chica" a={arqueoCaja} />
          {arqueoMp && <ArqueoLinea titulo="Mercado Pago" a={arqueoMp} />}
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href="/"
          className="h-11 flex-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 text-center text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          Ver el día
        </Link>
        <Link
          href="/cierre"
          className="h-11 flex-1 inline-flex items-center justify-center rounded-xl border border-black/15 text-center text-sm font-semibold dark:border-white/20"
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
    <div className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10">
      <div className="font-medium">{titulo}</div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-zinc-500">
        <span>Teórico {fmtARS(a.teorico)}</span>
        <span>Contado {fmtARS(a.contado)}</span>
        <span
          className={
            ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "font-semibold text-red-600 dark:text-red-400"
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
