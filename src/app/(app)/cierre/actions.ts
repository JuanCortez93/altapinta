"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cashCounts, dailyCloses, moneyAccounts, moneyMovements } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { cierreYaExiste, getBranch } from "@/lib/queries";
import { movimientoDe, type SalidaCategoria } from "@/lib/gastos";

const money = (n: number) => n.toFixed(2);

async function cuentas() {
  const rows = await db.select().from(moneyAccounts);
  return {
    cajaChica: rows.find((c) => c.esCajaChica),
    tesoro: rows.find((c) => c.esTesoro),
    reserva: rows.find((c) => c.esReserva) ?? rows.find((c) => c.tipo === "digital"),
  };
}

/* ------------------------------------------------------------------ */
/* Gastos — se cargan en cualquier momento del día                    */
/* ------------------------------------------------------------------ */

export interface GastoPayload {
  categoria: SalidaCategoria;
  detalle: string;
  monto: number;
  cuenta: "caja_chica" | "tesoro";
}

export type GastoResult = { ok: true; id: number } | { ok: false; error: string };

export async function agregarGasto(p: GastoPayload): Promise<GastoResult> {
  await assertAuthed();

  if (!Number.isFinite(p.monto) || p.monto <= 0)
    return { ok: false, error: "El monto tiene que ser mayor a cero." };
  if (p.categoria === "otros" && !p.detalle.trim())
    return { ok: false, error: "En «Otros» la descripción es obligatoria." };

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };

  const { cajaChica, tesoro } = await cuentas();
  const cuentaId = p.cuenta === "tesoro" ? tesoro?.id : cajaChica?.id;
  if (!cuentaId) return { ok: false, error: "Falta la cuenta. Corré el seed." };

  const { categoria, gastoCategoria } = movimientoDe(p.categoria);

  const [row] = await db
    .insert(moneyMovements)
    .values({
      branchId: branch.id,
      fecha: hoyISO(),
      tipo: "egreso",
      categoria,
      gastoCategoria,
      cuentaId,
      monto: money(p.monto),
      descripcion: p.detalle.trim() || null,
    })
    .returning({ id: moneyMovements.id });

  revalidatePath("/");
  revalidatePath("/gasto");
  revalidatePath("/cierre");
  revalidatePath("/cuentas");
  return { ok: true, id: row.id };
}

export async function borrarGasto(id: number): Promise<GastoResult> {
  await assertAuthed();
  const [mov] = await db
    .select()
    .from(moneyMovements)
    .where(eq(moneyMovements.id, id));
  if (!mov) return { ok: false, error: "No existe." };
  if (mov.cierreId)
    return { ok: false, error: "Ese gasto ya quedó en un cierre; no se puede borrar." };

  await db.delete(moneyMovements).where(eq(moneyMovements.id, id));
  revalidatePath("/");
  revalidatePath("/gasto");
  revalidatePath("/cierre");
  revalidatePath("/cuentas");
  return { ok: true, id };
}

/* ------------------------------------------------------------------ */
/* Cierre del día                                                     */
/* ------------------------------------------------------------------ */

export interface CierrePayload {
  fecha: string;
  cerradoPorId: number;
  ventaEfectivo: number;
  ventaTransferencia: number;
  efectivoContado: number;
  efectivoATesoro: number;
  saldoReservaApp: number | null;
  observaciones: string;
}

interface Arqueo {
  teorico: number;
  contado: number;
  diferencia: number;
}

export type CierreResult =
  | { ok: true; cierreId: number; arqueoCaja: Arqueo; arqueoReserva: Arqueo | null }
  | { ok: false; error: string };

