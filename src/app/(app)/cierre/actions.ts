"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cashCounts, dailyCloses, moneyAccounts, moneyMovements } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { cierreYaExiste, getBranch } from "@/lib/queries";

const money = (n: number) => n.toFixed(2);

export type Turno = "manana" | "tarde" | "domingo";

export interface CierrePayload {
  fecha: string;
  turno: Turno;
  cerradoPorId: number;
  /** Venta bruta del turno. */
  ventaEfectivo: number;
  ventaTransferencia: number;
  /** ids de gastos sueltos que corresponden a este turno. */
  gastoIds: number[];
  /** Conteo físico de Caja chica. Opcional: si no se carga, no se guarda arqueo. */
  efectivoContado: number | null;
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
  | {
      ok: true;
      cierreId: number;
      turno: Turno;
      ventaEfectivo: number;
      ventaTransferencia: number;
      cajaTeorico: number;
      arqueoCaja: Arqueo | null;
      arqueoReserva: Arqueo | null;
    }
  | { ok: false; error: string };

const LABEL_TURNO: Record<Turno, string> = {
  manana: "mañana",
  tarde: "tarde",
  domingo: "domingo",
};

export async function registrarCierreTurno(
  p: CierrePayload,
): Promise<CierreResult> {
  await assertAuthed();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return { ok: false, error: "Fecha inválida." };
  if (!LABEL_TURNO[p.turno]) return { ok: false, error: "Elegí el turno." };
  if (!p.cerradoPorId) return { ok: false, error: "Elegí quién cierra el turno." };
  for (const v of [p.ventaEfectivo, p.ventaTransferencia]) {
    if (!Number.isFinite(v) || v < 0)
      return { ok: false, error: "Las ventas tienen un monto inválido." };
  }
  if (
    p.efectivoContado != null &&
    (!Number.isFinite(p.efectivoContado) || p.efectivoContado < 0)
  )
    return { ok: false, error: "El efectivo contado es inválido." };
  if (!Number.isFinite(p.efectivoATesoro) || p.efectivoATesoro < 0)
    return { ok: false, error: "El monto a pasar al Tesoro es inválido." };

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
      const [cierre] = await tx
        .insert(dailyCloses)
        .values({
          branchId: branch.id,
          fecha: p.fecha,
          turno: p.turno,
          ventaEfectivo: money(p.ventaEfectivo),
          ventaTransferencia: money(p.ventaTransferencia),
          efectivoContado:
            p.efectivoContado != null ? money(p.efectivoContado) : null,
          efectivoATesoro: money(p.efectivoATesoro),
          saldoReservaApp:
            p.saldoReservaApp != null ? money(p.saldoReservaApp) : null,
          observaciones: p.observaciones || null,
          cerradoPor: p.cerradoPorId,
          cerradoEn: new Date(),
        })
        .returning();

      // Ventas del turno, como movimientos enganchados al cierre.
      const ventas: (typeof moneyMovements.$inferInsert)[] = [];
      if (p.ventaEfectivo > 0)
        ventas.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_efectivo",
          cuentaId: cajaChica.id,
          monto: money(p.ventaEfectivo),
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

      let arqueoCaja: Arqueo | null = null;
      if (p.efectivoContado != null) {
        arqueoCaja = {
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
      }

      if (p.efectivoATesoro > 0) {
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
      if (p.saldoReservaApp != null) {
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

      return {
        cierreId: cierre.id,
        turno: p.turno,
        ventaEfectivo: p.ventaEfectivo,
        ventaTransferencia: p.ventaTransferencia,
        cajaTeorico,
        arqueoCaja,
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
    console.error("registrarCierreTurno", e);
    return { ok: false, error: "No se pudo guardar el cierre. Probá de nuevo." };
  }
}
