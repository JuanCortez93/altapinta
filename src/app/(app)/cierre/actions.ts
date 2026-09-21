"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cashCounts, dailyCloses, moneyAccounts, moneyMovements } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { cierreYaExiste, getBranch } from "@/lib/queries";
import { fmtARS } from "@/lib/format";

const money = (n: number) => n.toFixed(2);

export type Turno = "manana" | "tarde" | "domingo";

export interface CierrePayload {
  fecha: string;
  turno: Turno;
  cerradoPorId: number;
  /** Efectivo contado en Caja chica al final del turno. De acá sale la venta en efectivo. */
  efectivoContado: number;
  /** Venta en transferencia: se declara directo (sale del Mercado Pago / banco). */
  ventaTransferencia: number;
  /** ids de gastos sueltos que corresponden a este turno. */
  gastoIds: number[];
  /**
   * Cuánto se deja en Caja chica para el próximo turno (el fondo del día
   * siguiente). Vacío = se deja todo, no se manda nada al Tesoro. El monto
   * que se barre al Tesoro se calcula solo: efectivoContado − dejarEnCaja.
   */
  dejarEnCaja: number | null;
  saldoReservaApp: number | null;
  observaciones: string;
}

interface Arqueo {
  teorico: number;
  contado: number;
  diferencia: number;
}

export type CierreResult =
  | {
      ok: true;
      cierreId: number;
      turno: Turno;
      ventaEfectivo: number;
      ventaTransferencia: number;
      efectivoContado: number;
      efectivoATesoro: number;
      dejaEnCaja: number;
      arqueoReserva: Arqueo | null;
    }
  | { ok: false; error: string };

const LABEL_TURNO: Record<Turno, string> = {
  manana: "mañana",
  tarde: "tarde",
  domingo: "domingo",
};

class CierreValidationError extends Error {}

function saldoDe(
  movs: (typeof moneyMovements.$inferSelect)[],
  accId: number,
  inicial: string,
) {
  let s = Number(inicial);
  for (const m of movs) {
    const monto = Number(m.monto);
    if (m.cuentaId === accId) s += m.tipo === "ingreso" ? monto : -monto;
    if (m.tipo === "transferencia" && m.cuentaDestinoId === accId) s += monto;
  }
  return s;
}

