export default function Home() {
  const fases = [
    { n: 0, nombre: "Base", detalle: "Scaffold, esquema de datos, seed", estado: "en curso" },
    { n: 1, nombre: "MVP plata", detalle: "Parte de turno, cuentas, arqueo de caja chica, dashboard del día" },
    { n: 2, nombre: "Stock", detalle: "Compras por lote, mermas, checklist diario y conteo completo" },
    { n: 3, nombre: "Conciliación + producción", detalle: "Venta vs stock, recetas y órdenes, margen por producto" },
    { n: 4, nombre: "Promos + 2ª sucursal", detalle: "Promociones y panel de candidatos, alta de sucursal" },
  ];

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Alta Pinta</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Sistema de control y conciliación de la pollería. Ver{" "}
          <code className="rounded bg-black/[.06] px-1 py-0.5 text-sm dark:bg-white/[.08]">
            README.md
          </code>{" "}
          para el modelo de datos y el circuito operativo.
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {fases.map((f) => (
          <li
            key={f.n}
            className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">
                Fase {f.n} — {f.nombre}
              </span>
              {f.estado && (
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  {f.estado}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {f.detalle}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