export async function registrarCierreDia(
  p: CierrePayload,
): Promise<CierreResult> {
  await assertAuthed();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return { ok: false, error: "Fecha inválida." };
  if (!p.cerradoPorId) return { ok: false, error: "Elegí quién cierra el día." };
  for (const v of [p.ventaEfectivo, p.ventaTransferencia, p.efectivoContado]) {
    if (!Number.isFinite(v) || v < 0)
      return { ok: false, error: "Hay montos inválidos." };
  }
  if (!Number.isFinite(p.efectivoATesoro) || p.efectivoATesoro < 0)
    return { ok: false, error: "El monto a pasar al Tesoro es inválido." };

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };
  if (await cierreYaExiste(branch.id, p.fecha))
    return { ok: false, error: "Ya hay un cierre cargado para esa fecha." };

  const { cajaChica, tesoro, reserva } = await cuentas();
  if (!cajaChica || !reserva)
    return { ok: false, error: "Faltan cuentas base. Corré el seed." };

  try {
    const result = await db.transaction(async (tx) => {
      const [cierre] = await tx
        .insert(dailyCloses)
        .values({
          branchId: branch.id,
          fecha: p.fecha,
          ventaEfectivo: money(p.ventaEfectivo),
          ventaTransferencia: money(p.ventaTransferencia),
          efectivoContado: money(p.efectivoContado),
          efectivoATesoro: money(p.efectivoATesoro),
          saldoReservaApp:
            p.saldoReservaApp != null ? money(p.saldoReservaApp) : null,
          observaciones: p.observaciones || null,
          cerradoPor: p.cerradoPorId,
          cerradoEn: new Date(),
        })
        .returning();

      const nuevos: (typeof moneyMovements.$inferInsert)[] = [];
      if (p.ventaEfectivo > 0)
        nuevos.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_efectivo",
          cuentaId: cajaChica.id,
          monto: money(p.ventaEfectivo),
          cierreId: cierre.id,
          descripcion: "Ventas en efectivo",
          usuarioId: p.cerradoPorId,
        });
      if (p.ventaTransferencia > 0)
        nuevos.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_transferencia",
          cuentaId: reserva.id,
          monto: money(p.ventaTransferencia),
          cierreId: cierre.id,
          descripcion: "Ventas por transferencia",
          usuarioId: p.cerradoPorId,
        });
      if (nuevos.length) await tx.insert(moneyMovements).values(nuevos);

      // Enganchar los gastos del día que estaban sueltos.
      await tx
        .update(moneyMovements)
        .set({ cierreId: cierre.id })
        .where(
          and(
            eq(moneyMovements.fecha, p.fecha),
            isNull(moneyMovements.cierreId),
            inArray(moneyMovements.categoria, ["gasto", "compra", "retiro"]),
          ),
        );

      const todos = await tx.select().from(moneyMovements);
      const saldoDe = (accId: number, inicial: string) => {
        let s = Number(inicial);
        for (const m of todos) {
          const monto = Number(m.monto);
          if (m.cuentaId === accId) s += m.tipo === "ingreso" ? monto : -monto;
          if (m.tipo === "transferencia" && m.cuentaDestinoId === accId)
            s += monto;
        }
        return s;
      };

      const cajaTeorico = saldoDe(cajaChica.id, cajaChica.saldoInicial);
      const arqueoCaja: Arqueo = {
        teorico: cajaTeorico,
        contado: p.efectivoContado,
        diferencia: p.efectivoContado - cajaTeorico,
      };

      await tx
        .update(dailyCloses)
        .set({ diferenciaEfectivo: money(arqueoCaja.diferencia) })
        .where(eq(dailyCloses.id, cierre.id));

      await tx.insert(cashCounts).values({
        branchId: branch.id,
        accountId: cajaChica.id,
        fecha: p.fecha,
        momento: "cierre_dia",
        cierreId: cierre.id,
        saldoTeorico: money(arqueoCaja.teorico),
        saldoContado: money(arqueoCaja.contado),
        diferencia: money(arqueoCaja.diferencia),
        usuarioId: p.cerradoPorId,
      });

      if (tesoro && p.efectivoATesoro > 0) {
        await tx.insert(moneyMovements).values({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "transferencia",
          categoria: "deposito_tesoro",
          cuentaId: cajaChica.id,
          cuentaDestinoId: tesoro.id,
          monto: money(p.efectivoATesoro),
          cierreId: cierre.id,
          descripcion: "Barrido de Caja chica al Tesoro",
          usuarioId: p.cerradoPorId,
        });
      }

      let arqueoReserva: Arqueo | null = null;
      if (p.saldoReservaApp != null && Number.isFinite(p.saldoReservaApp)) {
        const rTeorico = saldoDe(reserva.id, reserva.saldoInicial);
        arqueoReserva = {
          teorico: rTeorico,
          contado: p.saldoReservaApp,
          diferencia: p.saldoReservaApp - rTeorico,
        };
        await tx.insert(cashCounts).values({
          branchId: branch.id,
          accountId: reserva.id,
          fecha: p.fecha,
          momento: "cierre_dia",
          cierreId: cierre.id,
          saldoTeorico: money(arqueoReserva.teorico),
          saldoContado: money(arqueoReserva.contado),
          diferencia: money(arqueoReserva.diferencia),
          nota: "Saldo declarado de la Reserva",
          usuarioId: p.cerradoPorId,
        });
      }

      return { cierreId: cierre.id, arqueoCaja, arqueoReserva };
    });

    for (const p2 of ["/", "/cierres", "/cuentas", "/metricas", "/cierre"])
      revalidatePath(p2);

    return { ok: true, ...result };
  } catch (e) {
    console.error("registrarCierreDia", e);
    return { ok: false, error: "No se pudo guardar el cierre. Probá de nuevo." };
  }
}

function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
