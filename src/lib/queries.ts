import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  cashCounts,
  moneyAccounts,
  moneyMovements,
  settings,
  shifts,
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
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.clave, clave));
  return row?.valor ?? null;
}

export type CuentaConSaldo = typeof moneyAccounts.$inferSelect & {
  saldo: number;
};

/** Saldo teórico = saldo inicial + Σ ingresos − Σ egresos ± transferencias. */
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
      if (m.cuentaId === c.id) {
        saldo += m.tipo === "ingreso" ? monto : -monto;
      }
      if (m.tipo === "transferencia" && m.cuentaDestinoId === c.id) {
        saldo += monto;
      }
    }
    return { ...c, saldo };
  });
}

export async function getShiftsDelDia(fecha: string) {
  return db
    .select({
      id: shifts.id,
      turno: shifts.turno,
      totalEfectivo: shifts.totalEfectivo,
      totalTransferencia: shifts.totalTransferencia,
      estado: shifts.estado,
      observaciones: shifts.observaciones,
      vendedor: users.nombre,
    })
    .from(shifts)
    .leftJoin(users, eq(users.id, shifts.vendedorId))
    .where(eq(shifts.fecha, fecha))
    .orderBy(shifts.turno);
}

export async function getMovimientosDelDia(fecha: string) {
  return db
    .select()
    .from(moneyMovements)
    .where(eq(moneyMovements.fecha, fecha))
    .orderBy(moneyMovements.id);
}

export async function getArqueosDelDia(fecha: string) {
  return db
    .select({
      id: cashCounts.id,
      momento: cashCounts.momento,
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

export async function getShiftsRecientes(limit = 40) {
  return db
    .select({
      id: shifts.id,
      fecha: shifts.fecha,
      turno: shifts.turno,
      totalEfectivo: shifts.totalEfectivo,
      totalTransferencia: shifts.totalTransferencia,
      estado: shifts.estado,
      vendedor: users.nombre,
    })
    .from(shifts)
    .leftJoin(users, eq(users.id, shifts.vendedorId))
    .orderBy(desc(shifts.fecha), desc(shifts.id))
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

export async function shiftYaExiste(
  branchId: number,
  fecha: string,
  turno: "manana" | "tarde" | "domingo",
) {
  const [row] = await db
    .select({ id: shifts.id })
    .from(shifts)
    .where(
      and(
        eq(shifts.branchId, branchId),
        eq(shifts.fecha, fecha),
        eq(shifts.turno, turno),
      ),
    );
  return !!row;
}
