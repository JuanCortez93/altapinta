"use client";

import { useState } from "react";

/**
 * Marca Alta Pinta.
 * El logo real (el pollo y el pescado) va en `public/logo.jpg`.
 * Mientras no esté, se muestra un emblema simple con los colores de la marca.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo chico con fallback por onError
      <img
        src="/logo.jpg"
        alt="Alta Pinta"
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Alta Pinta"
      className="shrink-0"
    >
      <circle cx="32" cy="32" r="30" fill="#0E2E52" />
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke="#E8A13C"
        strokeWidth="3"
      />
      <g stroke="#F2B44C" strokeWidth="2.4" strokeLinecap="round">
        <path d="M32 10v6" />
        <path d="M18 15l3.5 4.5" />
        <path d="M46 15l-3.5 4.5" />
      </g>
      <circle cx="32" cy="27" r="7" fill="#F2B44C" />
      <path
        d="M6 40c6 0 6 5 12 5s6-5 12-5 6 5 12 5 6-5 12-5v14a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"
        fill="#2E7FD4"
      />
      <path
        d="M6 40c6 0 6 4 12 4s6-4 12-4 6 4 12 4 6-4 12-4"
        fill="none"
        stroke="#8FC3F0"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Lockup({
  size = 30,
  tagline = false,
}: {
  size?: number;
  tagline?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-semibold tracking-tight text-ink">Alta Pinta</span>
        {tagline && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-subtle">
            Pollería y Pescadería
          </span>
        )}
      </span>
    </span>
  );
}
