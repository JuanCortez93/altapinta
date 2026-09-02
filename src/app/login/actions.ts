"use server";

import { redirect } from "next/navigation";
import { startSession } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pass = String(formData.get("password") ?? "");
  const expected = process.env.APP_PASSWORD ?? "";

  if (!expected) {
    return { error: "Falta configurar APP_PASSWORD en el servidor." };
  }
  if (pass !== expected) {
    return { error: "Contraseña incorrecta." };
  }

  await startSession();
  redirect("/");
}
