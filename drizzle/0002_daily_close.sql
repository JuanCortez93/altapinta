-- Fase 1 rework: cierre por dia, cuentas Tesoro/Caja chica/Reserva, sin provision.
-- Escrita a mano (drizzle-kit generate necesita TTY para resolver renombres).

CREATE TYPE "public"."origen" AS ENUM('app', 'importado');
--> statement-breakpoint

-- Recrear enums cuyos valores cambiaron (columnas vacias).
ALTER TABLE "money_movements" ALTER COLUMN "categoria" TYPE text;--> statement-breakpoint
ALTER TABLE "money_movements" ALTER COLUMN "gasto_categoria" TYPE text;--> statement-breakpoint
ALTER TABLE "cash_counts" ALTER COLUMN "momento" TYPE text;--> statement-breakpoint
DROP TYPE "public"."movimiento_categoria";--> statement-breakpoint
DROP TYPE "public"."gasto_categoria";--> statement-breakpoint
DROP TYPE "public"."arqueo_momento";--> statement-breakpoint
CREATE TYPE "public"."movimiento_categoria" AS ENUM('venta_efectivo', 'venta_transferencia', 'gasto', 'compra', 'retiro', 'sueldo', 'deposito_tesoro', 'ajuste_arqueo', 'ajuste_reserva', 'fondo_inicial');--> statement-breakpoint
CREATE TYPE "public"."gasto_categoria" AS ENUM('envios', 'uber', 'otros');--> statement-breakpoint
CREATE TYPE "public"."arqueo_momento" AS ENUM('cierre_dia', 'semanal');--> statement-breakpoint
ALTER TABLE "money_movements" ALTER COLUMN "categoria" TYPE "public"."movimiento_categoria" USING "categoria"::"public"."movimiento_categoria";--> statement-breakpoint
ALTER TABLE "money_movements" ALTER COLUMN "gasto_categoria" TYPE "public"."gasto_categoria" USING "gasto_categoria"::"public"."gasto_categoria";--> statement-breakpoint
ALTER TABLE "cash_counts" ALTER COLUMN "momento" TYPE "public"."arqueo_momento" USING "momento"::"public"."arqueo_momento";--> statement-breakpoint

ALTER TABLE "money_accounts" ADD COLUMN "es_reserva" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- shifts -> daily_closes
DROP TABLE "shifts" CASCADE;--> statement-breakpoint
CREATE TABLE "daily_closes" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"venta_efectivo" numeric(14, 2) DEFAULT '0' NOT NULL,
	"venta_transferencia" numeric(14, 2) DEFAULT '0' NOT NULL,
	"efectivo_contado" numeric(14, 2),
	"diferencia_efectivo" numeric(14, 2),
	"efectivo_a_tesoro" numeric(14, 2) DEFAULT '0' NOT NULL,
	"saldo_reserva_app" numeric(14, 2),
	"observaciones" text,
	"cerrado_por" integer,
	"cerrado_en" timestamp with time zone,
	"origen" "origen" DEFAULT 'app' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closes" ADD CONSTRAINT "daily_closes_cerrado_por_users_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closes_branch_fecha" ON "daily_closes" USING btree ("branch_id","fecha");--> statement-breakpoint

-- money_movements: shift_id -> cierre_id, + origen
ALTER TABLE "money_movements" DROP COLUMN IF EXISTS "shift_id";--> statement-breakpoint
ALTER TABLE "money_movements" ADD COLUMN "cierre_id" integer;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_cierre_id_daily_closes_id_fk" FOREIGN KEY ("cierre_id") REFERENCES "public"."daily_closes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD COLUMN "origen" "origen" DEFAULT 'app' NOT NULL;--> statement-breakpoint

-- cash_counts: shift_id -> cierre_id
ALTER TABLE "cash_counts" DROP COLUMN IF EXISTS "shift_id";--> statement-breakpoint
ALTER TABLE "cash_counts" ADD COLUMN "cierre_id" integer;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_cierre_id_daily_closes_id_fk" FOREIGN KEY ("cierre_id") REFERENCES "public"."daily_closes"("id") ON DELETE no action ON UPDATE no action;
