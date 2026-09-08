"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Box, Hash, Scale, Trash2, type LucideIcon } from "lucide-react";
import { fmtARS } from "@/lib/format";
import { PRESENTACIONES, type Presentacion } from "@/lib/compras";
import { MetodoToggle } from "@/components/movimiento-quick-add";
import { registrarCompra, type CompraResult } from "./actions";

const field =
  "h-11 w-full rounded-lg border border-line bg-canvas px-3 text-base outline-none transition-colors focus:border-accent";
const lbl = "text-sm font-medium text-muted";

const PRES_ICON: Record<string, LucideIcon> = { Box, Scale, Hash };

const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const uid = () => Math.random().toString(36).slice(2);

type Producto = {
  id: number;
  nombre: string;
  unidad: Presentacion;
  presentaciones: Presentacion[] | null;
  categoria: string;
};

type Linea = {
  key: string;
  productSel: string; // "" | "otro" | id
  descripcion: string;
  cantidad: string;
  presentacion: Presentacion | null;
  monto: string;
};

type Props = {
  hoy: string;
  usuarios: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
  productos: Producto[];
};

function nuevaLinea(): Linea {
  return {
    key: uid(),
    productSel: "",
    descripcion: "",
    cantidad: "",
    presentacion: null,
    monto: "",
  };
}

