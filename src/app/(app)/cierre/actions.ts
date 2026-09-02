"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cashCounts, moneyAccounts, moneyMovements, shifts } from "@/db/schema";
import { assertAuthed } from "@/lib/session";
import { shiftYaExiste, getBranch } from "@/lib/queries";
import type { SalidaCategoria } from "@/lib/gastos";

export interface GastoInput {
  categoria: SalidaCategoria;
  detalle: string;
  monto: number;
  cuenta: "caja_chica" | "mercado_pago";
}

export interface CierrePayload {
  fecha: string;
  turno: "manana" | "tarde" | "domingo";
  adminId: number;
  vendedorId: number;
  ventaEfectivo: number;
  ventaTransferencia: number;
  gastos: GastoInput[];
  efectivoContado: number;
  notaArqueo: string;
  esCierreDia: boolean;
  efectivoATesoro: number;
  saldoMpApp: number | null;
  observaciones: string;
}

interface Arqueo {
  teorico: number;
  contado: number;
  diferencia: number;
}

export type CierreResult =
  | { ok: true; shiftId: number; arqueoCaja: Arqueo; arqueoMp: Arqueo | null }
  | { ok: false; error: string };

const MOMENTO = {
  manana: "cierre_manana",
  tarde: "cierre_tarde",
  domingo: "cierre_domingo",
} as const;

const money = (n: number) => n.toFixed(2);

