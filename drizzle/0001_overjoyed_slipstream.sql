CREATE TYPE "public"."gasto_categoria" AS ENUM('envios', 'personal_eventual', 'insumos', 'servicios', 'otros');--> statement-breakpoint
ALTER TYPE "public"."movimiento_categoria" ADD VALUE 'provision_sueldo';--> statement-breakpoint
ALTER TABLE "money_movements" ADD COLUMN "gasto_categoria" "gasto_categoria";