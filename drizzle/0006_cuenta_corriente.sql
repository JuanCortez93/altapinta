-- Separa la cuenta única "Mercado Pago" en Cuenta Corriente (adonde caen
-- las transferencias del día) y Reserva (adonde se barre la Cuenta
-- Corriente al final del día; genera interés). Antes "Reserva" hacía las
-- dos cosas a la vez, lo cual no reflejaba cómo funciona realmente MP.
-- Escrita a mano: ver nota sobre drizzle-kit generate en el README.

ALTER TABLE "money_accounts" ADD COLUMN "es_cuenta_corriente" boolean DEFAULT false NOT NULL;
