import Link from "next/link";
import {
  getUsers,
  getCierreDelDia,
  getMovimientosSueltosDelDia,
  getCuentasConSaldo,
} from "@/lib/queries";
import { todayAR, fmtFecha } from "@/lib/format";
import { CierreForm } from "./cierre-form";

export const dynamic = "force-dynamic";

export default async function CierrePage() {
  const hoy = todayAR();
  const [usuarios, cierre, items, cuentas] = await Promise.all([
    getUsers(),
    getCierreDelDia(hoy),
    getMovimientosSueltosDelDia(hoy),
    getCuentasConSaldo(),
  ]);

  const cajaChica = cuentas.find((c) => c.esCajaChica);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cierre del día</h1>
        <p className="mt-0.5 text-sm capitalize text-subtle">{fmtFecha(hoy)}</p>
      </header>

      {cierre ? (
        <div className="card p-5 text-sm">
          <p className="font-medium text-pos">El día ya está cerrado.</p>
          <p className="mt-1 text-subtle">
            Si algo quedó mal, corregilo en el detalle del cierre.
          </p>
          <Link
            href="/"
            className="btn btn-primary mt-3 h-10 px-4 text-sm"
          >
            Ver el día
          </Link>
        </div>
      ) : (
        <CierreForm
          usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
          items={items}
          cajaChicaActual={cajaChica?.saldo ?? 0}
        />
      )}
    </div>
  );
}
