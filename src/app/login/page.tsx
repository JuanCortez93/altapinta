"use client";

import { useActionState } from "react";
import { LogoMark } from "@/components/brand";
import { login, type LoginState } from "./actions";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xs">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 scale-[2.2] rounded-full opacity-70 blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, var(--gold) 0%, transparent 70%)",
              }}
            />
            <LogoMark size={76} />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            Alta Pinta
          </h1>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-subtle">
            Pollería y Pescadería
          </p>
        </div>

        <form action={formAction} className="mt-8 flex flex-col gap-3">
          <label className="text-sm font-medium text-muted" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoFocus
            autoComplete="current-password"
            className="h-12 rounded-lg border border-line bg-surface px-3 text-base outline-none transition-colors focus:border-accent"
          />
          {state.error && (
            <p className="text-sm text-neg">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="h-12 rounded-lg bg-accent text-base font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
