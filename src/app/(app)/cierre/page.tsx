import Link from "next/link";
import {
  getUsers,
  getCierresDelDia,
  getMovimientosSueltosDelDia,
  getCuentasConSaldo,
} from "@/lib/queries";
import { todayAR, fmtFecha } from "@/lib/format";
import { CierreForm } from "./cierre-form";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  domingo: "Domingo",
};

export default async function CierrePage() {
  const hoy = todayAR();
  const [usuarios, cierres, gastos, cuentas] = await Promise.all([
    getUsers(),
    getCierresDelDia(hoy),
    getMovimientosSueltosDelDia(hoy),
    getCuentasConSaldo(),
  ]);

  const cajaChica = cuentas.find((c) => c.esCajaChica);
  const hechos = cierres.map((c) => c.turno);
  const disponibles = (["manana", "tarde", "domingo"] as const).filter(
    (t) => !hechos.includes(t),
  );

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cierre del turno</h1>
        <p className="mt-0.5 text-sm capitalize text-subtle">{fmtFecha(hoy)}</p>
      </header>

      {cierres.length > 0 && (
        <p className="text-sm text-subtle">
          Cerrado hoy:{" "}
          <span className="font-medium text-ink">
            {cierres.map((c) => LABEL[c.turno]).join(" · ")}
          </span>
        </p>
      )}

      {disponibles.length === 0 ? (
        <div className="card p-5 text-sm">
          <p className="font-medium text-pos">Los cierres de hoy ya están.</p>
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
          gastos={gastos.map((g) => ({
            id: g.id,
            categoria: g.categoria,
            gastoCategoria: g.gastoCategoria,
            monto: g.monto,
            descripcion: g.descripcion,
            cuenta: g.cuenta,
            cierreId: g.cierreId,
          }))}
          cajaChicaActual={cajaChica?.saldo ?? 0}
          turnosDisponibles={disponibles}
        />
      )}
    </div>
  );
}
