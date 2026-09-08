-- Fase 2 (compras): presentación (cajón/kilo/unidad) por producto y por renglón,
-- proveedor de texto libre, ítems de compra sin producto del catálogo.
-- Escrita a mano (el meta de drizzle-kit tiene drift desde 0002).
-- El valor 'cajon' del enum "unidad" se agregó por separado (ADD VALUE no corre
-- dentro de la transacción de migración).

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "presentaciones" "unidad"[];--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "proveedor_texto" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN IF NOT EXISTS "origen" "origen" DEFAULT 'app' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_items" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_items" ALTER COLUMN "costo_unitario" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "descripcion" text;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "presentacion" "unidad";--> statement-breakpoint
ALTER TABLE "stock_lots" ADD COLUMN IF NOT EXISTS "presentacion" "unidad";
