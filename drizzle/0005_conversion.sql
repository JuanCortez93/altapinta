-- Movimiento manual entre cuentas (efectivo <-> transferencia).
-- Escrita a mano: la cadena de snapshots de drizzle-kit quedó rota por los
-- parches manuales de 0002-0004 (drizzle-kit generate ya no puede diffear).

ALTER TYPE "public"."movimiento_categoria" ADD VALUE 'conversion';
