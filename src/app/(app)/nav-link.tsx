"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "relative whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "text-accent"
          : "text-muted hover:bg-surface-2 hover:text-ink")
      }
    >
      {children}
      {active && (
        <span className="absolute inset-x-2.5 -bottom-1.5 h-0.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}
