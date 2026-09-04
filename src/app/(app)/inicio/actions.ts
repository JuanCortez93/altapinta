"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { moneyAccounts, moneyMovements } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { getBranch, getCuentasInicializadas } from "@/lib/queries";

const money = (n: number) => n.toFixed(2);

export interface SaldoInicialPayload {
  fecha: string;
  tesoro: number;
  cajaChica: number;
  reserva: number;
}

export type SaldoInicialResult =
  | { ok: true; cargadas: string[]; omitidas: string[] }
  | { ok: false; error: string };

export async function registrarSaldoInicial(
  p: SaldoInicialPayload,
): Promise<SaldoInicialResult> {
  await assertAuthed();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return { ok: false, error: "Fecha inválida." };

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };

  const cuentas = await db.select().from(moneyAccounts);
  const cajaChica = cuentas.find((c) => c.esCajaChica);
  const tesoro = cuentas.find((c) => c.esTesoro);
  const reserva = cuentas.find((c) => c.esReserva);
  if (!cajaChica || !tesoro || !reserva)
    return { ok: false, error: "Faltan cuentas base. Corré el seed." };

  const yaInicializadas = await getCuentasInicializadas();

  const pedidos = [
    { cuenta: tesoro, monto: p.tesoro },
    { cuenta: cajaChica, monto: p.cajaChica },
    { cuenta: reserva, monto: p.reserva },
  ].filter((x) => Number.isFinite(x.monto) && x.monto > 0);

  if (pedidos.length === 0)
    return { ok: false, error: "Cargá al menos un monto." };

  const cargadas: string[] = [];
  const omitidas: string[] = [];

  for (const { cuenta, monto } of pedidos) {
    if (yaInicializadas.has(cuenta.id)) {
      omitidas.push(cuenta.nombre);
      continue;
    }
    await db.insert(moneyMovements).values({
      branchId: branch.id,
      fecha: p.fecha,
      tipo: "ingreso",
      categoria: "fondo_inicial",
      cuentaId: cuenta.id,
      monto: money(monto),
      descripcion: "Saldo inicial al arrancar la app",
    });
    cargadas.push(cuenta.nombre);
  }

  revalidatePath("/");
  revalidatePath("/cuentas");
  revalidatePath("/inicio");

  if (cargadas.length === 0)
    return {
      ok: false,
      error: `Esas cuentas ya tenían saldo inicial cargado: ${omitidas.join(", ")}.`,
    };

  return { ok: true, cargadas, omitidas };
}
