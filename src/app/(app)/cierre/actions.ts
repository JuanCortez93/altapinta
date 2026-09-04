"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cashCounts, dailyCloses, moneyAccounts, moneyMovements } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { cierreYaExiste, getBranch } from "@/lib/queries";

const money = (n: number) => n.toFixed(2);

const CATS_MOVIMIENTO = [
  "venta_efectivo",
  "venta_transferencia",
  "gasto",
  "compra",
  "retiro",
] as const;

export interface CierrePayload {
  fecha: string;
  cerradoPorId: number;
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
      ventaEfectivo: number;
      ventaTransferencia: number;
      cajaTeorico: number;
      arqueoCaja: Arqueo | null;
      arqueoReserva: Arqueo | null;
    }
  | { ok: false; error: string };

export async function registrarCierreDia(
  p: CierrePayload,
): Promise<CierreResult> {
  await assertAuthed();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return { ok: false, error: "Fecha inválida." };
  if (!p.cerradoPorId) return { ok: false, error: "Elegí quién cierra el día." };
  if (p.efectivoContado != null && (!Number.isFinite(p.efectivoContado) || p.efectivoContado < 0))
    return { ok: false, error: "El efectivo contado es inválido." };
  if (!Number.isFinite(p.efectivoATesoro) || p.efectivoATesoro < 0)
    return { ok: false, error: "El monto a pasar al Tesoro es inválido." };

  const branch = await getBranch();
  if (!branch) return { ok: false, error: "No hay sucursal cargada." };
  if (await cierreYaExiste(branch.id, p.fecha))
    return { ok: false, error: "Ya hay un cierre cargado para esa fecha." };

  const cuentas = await db.select().from(moneyAccounts);
  const cajaChica = cuentas.find((c) => c.esCajaChica);
  const tesoro = cuentas.find((c) => c.esTesoro);
  const reserva = cuentas.find((c) => c.esReserva);
  if (!cajaChica || !tesoro || !reserva)
    return { ok: false, error: "Faltan cuentas base. Corré el seed." };

  try {
    const result = await db.transaction(async (tx) => {
      const sueltos = await tx
        .select()
        .from(moneyMovements)
        .where(
          and(
            eq(moneyMovements.fecha, p.fecha),
            isNull(moneyMovements.cierreId),
            inArray(moneyMovements.categoria, [...CATS_MOVIMIENTO]),
          ),
        );

      const sumaDe = (cat: string) =>
        sueltos
          .filter((m) => m.categoria === cat)
          .reduce((a, m) => a + Number(m.monto), 0);

      const ventaEfectivo = sumaDe("venta_efectivo");
      const ventaTransferencia = sumaDe("venta_transferencia");

      const [cierre] = await tx
        .insert(dailyCloses)
        .values({
          branchId: branch.id,
          fecha: p.fecha,
          ventaEfectivo: money(ventaEfectivo),
          ventaTransferencia: money(ventaTransferencia),
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

      // Enganchar al cierre todo lo suelto del día (ventas y gastos).
      await tx
        .update(moneyMovements)
        .set({ cierreId: cierre.id })
        .where(
          and(
            eq(moneyMovements.fecha, p.fecha),
            isNull(moneyMovements.cierreId),
            inArray(moneyMovements.categoria, [...CATS_MOVIMIENTO]),
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
        ventaEfectivo,
        ventaTransferencia,
        cajaTeorico,
        arqueoCaja,
        arqueoReserva,
      };
    });

    for (const p2 of ["/", "/cierres", "/cuentas", "/metricas", "/cierre", "/movimiento"])
      revalidatePath(p2);

    return { ok: true, ...result };
  } catch (e) {
    console.error("registrarCierreDia", e);
    return { ok: false, error: "No se pudo guardar el cierre. Probá de nuevo." };
  }
}