export async function registrarCierreTurno(
  p: CierrePayload,
): Promise<CierreResult> {
  await assertAuthed();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return { ok: false, error: "Fecha inválida." };
  if (!LABEL_TURNO[p.turno]) return { ok: false, error: "Elegí el turno." };
  if (!p.cerradoPorId) return { ok: false, error: "Elegí quién cierra el turno." };
  if (!Number.isFinite(p.efectivoContado) || p.efectivoContado < 0)
    return { ok: false, error: "El efectivo contado es inválido." };
  if (!Number.isFinite(p.ventaTransferencia) || p.ventaTransferencia < 0)
    return { ok: false, error: "La venta por transferencia es inválida." };
  if (
    p.dejarEnCaja != null &&
    (!Number.isFinite(p.dejarEnCaja) || p.dejarEnCaja < 0)
  )
    return { ok: false, error: "El monto a dejar en Caja chica es inválido." };

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };
  if (await cierreYaExiste(branch.id, p.fecha, p.turno))
    return {
      ok: false,
      error: `Ya hay un cierre de ${LABEL_TURNO[p.turno]} para esa fecha.`,
    };

  const cuentas = await db.select().from(moneyAccounts);
  const cajaChica = cuentas.find((c) => c.esCajaChica);
  const tesoro = cuentas.find((c) => c.esTesoro);
  const reserva = cuentas.find((c) => c.esReserva);
  if (!cajaChica || !tesoro || !reserva)
    return { ok: false, error: "Faltan cuentas base. Corré el seed." };

  try {
    const result = await db.transaction(async (tx) => {
      // Cuánto hay en Caja chica antes de procesar este cierre. Los gastos
      // del turno ya están posteados a la cuenta (se descuentan apenas se
      // cargan, tengan o no cierre_id todavía), así que esto ya viene neto.
      const antes = await tx.select().from(moneyMovements);
      const cajaChicaAntes = saldoDe(antes, cajaChica.id, cajaChica.saldoInicial);
      const ventaEfectivo =
        Math.round((p.efectivoContado - cajaChicaAntes) * 100) / 100;

      if (ventaEfectivo < 0) {
        throw new CierreValidationError(
          `El efectivo contado (${fmtARS(p.efectivoContado)}) es menor a lo que ya había en Caja chica (${fmtARS(cajaChicaAntes)}) antes de este turno. Revisá los gastos cargados o el conteo.`,
        );
      }

      // El monto que se manda al Tesoro se calcula, no se tipea: así el
      // saldo que queda en Caja chica es siempre exactamente "dejarEnCaja",
      // sin depender de que nadie reste bien a mano.
      const dejaEnCaja = p.dejarEnCaja ?? p.efectivoContado;
      const efectivoATesoro =
        Math.round((p.efectivoContado - dejaEnCaja) * 100) / 100;

      if (efectivoATesoro < 0) {
        throw new CierreValidationError(
          `Dejar ${fmtARS(dejaEnCaja)} en Caja chica es más de lo que contaste (${fmtARS(p.efectivoContado)}).`,
        );
      }

      const [cierre] = await tx
        .insert(dailyCloses)
        .values({
          branchId: branch.id,
          fecha: p.fecha,
          turno: p.turno,
          ventaEfectivo: money(ventaEfectivo),
          ventaTransferencia: money(p.ventaTransferencia),
          efectivoContado: money(p.efectivoContado),
          efectivoATesoro: money(efectivoATesoro),
          saldoReservaApp:
            p.saldoReservaApp != null ? money(p.saldoReservaApp) : null,
          observaciones: p.observaciones || null,
          cerradoPor: p.cerradoPorId,
          cerradoEn: new Date(),
        })
        .returning();

      // Enganchar los gastos elegidos para este turno.
      if (p.gastoIds.length) {
        await tx
          .update(moneyMovements)
          .set({ cierreId: cierre.id })
          .where(
            and(
              inArray(moneyMovements.id, p.gastoIds),
              isNull(moneyMovements.cierreId),
              inArray(moneyMovements.categoria, ["gasto", "compra", "retiro"]),
            ),
          );
      }

      const ventas: (typeof moneyMovements.$inferInsert)[] = [];
      if (ventaEfectivo > 0)
        ventas.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_efectivo",
          cuentaId: cajaChica.id,
          monto: money(ventaEfectivo),
          cierreId: cierre.id,
          descripcion: `Ventas ${LABEL_TURNO[p.turno]} en efectivo`,
          usuarioId: p.cerradoPorId,
        });
      if (p.ventaTransferencia > 0)
        ventas.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_transferencia",
          cuentaId: reserva.id,
          monto: money(p.ventaTransferencia),
          cierreId: cierre.id,
          descripcion: `Ventas ${LABEL_TURNO[p.turno]} por transferencia`,
          usuarioId: p.cerradoPorId,
        });
      if (ventas.length) await tx.insert(moneyMovements).values(ventas);

      if (efectivoATesoro > 0) {
        await tx.insert(moneyMovements).values({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "transferencia",
          categoria: "deposito_tesoro",
          cuentaId: cajaChica.id,
          cuentaDestinoId: tesoro.id,
          monto: money(efectivoATesoro),
          cierreId: cierre.id,
          descripcion: "Barrido de Caja chica al Tesoro",
          usuarioId: p.cerradoPorId,
        });
      }

      let arqueoReserva: Arqueo | null = null;
      if (p.saldoReservaApp != null) {
        const todos = await tx.select().from(moneyMovements);
        const rTeorico = saldoDe(todos, reserva.id, reserva.saldoInicial);
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

      return {
        cierreId: cierre.id,
        turno: p.turno,
        ventaEfectivo,
        ventaTransferencia: p.ventaTransferencia,
        efectivoContado: p.efectivoContado,
        efectivoATesoro,
        dejaEnCaja,
        arqueoReserva,
      };
    });

    for (const path of [
      "/",
      "/cierres",
      "/cuentas",
      "/metricas",
      "/cierre",
      "/movimiento",
    ])
      revalidatePath(path);

    return { ok: true, ...result };
  } catch (e) {
    if (e instanceof CierreValidationError)
      return { ok: false, error: e.message };
    console.error("registrarCierreTurno", e);
    return { ok: false, error: "No se pudo guardar el cierre. Probá de nuevo." };
  }
}

export type BorrarCierreResult = { ok: true } | { ok: false; error: string };

/**
 * Borra un cierre por error de carga. Las ventas y el barrido al Tesoro que
 * generó se eliminan; los gastos/compras/retiros que tenía enganchados
 * vuelven a quedar sueltos (se pueden re-enganchar a otro cierre).
 */
export async function borrarCierre(cierreId: number): Promise<BorrarCierreResult> {
  await assertAuthed();

  try {
    await db.transaction(async (tx) => {
      const [cierre] = await tx
        .select({ id: dailyCloses.id })
        .from(dailyCloses)
        .where(eq(dailyCloses.id, cierreId));
      if (!cierre) throw new CierreValidationError("Ese cierre ya no existe.");

      // Los gastos/compras/retiros vuelven a quedar sueltos.
      await tx
        .update(moneyMovements)
        .set({ cierreId: null })
        .where(
          and(
            eq(moneyMovements.cierreId, cierreId),
            inArray(moneyMovements.categoria, ["gasto", "compra", "retiro"]),
          ),
        );

      // Lo que queda enganchado (ventas, barrido al Tesoro) era propio de
      // este cierre: se borra.
      await tx
        .delete(moneyMovements)
        .where(eq(moneyMovements.cierreId, cierreId));

      await tx.delete(cashCounts).where(eq(cashCounts.cierreId, cierreId));
      await tx.delete(dailyCloses).where(eq(dailyCloses.id, cierreId));
    });

    for (const path of [
      "/",
      "/cierres",
      "/cuentas",
      "/metricas",
      "/cierre",
      "/movimiento",
    ])
      revalidatePath(path);

    return { ok: true };
  } catch (e) {
    if (e instanceof CierreValidationError)
      return { ok: false, error: e.message };
    console.error("borrarCierre", e);
    return { ok: false, error: "No se pudo borrar el cierre. Probá de nuevo." };
  }
}
