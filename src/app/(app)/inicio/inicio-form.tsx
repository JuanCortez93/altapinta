"use client";

import { useState, useTransition } from "react";
import { fmtARS } from "@/lib/format";
import { registrarSaldoInicial } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-base outline-none transition-colors focus:border-accent";
const lbl = "text-sm font-medium text-muted";
const section = "card p-4";

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

type Cuenta = {
  nombre: string;
  esTesoro: boolean;
  esCajaChica: boolean;
  esReserva: boolean;
  saldo: number;
  inicializada: boolean;
};

export function InicioForm({ hoy, cuentas }: { hoy: string; cuentas: Cuenta[] }) {
  const [fecha, setFecha] = useState(hoy);
  const [tesoro, setTesoro] = useState("");
  const [cajaChica, setCajaChica] = useState("");
  const [reserva, setReserva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cTesoro = cuentas.find((c) => c.esTesoro);
  const cCaja = cuentas.find((c) => c.esCajaChica);
  const cReserva = cuentas.find((c) => c.esReserva);

  function submit() {
    setError(null);
    setOk(null);
    start(async () => {
      const res = await registrarSaldoInicial({
        fecha,
        tesoro: num(tesoro),
        cajaChica: num(cajaChica),
        reserva: num(reserva),
      });
      if (!res.ok) return setError(res.error);
      setOk(
        `Saldo inicial cargado: ${res.cargadas.join(", ")}.` +
          (res.omitidas.length
            ? ` (${res.omitidas.join(", ")} ya tenía saldo cargado, no se tocó.)`
            : ""),
      );
      setTesoro("");
      setCajaChica("");
      setReserva("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={section}>
        <div className="flex flex-col gap-1.5">
          <label className={lbl} htmlFor="fecha">
            Fecha de arranque
          </label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${field} max-w-[10rem]`}
          />
        </div>
      </section>

      <section className={section}>
        <div className="flex flex-col gap-3">
          <Campo
            id="tesoro"
            label="Tesoro"
            ayuda="Efectivo en la caja del lugar."
            value={tesoro}
            onChange={setTesoro}
            cuenta={cTesoro}
          />
          <Campo
            id="caja-chica"
            label="Caja chica"
            ayuda="Efectivo operativo del día."
            value={cajaChica}
            onChange={setCajaChica}
            cuenta={cCaja}
          />
          <Campo
            id="reserva"
            label="Reserva"
            ayuda="Lo que ya tengas guardado de transferencias, si aplica."
            value={reserva}
            onChange={setReserva}
            cuenta={cReserva}
          />
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-neg-weak px-3 py-2 text-sm font-medium text-neg">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg bg-pos-weak px-3 py-2 text-sm font-medium text-pos">
          {ok}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn btn-gold h-12 text-base"
      >
        {pending ? "Guardando…" : "Guardar saldo inicial"}
      </button>
    </div>
  );
}

function Campo({
  id,
  label,
  ayuda,
  value,
  onChange,
  cuenta,
}: {
  id: string;
  label: string;
  ayuda: string;
  value: string;
  onChange: (v: string) => void;
  cuenta?: Cuenta;
}) {
  if (cuenta?.inicializada) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-line bg-canvas px-3 py-2.5">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-subtle">Ya tiene saldo inicial cargado.</div>
        </div>
        <span className="tnum text-sm font-semibold">
          {fmtARS(cuenta.saldo)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className={lbl} htmlFor={id}>
        {label}
      </label>
      <p className="text-xs text-subtle">{ayuda}</p>
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