export async function registrarCierre(
  p: CierrePayload,
): Promise<CierreResult> {
  await assertAuthed();

  // ---- validación -------------------------------------------------
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) return err("Fecha inválida.");
  if (!MOMENTO[p.turno]) return err("Turno inválido.");
  if (!p.adminId) return err("Elegí quién cierra el turno.");
  if (!p.vendedorId) return err("Elegí quién atendió el turno.");
  for (const v of [p.ventaEfectivo, p.ventaTransferencia, p.efectivoContado]) {
    if (!Number.isFinite(v) || v < 0) return err("Hay montos inválidos.");
  }
  for (const g of p.gastos) {
    if (!Number.isFinite(g.monto) || g.monto <= 0)
      return err(`El gasto "${g.detalle || g.categoria}" no tiene un monto válido.`);
  }
  if (p.esCierreDia && (!Number.isFinite(p.efectivoATesoro) || p.efectivoATesoro < 0))
    return err("El monto a pasar al Tesoro es inválido.");

  const branch = await getBranch();
  if (!branch) return err("No hay sucursal cargada. Corré el seed.");

  if (await shiftYaExiste(branch.id, p.fecha, p.turno))
    return err("Ya hay un cierre cargado para ese turno y esa fecha.");

  // ---- cuentas base ---------------------------------------------------
  const cuentas = await db.select().from(moneyAccounts);
  const cajaChica = cuentas.find((c) => c.esCajaChica);
  const tesoro = cuentas.find((c) => c.esTesoro);
  const mp =
    cuentas.find((c) => c.nombre === "Mercado Pago") ??
    cuentas.find((c) => c.tipo === "digital");
  const provision = cuentas.find((c) => c.nombre === "Provisión de sueldos");

  if (!cajaChica || !mp)
    return err("Faltan cuentas base (Caja chica / Mercado Pago). Corré el seed.");
  if (p.gastos.some((g) => g.categoria === "provision_sueldo") && !provision)
    return err("Falta la cuenta Provisión de sueldos. Corré el seed.");

  try {
    const result = await db.transaction(async (tx) => {
      const [shift] = await tx
        .insert(shifts)
        .values({
          branchId: branch.id,
          fecha: p.fecha,
          turno: p.turno,
          vendedorId: p.vendedorId,
          totalEfectivo: money(p.ventaEfectivo),
          totalTransferencia: money(p.ventaTransferencia),
          observaciones: p.observaciones || null,
          estado: "cerrado",
          cerradoPor: p.adminId,
          cerradoEn: new Date(),
        })
        .returning();

      const movs: (typeof moneyMovements.$inferInsert)[] = [];

      if (p.ventaEfectivo > 0) {
        movs.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_efectivo",
          cuentaId: cajaChica.id,
          monto: money(p.ventaEfectivo),
          shiftId: shift.id,
          descripcion: "Ventas en efectivo",
          usuarioId: p.adminId,
        });
      }
      if (p.ventaTransferencia > 0) {
        movs.push({
          branchId: branch.id,
          fecha: p.fecha,
          tipo: "ingreso",
          categoria: "venta_transferencia",
          cuentaId: mp.id,
          monto: money(p.ventaTransferencia),
          shiftId: shift.id,
          descripcion: "Ventas por transferencia",
          usuarioId: p.adminId,
        });
      }

      for (const g of p.gastos) {
        if (g.categoria === "provision_sueldo") {
          movs.push({
            branchId: branch.id,
            fecha: p.fecha,
            tipo: "transferencia",
            categoria: "provision_sueldo",
            cuentaId: cajaChica.id,
            cuentaDestinoId: provision!.id,
            monto: money(g.monto),
            shiftId: shift.id,
            descripcion: g.detalle || "Provisión de sueldos",
            usuarioId: p.adminId,
          });
        } else {
          const cuentaId =
            g.cuenta === "mercado_pago" ? mp.id : cajaChica.id;
          movs.push({
            branchId: branch.id,
            fecha: p.fecha,
            tipo: "egreso",
            categoria: "gasto",
            gastoCategoria: g.categoria,
            cuentaId,
            monto: money(g.monto),
            shiftId: shift.id,
            descripcion: g.detalle || null,
            usuarioId: p.adminId,
          });
        }
      }

      if (movs.length) await tx.insert(moneyMovements).values(movs);

      // saldos teóricos tras ventas y gastos (antes del barrido al Tesoro)
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

      await tx.insert(cashCounts).values({
        branchId: branch.id,
        accountId: cajaChica.id,
        fecha: p.fecha,
        momento: MOMENTO[p.turno],
        shiftId: shift.id,
        saldoTeorico: money(arqueoCaja.teorico),
        saldoContado: money(arqueoCaja.contado),
        diferencia: money(arqueoCaja.diferencia),
        nota: p.notaArqueo || null,
        usuarioId: p.adminId,
      });

      let arqueoMp: Arqueo | null = null;

      if (p.esCierreDia) {
        if (tesoro && p.efectivoATesoro > 0) {
          await tx.insert(moneyMovements).values({
            branchId: branch.id,
            fecha: p.fecha,
            tipo: "transferencia",
            categoria: "deposito_tesoro",
            cuentaId: cajaChica.id,
            cuentaDestinoId: tesoro.id,
            monto: money(p.efectivoATesoro),
            shiftId: shift.id,
            descripcion: "Barrido de Caja chica al Tesoro",
            usuarioId: p.adminId,
          });
        }

        if (p.saldoMpApp != null && Number.isFinite(p.saldoMpApp)) {
          const mpTeorico = saldoDe(mp.id, mp.saldoInicial);
          arqueoMp = {
            teorico: mpTeorico,
            contado: p.saldoMpApp,
            diferencia: p.saldoMpApp - mpTeorico,
          };
          await tx.insert(cashCounts).values({
            branchId: branch.id,
            accountId: mp.id,
            fecha: p.fecha,
            momento: MOMENTO[p.turno],
            shiftId: shift.id,
            saldoTeorico: money(arqueoMp.teorico),
            saldoContado: money(arqueoMp.contado),
            diferencia: money(arqueoMp.diferencia),
            nota: "Saldo declarado de la app de Mercado Pago",
            usuarioId: p.adminId,
          });
        }
      }

      return { shiftId: shift.id, arqueoCaja, arqueoMp };
    });

    revalidatePath("/");
    revalidatePath("/cierres");
    revalidatePath("/cuentas");

    return { ok: true, ...result };
  } catch (e) {
    console.error("registrarCierre", e);
    return err("No se pudo guardar el cierre. Probá de nuevo.");
  }
}

function err(error: string): CierreResult {
  return { ok: false, error };
}
