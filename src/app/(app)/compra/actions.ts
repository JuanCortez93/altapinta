"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  moneyAccounts,
  moneyMovements,
  purchaseItems,
  purchases,
  stockLots,
  suppliers,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { assertAuthed } from "@/lib/session";
import { getBranch } from "@/lib/queries";
import type { Presentacion } from "@/lib/compras";

const money = (n: number) => n.toFixed(2);
const qty = (n: number) => n.toFixed(3);

export interface LineaCompra {
  productId: number | null;
  descripcion: string;
  cantidad: number;
  presentacion: Presentacion | null;
  monto: number;
}

export interface CompraPayload {
  fecha: string;
  administradorId: number;
  proveedorId: number | null;
  proveedorTexto: string;
  formaPago: "efectivo" | "transferencia";
  lineas: LineaCompra[];
}

export type CompraResult =
  | { ok: true; compraId: number; total: number; renglones: number }
  | { ok: false; error: string };

export async function registrarCompra(
  p: CompraPayload,
): Promise<CompraResult> {
  await assertAuthed();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return { ok: false, error: "Fecha inválida." };
  if (!p.administradorId)
    return { ok: false, error: "Elegí quién carga la compra." };

  const lineas = p.lineas.filter(
    (l) => (l.productId || l.descripcion.trim()) && l.monto > 0,
  );
  if (lineas.length === 0)
    return { ok: false, error: "Cargá al menos un renglón con monto." };
  for (const l of lineas) {
    if (!Number.isFinite(l.cantidad) || l.cantidad <= 0)
      return { ok: false, error: "Hay renglones sin cantidad." };
    if (!l.productId && !l.descripcion.trim())
      return { ok: false, error: "Hay un renglón sin producto ni descripción." };
  }

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };

  const cuentas = await db.select().from(moneyAccounts);
  const cuentaPago =
    p.formaPago === "efectivo"
      ? cuentas.find((c) => c.esCajaChica)
      : cuentas.find((c) => c.esReserva);
  if (!cuentaPago)
    return { ok: false, error: "Falta la cuenta de pago. Corré el seed." };

  const total = lineas.reduce((a, l) => a + l.monto, 0);

  let proveedorNombre = p.proveedorTexto.trim();
  if (p.proveedorId) {
    const [s] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, p.proveedorId));
    proveedorNombre = s?.nombre ?? proveedorNombre;
  }

  try {
    const compraId = await db.transaction(async (tx) => {
      const [compra] = await tx
        .insert(purchases)
        .values({
          branchId: branch.id,
          proveedorId: p.proveedorId,
          proveedorTexto: p.proveedorId ? null : p.proveedorTexto.trim() || null,
          fechaCompra: p.fecha,
          total: money(total),
          cuentaPagoId: cuentaPago.id,
          usuarioId: p.administradorId,
        })
        .returning();

      for (const l of lineas) {
        const costoUnitario = l.cantidad > 0 ? l.monto / l.cantidad : 0;
        const [item] = await tx
          .insert(purchaseItems)
          .values({
            purchaseId: compra.id,
            productId: l.productId,
            descripcion: l.productId ? null : l.descripcion.trim(),
            cantidad: qty(l.cantidad),
            presentacion: l.presentacion,
            costoUnitario: money(costoUnitario),
            subtotal: money(l.monto),
          })
          .returning();

        if (l.productId) {
          await tx.insert(stockLots).values({
            productId: l.productId,
            branchId: branch.id,
            origen: "compra",
            purchaseItemId: item.id,
            fechaIngreso: p.fecha,
            presentacion: l.presentacion,
            cantidadInicial: qty(l.cantidad),
            cantidadRestante: qty(l.cantidad),
            costoUnitario: money(costoUnitario),
          });
        }
      }

      await tx.insert(moneyMovements).values({
        branchId: branch.id,
        fecha: p.fecha,
        tipo: "egreso",
        categoria: "compra",
        cuentaId: cuentaPago.id,
        monto: money(total),
        purchaseId: compra.id,
        descripcion: proveedorNombre
          ? `Compra a ${proveedorNombre}`
          : "Compra a proveedor",
        usuarioId: p.administradorId,
      });

      return compra.id;
    });

    for (const path of ["/", "/compra", "/cuentas", "/movimiento", "/cierre"])
      revalidatePath(path);

    return { ok: true, compraId, total, renglones: lineas.length };
  } catch (e) {
    console.error("registrarCompra", e);
    return { ok: false, error: "No se pudo guardar la compra. Probá de nuevo." };
  }
}
