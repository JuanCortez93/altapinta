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
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cierre de turno</h1>
        <p className="text-sm text-zinc-500">
          Cargá lo vendido, los gastos y el conteo de la caja.
        </p>
      </div>

      <CierreForm
        hoy={hoy}
        usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))}
        provisionDiaria={Number(provisionDiaria ?? 0)}
        turnosHechos={shiftsHoy.map((s) => s.turno)}
      />
    </div>
  );
}
