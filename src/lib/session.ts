import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, isValidToken, sessionToken } from "./auth";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return isValidToken(jar.get(AUTH_COOKIE)?.value, process.env.AUTH_SECRET ?? "");
}

/** Usar al inicio de cada server action que muta datos. */
export async function assertAuthed(): Promise<void> {
  if (!(await isAuthed())) redirect("/login");
}

export async function startSession(): Promise<void> {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await sessionToken(process.env.AUTH_SECRET ?? ""), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}
