/**
 * Autenticación mínima para la v1: una sola contraseña compartida (APP_PASSWORD).
 * El login deja una cookie firmada con AUTH_SECRET. Sin usuarios individuales
 * todavía — eso llega más adelante.
 *
 * Este módulo usa Web Crypto para poder correr también en el proxy (edge).
 */

export const AUTH_COOKIE = "ap_auth";

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token determinístico a partir del secreto. La cookie guarda este valor. */
export async function sessionToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret || "sin-secreto"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("altapinta-session-v1"),
  );
  return toHex(sig);
}

export async function isValidToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const expected = await sessionToken(secret);
  // comparación de tiempo constante
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
