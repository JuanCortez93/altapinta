import "server-only";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  cashCounts,
  dailyCloses,
  moneyAccounts,
  moneyMovements,
  settings,
  users,
} from "@/db/schema";

export async function getBranch() {
  const [b] = await db
    .select()
    .from(branches)
    .where(eq(branches.activo, true))
    .orderBy(branches.id)
    .limit(1);
  return b;
}

export async function getUsers() {
  return db
    .select()
    .from(users)
    .where(eq(users.activo, true))
    .orderBy(users.nombre);
}

export async function getSetting(clave: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.clave, clave));
  return row?.valor ?? null;
}

export type CuentaConSaldo = typeof moneyAccounts.$inferSelect & { saldo: number };

/** Saldo = saldo inicial + Σ ingresos − Σ egresos ± transferencias. */
export async function getCuentasConSaldo(): Promise<CuentaConSaldo[]> {
  const cuentas = await db
    .select()
    .from(moneyAccounts)
    .where(eq(moneyAccounts.activo, true))
    .orderBy(moneyAccounts.id);
  const movs = await db.select().from(moneyMovements);

  return cuentas.map((c) => {
    let saldo = Number(c.saldoInicial);
    for (const m of movs) {
      const monto = Number(m.monto);
      if (m.cuentaId === c.id) saldo += m.tipo === "ingreso" ? monto : -monto;
      if (m.tipo === "transferencia" && m.cuentaDestinoId === c.id) saldo += monto;
    }
    return { ...c, saldo };
  });
}

/** ids de cuentas que ya tienen cargado su saldo inicial (fondo_inicial). */
export async function getCuentasInicializadas(): Promise<Set<number>> {
  const rows = await db
    .select({ cuentaId: moneyMovements.cuentaId })
    .from(moneyMovements)
    .where(eq(moneyMovements.categoria, "fondo_inicial"));
  return new Set(rows.map((r) => r.cuentaId));
}

export async function getCierreDelDia(fecha: string) {
  const [c] = await db
    .select()
    .from(dailyCloses)
    .where(eq(dailyCloses.fecha, fecha));
  return c ?? null;
}

export async function cierreYaExiste(branchId: number, fecha: string) {
  const [row] = await db
    .select({ id: dailyCloses.id })
    .from(dailyCloses)
    .where(
      and(eq(dailyCloses.branchId, branchId), eq(dailyCloses.fecha, fecha)),
    );
  return !!row;
}

const CATS_SALIDA = ["gasto", "compra", "retiro"] as const;
const CATS_MOVIMIENTO = [
  "venta_efectivo",
  "venta_transferencia",
  "gasto",
  "compra",
  "retiro",
] as const;

/** Gastos / compras / retiros cargados para una fecha (para el dashboard). */
export async function getGastosDelDia(fecha: string) {
  return db
    .select({
      id: moneyMovements.id,
      categoria: moneyMovements.categoria,
      gastoCategoria: moneyMovements.gastoCategoria,
      monto: moneyMovements.monto,
      descripcion: moneyMovements.descripcion,
      cuentaId: moneyMovements.cuentaId,
      cuenta: moneyAccounts.nombre,
      cierreId: moneyMovements.cierreId,
    })
    .from(moneyMovements)
    .leftJoin(moneyAccounts, eq(moneyAccounts.id, moneyMovements.cuentaId))
    .where(
      and(
        eq(moneyMovements.fecha, fecha),
        inArray(moneyMovements.categoria, [...CATS_SALIDA]),
      ),
    )
    .orderBy(moneyMovements.id);
}

/**
 * Ventas y gastos sueltos de una fecha (todavía no enganchados a un cierre).
 * Editables/borrables mientras el día no se cerró.
 */
export async function getMovimientosSueltosDelDia(fecha: string) {
  return db
    .select({
      id: moneyMovements.id,
      tipo: moneyMovements.tipo,
      categoria: moneyMovements.categoria,
      gastoCategoria: moneyMovements.gastoCategoria,
      monto: moneyMovements.monto,
      descripcion: moneyMovements.descripcion,
      cuenta: moneyAccounts.nombre,
      cierreId: moneyMovements.cierreId,
    })
    .from(moneyMovements)
    .leftJoin(moneyAccounts, eq(moneyAccounts.id, moneyMovements.cuentaId))
    .where(
      and(
        eq(moneyMovements.fecha, fecha),
        isNull(moneyMovements.cierreId),
        inArray(moneyMovements.categoria, [...CATS_MOVIMIENTO]),
      ),
    )
    .orderBy(moneyMovements.id);
}

export async function getArqueosDelDia(fecha: string) {
  return db
    .select({
      id: cashCounts.id,
      saldoTeorico: cashCounts.saldoTeorico,
      saldoContado: cashCounts.saldoContado,
      diferencia: cashCounts.diferencia,
      nota: cashCounts.nota,
      cuenta: moneyAccounts.nombre,
    })
    .from(cashCounts)
    .leftJoin(moneyAccounts, eq(moneyAccounts.id, cashCounts.accountId))
    .where(eq(cashCounts.fecha, fecha))
    .orderBy(cashCounts.id);
}

export async function getCierresRecientes(limit = 60) {
  return db
    .select({
      id: dailyCloses.id,
      fecha: dailyCloses.fecha,
      ventaEfectivo: dailyCloses.ventaEfectivo,
      ventaTransferencia: dailyCloses.ventaTransferencia,
      diferenciaEfectivo: dailyCloses.diferenciaEfectivo,
      origen: dailyCloses.origen,
      cerradoPor: users.nombre,
    })
    .from(dailyCloses)
    .leftJoin(users, eq(users.id, dailyCloses.cerradoPor))
    .orderBy(desc(dailyCloses.fecha), desc(dailyCloses.id))
    .limit(limit);
}

export async function getMovimientosRecientes(limit = 60) {
  return db
    .select({
      id: moneyMovements.id,
      fecha: moneyMovements.fecha,
      tipo: moneyMovements.tipo,
      categoria: moneyMovements.categoria,
      gastoCategoria: moneyMovements.gastoCategoria,
      monto: moneyMovements.monto,
      descripcion: moneyMovements.descripcion,
      cuenta: moneyAccounts.nombre,
    })
    .from(moneyMovements)
    .leftJoin(moneyAccounts, eq(moneyAccounts.id, moneyMovements.cuentaId))
    .orderBy(desc(moneyMovements.id))
    .limit(limit);
}

/** Ventas por día para las métricas. */
export async function getVentasPorDia(desde: string) {
  return db
    .select({
      fecha: dailyCloses.fecha,
      efectivo: dailyCloses.ventaEfectivo,
      transferencia: dailyCloses.ventaTransferencia,
      diferencia: dailyCloses.diferenciaEfectivo,
    })
    .from(dailyCloses)
    .where(gte(dailyCloses.fecha, desde))
    .orderBy(desc(dailyCloses.fecha));
}

/** Total de salidas por categoría desde una fecha. */
export async function getGastosPorCategoria(desde: string) {
  const rows = await db
    .select({
      categoria: moneyMovements.categoria,
      gastoCategoria: moneyMovements.gastoCategoria,
      total: sql<string>`sum(${moneyMovements.monto})`,
    })
    .from(moneyMovements)
    .where(
      and(
        gte(moneyMovements.fecha, desde),
        inArray(moneyMovements.categoria, [...CATS_SALIDA]),
      ),
    )
    .groupBy(moneyMovements.categoria, moneyMovements.gastoCategoria);
  return rows;
}
