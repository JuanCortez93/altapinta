import { getUsers, getSetting, getShiftsDelDia } from "@/lib/queries";
import { todayAR } from "@/lib/format";
import { CierreForm } from "./cierre-form";

export const dynamic = "force-dynamic";

export default async function CierrePage() {
  const hoy = todayAR();
  const [usuarios, provisionDiaria, shiftsHoy] = await Promise.all([
    getUsers(),
    getSetting("provision_sueldos_diaria"),
    getShiftsDelDia(hoy),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Cierre de turno
        </h1>
        <p className="mt-0.5 text-sm text-subtle">
          Lo vendido, los gastos y el conteo de la caja.
        </p>
      </header>

      <CierreForm
        hoy={hoy}
        usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
        provisionDiaria={Number(provisionDiaria ?? 0)}
        turnosHechos={shiftsHoy.map((s) => s.turno)}
      />
    </div>
  );
}