export function CompraForm({ hoy, usuarios, proveedores, productos }: Props) {
  const [fecha, setFecha] = useState(hoy);
  const [administradorId, setAdministradorId] = useState("");
  const [proveedorSel, setProveedorSel] = useState("");
  const [proveedorTexto, setProveedorTexto] = useState("");
  const [formaPago, setFormaPago] = useState<"efectivo" | "transferencia">(
    "transferencia",
  );
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CompraResult, { ok: true }> | null>(
    null,
  );
  const [pending, start] = useTransition();

  const porCategoria = useMemo(() => {
    const m = new Map<string, Producto[]>();
    for (const p of productos) {
      const arr = m.get(p.categoria) ?? [];
      arr.push(p);
      m.set(p.categoria, arr);
    }
    return [...m.entries()];
  }, [productos]);

  const total = useMemo(
    () => lineas.reduce((a, l) => a + num(l.monto), 0),
    [lineas],
  );

  function updLinea(key: string, patch: Partial<Linea>) {
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function elegirProducto(key: string, sel: string) {
    if (sel === "" || sel === "otro") {
      updLinea(key, {
        productSel: sel,
        presentacion: sel === "otro" ? "unidad" : null,
        descripcion: "",
      });
      return;
    }
    const prod = productos.find((p) => String(p.id) === sel);
    updLinea(key, {
      productSel: sel,
      descripcion: "",
      presentacion: prod?.unidad ?? null,
    });
  }

  function submit() {
    setError(null);
    if (!administradorId) return setError("Elegí quién carga la compra.");
    const validas = lineas.filter(
      (l) => (l.productSel && l.productSel !== "") || l.descripcion.trim(),
    );
    if (validas.length === 0) return setError("Agregá al menos un renglón.");
    for (const l of validas) {
      if (num(l.monto) <= 0) return setError("Hay un renglón sin monto.");
      if (num(l.cantidad) <= 0) return setError("Hay un renglón sin cantidad.");
      if (l.productSel === "otro" && !l.descripcion.trim())
        return setError("Escribí qué es el renglón «Otro».");
    }

    start(async () => {
      const res = await registrarCompra({
        fecha,
        administradorId: Number(administradorId),
        proveedorId:
          proveedorSel && proveedorSel !== "otro" ? Number(proveedorSel) : null,
        proveedorTexto: proveedorSel === "otro" ? proveedorTexto.trim() : "",
        formaPago,
        lineas: validas.map((l) => ({
          productId:
            l.productSel && l.productSel !== "otro" ? Number(l.productSel) : null,
          descripcion: l.descripcion.trim(),
          cantidad: num(l.cantidad),
          presentacion: l.presentacion,
          monto: num(l.monto),
        })),
      });
      if (!res.ok) return setError(res.error);
      setResult(res);
    });
  }

  if (result) {
    return (
      <div className="card flex flex-col gap-3 p-5">
        <div className="flex items-center gap-1.5 text-pos">
          <span className="size-2 rounded-full bg-pos" />
          <h2 className="font-semibold">Compra registrada</h2>
        </div>
        <p className="text-sm text-subtle">
          {result.renglones}{" "}
          {result.renglones === 1 ? "renglón" : "renglones"} ·{" "}
          <span className="tnum font-medium text-ink">
            {fmtARS(result.total)}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setLineas([nuevaLinea()]);
              setProveedorSel("");
              setProveedorTexto("");
            }}
            className="btn btn-primary h-11 flex-1 text-sm"
          >
            Cargar otra
          </button>
          <Link href="/" className="btn btn-secondary h-11 flex-1 text-sm">
            Ver el día
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <section className="card p-4">
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
            <label className={lbl} htmlFor="admin">
              Quién carga
            </label>
            <select
              id="admin"
              value={administradorId}
              onChange={(e) => setAdministradorId(e.target.value)}
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
          <div className="flex flex-col gap-1.5">
            <label className={lbl} htmlFor="prov">
              Proveedor
            </label>
            <select
              id="prov"
              value={proveedorSel}
              onChange={(e) => setProveedorSel(e.target.value)}
              className={field}
            >
              <option value="">Sin especificar</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
              <option value="otro">Otro (escribir)</option>
            </select>
            {proveedorSel === "otro" && (
              <input
                placeholder="Nombre del proveedor"
                value={proveedorTexto}
                onChange={(e) => setProveedorTexto(e.target.value)}
                className={field}
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={lbl}>Forma de pago</span>
            <MetodoToggle value={formaPago} onChange={setFormaPago} />
          </div>
        </div>
      </section>

      {/* Renglones */}
      <section className="card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-medium">Renglones</h2>
          <span className="tnum text-sm text-subtle">{fmtARS(total)}</span>
        </div>

        <ul className="flex flex-col gap-3">
          {lineas.map((l) => {
            const prod =
              l.productSel && l.productSel !== "otro"
                ? productos.find((p) => String(p.id) === l.productSel)
                : undefined;
            const opciones: Presentacion[] =
              l.productSel === "otro"
                ? ["cajon", "kg", "unidad"]
                : prod?.presentaciones && prod.presentaciones.length > 1
                  ? prod.presentaciones
                  : [];
            return (
              <li
                key={l.key}
                className="rounded-xl border border-line bg-canvas p-3"
              >
                <div className="flex items-start gap-2">
                  <select
                    value={l.productSel}
                    onChange={(e) => elegirProducto(l.key, e.target.value)}
                    className="h-10 flex-1 rounded-md border border-line bg-surface px-2 text-sm"
                  >
                    <option value="">Elegir producto…</option>
                    {porCategoria.map(([cat, items]) => (
                      <optgroup key={cat} label={cat}>
                        {items.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="otro">Otro (escribir)</option>
                  </select>
                  {lineas.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setLineas((ls) => ls.filter((x) => x.key !== l.key))
                      }
                      className="rounded-md border border-transparent p-1.5 text-subtle transition-[color,background-color,border-color] duration-150 hover:border-neg/40 hover:bg-neg-weak hover:text-neg"
                      aria-label="Quitar renglón"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>

                {l.productSel === "otro" && (
                  <input
                    placeholder="Qué es (perejil, huevos, flete…)"
                    value={l.descripcion}
                    onChange={(e) =>
                      updLinea(l.key, { descripcion: e.target.value })
                    }
                    className="mt-2 h-10 w-full rounded-md border border-line bg-surface px-2.5 text-sm"
                  />
                )}

                {opciones.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {PRESENTACIONES.filter((pr) =>
                      opciones.includes(pr.value),
                    ).map((pr) => {
                      const Icon = PRES_ICON[pr.icon] ?? Box;
                      const active = l.presentacion === pr.value;
                      return (
                        <button
                          key={pr.value}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            updLinea(l.key, { presentacion: pr.value })
                          }
                          className={
                            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-[color,background-color,border-color] duration-150 active:translate-y-px " +
                            (active
                              ? "border-accent bg-accent-weak text-accent"
                              : "border-line text-muted hover:border-line-strong hover:text-ink")
                          }
                        >
                          <Icon className="size-3.5" />
                          {pr.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {opciones.length === 0 && prod && (
                  <p className="mt-1.5 text-xs text-subtle">
                    Se compra por{" "}
                    {PRESENTACIONES.find((x) => x.value === prod.unidad)?.label ??
                      prod.unidad}
                    .
                  </p>
                )}

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <input
                    inputMode="decimal"
                    placeholder="Cantidad"
                    value={l.cantidad}
                    onChange={(e) =>
                      updLinea(l.key, { cantidad: e.target.value })
                    }
                    className="tnum h-10 rounded-md border border-line bg-surface px-2.5 text-sm"
                  />
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle">
                      $
                    </span>
                    <input
                      inputMode="decimal"
                      placeholder="Monto"
                      value={l.monto}
                      onChange={(e) =>
                        updLinea(l.key, { monto: e.target.value })
                      }
                      className="tnum h-10 w-full rounded-md border border-line bg-surface pl-6 pr-2.5 text-sm"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => setLineas((ls) => [...ls, nuevaLinea()])}
          className="mt-3 text-sm font-medium text-accent"
        >
          ＋ Agregar renglón
        </button>
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
        className="btn btn-primary h-12 text-base"
      >
        {pending
          ? "Guardando…"
          : `Guardar compra · ${fmtARS(total)}`}
      </button>
    </div>
  );
}
