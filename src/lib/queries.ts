import "server-only";
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  branches,
  cashCounts,
  dailyCloses,
  moneyAccounts,
  moneyMovements,
  productCategories,
  products,
  purchaseItems,
  purchases,
  settings,
  suppliers,
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

export async function getProductosParaCompra() {
  return db
    .select({
      id: products.id,
      nombre: products.nombre,
      unidad: products.unidad,
      presentaciones: products.presentaciones,
      categoria: productCategories.nombre,
      categoriaOrden: productCategories.orden,
    })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoriaId))
    .where(eq(products.activo, true))
    .orderBy(productCategories.orden, products.nombre);
}

export async function getProveedores() {
  return db
    .select({ id: suppliers.id, nombre: suppliers.nombre })
    .from(suppliers)
    .where(eq(suppliers.activo, true))
    .orderBy(suppliers.nombre);
}

export async function getComprasRecientes(limit = 30) {
  const rows = await db
    .select({
      id: purchases.id,
      fecha: purchases.fechaCompra,
      total: purchases.total,
      proveedor: suppliers.nombre,
      proveedorTexto: purchases.proveedorTexto,
      cuenta: moneyAccounts.nombre,
      items: sql<number>`count(${purchaseItems.id})`,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(suppliers.id, purchases.proveedorId))
    .leftJoin(moneyAccounts, eq(moneyAccounts.id, purchases.cuentaPagoId))
    .leftJoin(purchaseItems, eq(purchaseItems.purchaseId, purchases.id))
    .groupBy(
      purchases.id,
      suppliers.nombre,
      purchases.proveedorTexto,
      moneyAccounts.nombre,
    )
    .orderBy(desc(purchases.fechaCompra), desc(purchases.id))
    .limit(limit);
  return rows;
}

/** Los cierres de una fecha (hasta dos: mañana y tarde, o uno el domingo). */
export async function getCierresDelDia(fecha: string) {
  return db
    .select()
    .from(dailyCloses)
    .where(eq(dailyCloses.fecha, fecha))
    .orderBy(dailyCloses.id);
}

export async function cierreYaExiste(
  branchId: number,
  fecha: string,
  turno: "manana" | "tarde" | "domingo",
) {
  const [row] = await db
    .select({ id: dailyCloses.id })
    .from(dailyCloses)
    .where(
      and(
        eq(dailyCloses.branchId, branchId),
        eq(dailyCloses.fecha, fecha),
        eq(dailyCloses.turno, turno),
      ),
    );
  return !!row;
}

const CATS_SALIDA = ["gasto", "compra", "retiro"] as const;

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
 * Gastos sueltos de una fecha (todavía no enganchados a un cierre de turno).
 * Editables/borrables hasta que se cierra el turno que los incluye.
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
        inArray(moneyMovements.categoria, [...CATS_SALIDA]),
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
      turno: dailyCloses.turno,
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

/** Ventas por día para las métricas (suma de los turnos de cada fecha). */
export async function getVentasPorDia(desde: string) {
  return db
    .select({
      fecha: dailyCloses.fecha,
      efectivo: sql<string>`sum(${dailyCloses.ventaEfectivo})`,
      transferencia: sql<string>`sum(${dailyCloses.ventaTransferencia})`,
      diferencia: sql<string>`sum(coalesce(${dailyCloses.diferenciaEfectivo}, 0))`,
    })
    .from(dailyCloses)
    .where(gte(dailyCloses.fecha, desde))
    .groupBy(dailyCloses.fecha)
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
