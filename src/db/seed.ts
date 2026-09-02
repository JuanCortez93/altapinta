/**
 * Seed inicial — Alta Pinta.
 * Corré:  npm run db:seed
 *
 * Idempotente por nombre/clave: si ya existe la fila, no la duplica.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error("Falta DATABASE_URL / DIRECT_URL (definila en .env.local)");
}

const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema });

async function main() {
  // ---- Sucursal -------------------------------------------------------
  let [branch] = await db
    .select()
    .from(schema.branches)
    .where(eq(schema.branches.nombre, "Alta Pinta"));
  if (!branch) {
    [branch] = await db
      .insert(schema.branches)
      .values({ nombre: "Alta Pinta" })
      .returning();
    console.log("+ sucursal:", branch.nombre);
  }

  // ---- Usuarios -----------------------------------------------------
  const usuarios = [
    { nombre: "Esequiel", rol: "encargado" as const },
    { nombre: "Stella", rol: "encargado" as const },
    { nombre: "Graciela", rol: "vendedor" as const },
  ];
  for (const u of usuarios) {
    const [ya] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.nombre, u.nombre));
    if (!ya) {
      await db.insert(schema.users).values(u);
      console.log("+ usuario:", u.nombre);
    }
  }

  // ---- Cuentas de dinero -----------------------------------------------
  const cuentas = [
    { nombre: "Tesoro", tipo: "efectivo" as const, esTesoro: true },
    { nombre: "Caja chica", tipo: "efectivo" as const, esCajaChica: true },
    { nombre: "Mercado Pago", tipo: "digital" as const },
    { nombre: "Provisión de sueldos", tipo: "efectivo" as const },
  ];
  for (const c of cuentas) {
    const [ya] = await db
      .select()
      .from(schema.moneyAccounts)
      .where(eq(schema.moneyAccounts.nombre, c.nombre));
    if (!ya) {
      await db.insert(schema.moneyAccounts).values(c);
      console.log("+ cuenta:", c.nombre);
    }
  }

  // ---- Parámetros ----------------------------------------------------
  const params = [
    {
      clave: "fondo_fijo_caja_chica",
      valor: "0",
      descripcion: "Monto que queda en Caja chica al cierre; el resto va al Tesoro.",
    },
    {
      clave: "conteo_a_ciegas",
      valor: "true",
      descripcion: "Ocultar el stock teórico en los checklists hasta cargar lo contado.",
    },
    {
      clave: "provision_sueldos_diaria",
      valor: "0",
      descripcion:
        "Monto que se aparta por día a la cuenta Provisión de sueldos (default del formulario, editable).",
    },
  ];
  for (const p of params) {
    const [ya] = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.clave, p.clave));
    if (!ya) {
      await db.insert(schema.settings).values(p);
      console.log("+ parámetro:", p.clave);
    }
  }

  // ---- Categorías de producto ----------------------------------------
  const categorias = [
    "Pollo",
    "Pescado",
    "Rebozados",
    "Milanesas de soja",
    "Elaborados",
  ];
  for (let i = 0; i < categorias.length; i++) {
    const nombre = categorias[i];
    const [ya] = await db
      .select()
      .from(schema.productCategories)
      .where(eq(schema.productCategories.nombre, nombre));
    if (!ya) {
      await db
        .insert(schema.productCategories)
        .values({ nombre, orden: i });
      console.log("+ categoría:", nombre);
    }
  }

  console.log("\nSeed listo.");
  await client.end();
}

main().catch(async (e) => {
  console.error(e);
  await client.end();
  process.exit(1);
});
