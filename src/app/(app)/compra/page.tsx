import Link from "next/link";
import {
  getComprasRecientes,
  getProductosParaCompra,
  getProveedores,
  getUsers,
} from "@/lib/queries";
import { fmtARS, fmtFecha, todayAR } from "@/lib/format";
import { CompraForm } from "./compra-form";

export const dynamic = "force-dynamic";

export default async function CompraPage() {
  const [usuarios, proveedores, productos, recientes] = await Promise.all([
    getUsers(),
    getProveedores(),
    getProductosParaCompra(),
    getComprasRecientes(15),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Compra</h1>
        <p className="mt-0.5 text-sm text-subtle">
          Registro de mercadería. Cargá todos los renglones de una vez.
        </p>
      </header>

      <CompraForm
        hoy={todayAR()}
        usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
        proveedores={proveedores}
        productos={productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          unidad: p.unidad,
          presentaciones: p.presentaciones ?? null,
          categoria: p.categoria ?? "Sin categoría",
        }))}
      />

      {recientes.length > 0 && (
        <section className="card">
          <h2 className="border-b border-line px-5 py-3 text-sm font-medium text-muted">
            Últimas compras
          </h2>
          <ul className="divide-y divide-line">
            {recientes.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 px-5 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {c.proveedor || c.proveedorTexto || "Proveedor"}
                  </div>
                  <div className="text-xs text-subtle">
                    <span className="capitalize">{fmtFecha(c.fecha)}</span> ·{" "}
                    {Number(c.items)}{" "}
                    {Number(c.items) === 1 ? "renglón" : "renglones"} · {c.cuenta}
                  </div>
                </div>
                <span className="tnum shrink-0 font-semibold text-neg">
                  − {fmtARS(Number(c.total))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-subtle">
        ¿Falta un producto en la lista? Cargalo como{" "}
        <span className="font-medium text-ink">Otro</span> por ahora; la pantalla
        para administrar el catálogo viene después.{" "}
        <Link href="/movimiento" className="text-accent">
          Para un pago suelto al proveedor, usá Movimiento.
        </Link>
      </p>
    </div>
  );
}
