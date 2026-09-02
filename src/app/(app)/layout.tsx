import Link from "next/link";
import { logout } from "./logout-action";
import { NavLink } from "./nav-link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-zinc-950/90">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-3 py-2">
          <Link href="/" className="mr-2 font-semibold tracking-tight">
            Alta Pinta
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            <NavLink href="/">Hoy</NavLink>
            <NavLink href="/cierre">Cierre de turno</NavLink>
            <NavLink href="/cierres">Cierres</NavLink>
            <NavLink href="/cuentas">Cuentas</NavLink>
          </nav>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-black/5 hover:text-zinc-900 dark:hover:bg-white/10 dark:hover:text-white"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-5">{children}</main>
    </div>
  );
}
