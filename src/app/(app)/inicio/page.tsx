import { getCuentasConSaldo, getCuentasInicializadas } from "@/lib/queries";
import { todayAR } from "@/lib/format";
import { InicioForm } from "./inicio-form";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const [cuentas, inicializadas] = await Promise.all([
    getCuentasConSaldo(),
    getCuentasInicializadas(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Saldo inicial
        </h1>
        <p className="mt-0.5 text-sm text-subtle">
          Arrancamos en limpio: cargá lo que hay hoy en cada cuenta y desde
          mañana todo se mueve solo desde los cierres y los gastos.
        </p>
      </header>

      <InicioForm
        hoy={todayAR()}
        cuentas={cuentas.map((c) => ({
          nombre: c.nombre,
          esTesoro: c.esTesoro,
          esCajaChica: c.esCajaChica,
          esReserva: c.esReserva,
          saldo: c.saldo,
          inicializada: inicializadas.has(c.id),
        }))}
      />
    </div>
  );
}
