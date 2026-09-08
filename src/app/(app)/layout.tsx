import Link from "next/link";
import { Lockup } from "@/components/brand";
import { logout } from "./logout-action";
import { NavLink } from "./nav-link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-2.5">
          <Link href="/" aria-label="Inicio">
            <Lockup />
          </Link>
          <div className="flex-1" />
          <form action={logout}>
            <button type="submit" className="btn btn-ghost h-8 px-2.5 text-sm">
              Salir
            </button>
          </form>
        </div>
        <nav className="mx-auto -mt-0.5 flex w-full max-w-3xl items-center gap-1 overflow-x-auto px-3 pb-1.5">
          <NavLink href="/">Hoy</NavLink>
          <NavLink href="/movimiento">Movimiento</NavLink>
          <NavLink href="/compra">Compra</NavLink>
          <NavLink href="/cierre">Cierre</NavLink>
          <NavLink href="/cierres">Cierres</NavLink>
          <NavLink href="/metricas">Métricas</NavLink>
          <NavLink href="/cuentas">Cuentas</NavLink>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
