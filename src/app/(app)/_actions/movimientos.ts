"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moneyAccounts, moneyMovements } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { getBranch } from "@/lib/queries";
import { movimientoDeGasto, type Metodo, type SalidaCategoria } from "@/lib/gastos";

const money = (n: number) => n.toFixed(2);

function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

async function cuentaPorMetodo(metodo: Metodo) {
  const rows = await db.select().from(moneyAccounts);
  const cajaChica = rows.find((c) => c.esCajaChica);
  const reserva = rows.find((c) => c.esReserva);
  return metodo === "efectivo" ? cajaChica : reserva;
}

/** Un gasto suelto del día (las ventas se cargan en el cierre del turno). */
export interface GastoInput {
  metodo: Metodo;
  categoria: SalidaCategoria;
  detalle: string;
  monto: number;
}

export type MovimientoResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

function validar(p: GastoInput): string | null {
  if (!Number.isFinite(p.monto) || p.monto <= 0)
    return "El monto tiene que ser mayor a cero.";
  if (!p.categoria) return "Elegí una categoría.";
  if (p.categoria === "otros" && !p.detalle.trim())
    return "En «Otros» la descripción es obligatoria.";
  return null;
}

export async function agregarMovimiento(
  p: GastoInput,
): Promise<MovimientoResult> {
  await assertAuthed();

  const err = validar(p);
  if (err) return { ok: false, error: err };

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };

  const cuenta = await cuentaPorMetodo(p.metodo);
  if (!cuenta) return { ok: false, error: "Falta la cuenta. Corré el seed." };

  const { categoria, gastoCategoria } = movimientoDeGasto(p.categoria);

  const [row] = await db
    .insert(moneyMovements)
    .values({
      branchId: branch.id,
      fecha: hoyISO(),
      tipo: "egreso",
      categoria,
      gastoCategoria,
      cuentaId: cuenta.id,
      monto: money(p.monto),
      descripcion: p.detalle.trim() || null,
    })
    .returning({ id: moneyMovements.id });

  revalidar();
  return { ok: true, id: row.id };
}

export async function editarMovimiento(
  id: number,
  p: GastoInput,
): Promise<MovimientoResult> {
  await assertAuthed();

  const err = validar(p);
  if (err) return { ok: false, error: err };

  const [mov] = await db
    .select()
    .from(moneyMovements)
    .where(eq(moneyMovements.id, id));
  if (!mov) return { ok: false, error: "No existe." };
  if (mov.cierreId)
    return { ok: false, error: "Ese gasto ya quedó en un cierre." };

  const cuenta = await cuentaPorMetodo(p.metodo);
  if (!cuenta) return { ok: false, error: "Falta la cuenta. Corré el seed." };

  const { categoria, gastoCategoria } = movimientoDeGasto(p.categoria);

  await db
    .update(moneyMovements)
    .set({
      tipo: "egreso",
      categoria,
      gastoCategoria,
      cuentaId: cuenta.id,
      monto: money(p.monto),
      descripcion: p.detalle.trim() || null,
    })
    .where(eq(moneyMovements.id, id));

  revalidar();
  return { ok: true, id };
}

export async function borrarMovimiento(id: number): Promise<MovimientoResult> {
  await assertAuthed();
  const [mov] = await db
    .select()
    .from(moneyMovements)
    .where(eq(moneyMovements.id, id));
  if (!mov) return { ok: false, error: "No existe." };
  if (mov.cierreId)
    return { ok: false, error: "Ese gasto ya quedó en un cierre." };

  await db.delete(moneyMovements).where(eq(moneyMovements.id, id));
  revalidar();
  return { ok: true, id };
}

function revalidar() {
  for (const p of ["/", "/movimiento", "/cierre", "/cuentas"]) revalidatePath(p);
}
