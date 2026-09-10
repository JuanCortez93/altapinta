-- Cierre por turno: daily_closes pasa a tener un turno (manana / tarde /
-- domingo) y la unicidad es por (branch, fecha, turno). Escrita a mano
-- (drizzle-kit meta con drift desde 0002).

ALTER TABLE "daily_closes" ADD COLUMN IF NOT EXISTS "turno" "turno";--> statement-breakpoint
UPDATE "daily_closes" SET "turno" = 'tarde' WHERE "turno" IS NULL;--> statement-breakpoint
ALTER TABLE "daily_closes" ALTER COLUMN "turno" SET NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "daily_closes_branch_fecha";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "daily_closes_branch_fecha_turno" ON "daily_closes" USING btree ("branch_id","fecha","turno");
