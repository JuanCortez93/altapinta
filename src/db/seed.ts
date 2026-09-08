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
    { nombre: "Reserva", tipo: "digital" as const, esReserva: true },
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

  // ---- Proveedores --------------------------------------------------
  for (const nombre of ["Miguel"]) {
    const [ya] = await db
      .select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.nombre, nombre));
    if (!ya) {
      await db
        .insert(schema.suppliers)
        .values({ nombre, contacto: "Pollo recién faenado" });
      console.log("+ proveedor:", nombre);
    }
  }

  // ---- Catálogo de productos ---------------------------------------
  const catId = new Map<string, number>();
  for (const c of await db.select().from(schema.productCategories)) {
    catId.set(c.nombre, c.id);
  }
  const K = "kg" as const;
  const U = "unidad" as const;
  const C = "cajon" as const;
  type Pres = typeof K | typeof U | typeof C;
  const productos: {
    nombre: string;
    categoria: string;
    unidad: Pres;
    presentaciones?: Pres[];
  }[] = [
    { nombre: "Pollo entero", categoria: "Pollo", unidad: C, presentaciones: [C, K, U] },
    { nombre: "Pata muslo", categoria: "Pollo", unidad: K, presentaciones: [K, C] },
    { nombre: "Filet de pollo", categoria: "Pollo", unidad: K, presentaciones: [K, C] },
    { nombre: "Alitas", categoria: "Pollo", unidad: K, presentaciones: [K, C] },
    { nombre: "Merluza", categoria: "Pescado", unidad: K, presentaciones: [K, C] },
    { nombre: "Medallones de pollo", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Medallones de pollo JyQ", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Medallones de merluza", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Medallones de merluza EyQ", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Patitas de pollo", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Patitas de pollo JyQ", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Nuggets de pollo", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Bastones de muzzarella", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Bocaditos de muzzarella", categoria: "Rebozados", unidad: C, presentaciones: [C, U] },
    { nombre: "Milanesa de soja", categoria: "Milanesas de soja", unidad: C, presentaciones: [C, U] },
  ];
  for (const p of productos) {
    const [ya] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.nombre, p.nombre));
    if (!ya) {
      await db.insert(schema.products).values({
        nombre: p.nombre,
        categoriaId: catId.get(p.categoria) ?? null,
        unidad: p.unidad,
        presentaciones: p.presentaciones ?? null,
      });
      console.log("+ producto:", p.nombre);
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
