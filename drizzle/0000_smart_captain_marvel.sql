CREATE TYPE "public"."arqueo_momento" AS ENUM('cierre_manana', 'cierre_tarde', 'cierre_domingo', 'semanal');--> statement-breakpoint
CREATE TYPE "public"."conteo_estado" AS ENUM('en_progreso', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."conteo_item_estado" AS ENUM('pendiente', 'contado');--> statement-breakpoint
CREATE TYPE "public"."conteo_item_motivo" AS ENUM('merma', 'error_carga', 'autoconsumo', 'ajuste', 'sin_explicar');--> statement-breakpoint
CREATE TYPE "public"."conteo_tipo" AS ENUM('diario', 'completo');--> statement-breakpoint
CREATE TYPE "public"."cuenta_tipo" AS ENUM('efectivo', 'digital');--> statement-breakpoint
CREATE TYPE "public"."lote_origen" AS ENUM('compra', 'produccion', 'ajuste');--> statement-breakpoint
CREATE TYPE "public"."movimiento_categoria" AS ENUM('venta_efectivo', 'venta_transferencia', 'compra', 'gasto', 'sueldo', 'retiro', 'deposito_tesoro', 'ajuste_arqueo', 'fondo_inicial');--> statement-breakpoint
CREATE TYPE "public"."movimiento_tipo" AS ENUM('ingreso', 'egreso', 'transferencia');--> statement-breakpoint
CREATE TYPE "public"."producto_tipo" AS ENUM('reventa', 'elaborado');--> statement-breakpoint
CREATE TYPE "public"."promo_tipo" AS ENUM('producto', 'combo');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('dueno', 'encargado', 'vendedor');--> statement-breakpoint
CREATE TYPE "public"."salida_motivo" AS ENUM('merma', 'ajuste_inventario', 'consumo_produccion', 'autoconsumo', 'cortesia');--> statement-breakpoint
CREATE TYPE "public"."turno" AS ENUM('manana', 'tarde', 'domingo');--> statement-breakpoint
CREATE TYPE "public"."turno_estado" AS ENUM('abierto', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."unidad" AS ENUM('kg', 'unidad');--> statement-breakpoint
CREATE TYPE "public"."zona" AS ENUM('heladera', 'freezer', 'mostrador', 'deposito');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"momento" "arqueo_momento" NOT NULL,
	"shift_id" integer,
	"saldo_teorico" numeric(14, 2) NOT NULL,
	"saldo_contado" numeric(14, 2) NOT NULL,
	"diferencia" numeric(14, 2) NOT NULL,
	"nota" text,
	"usuario_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "cuenta_tipo" NOT NULL,
	"es_tesoro" boolean DEFAULT false NOT NULL,
	"es_caja_chica" boolean DEFAULT false NOT NULL,
	"saldo_inicial" numeric(14, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "movimiento_tipo" NOT NULL,
	"categoria" "movimiento_categoria" NOT NULL,
	"cuenta_id" integer NOT NULL,
	"cuenta_destino_id" integer,
	"monto" numeric(14, 2) NOT NULL,
	"shift_id" integer,
	"purchase_id" integer,
	"descripcion" text,
	"usuario_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"precio_venta" numeric(14, 2) NOT NULL,
	"vigente_desde" date NOT NULL,
	"usuario_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"cantidad_producida" numeric(12, 3) NOT NULL,
	"costo_total" numeric(14, 2),
	"usuario_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"categoria_id" integer,
	"tipo" "producto_tipo" DEFAULT 'reventa' NOT NULL,
	"unidad" "unidad" DEFAULT 'kg' NOT NULL,
	"zona" "zona" DEFAULT 'mostrador' NOT NULL,
	"control_diario" boolean DEFAULT false NOT NULL,
	"precio_venta_actual" numeric(14, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"promotion_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "promo_tipo" NOT NULL,
	"precio_promo" numeric(14, 2) NOT NULL,
	"vigente_desde" date,
	"vigente_hasta" date,
	"activa" boolean DEFAULT true NOT NULL,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"costo_unitario" numeric(14, 2) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"proveedor_id" integer,
	"fecha_compra" date NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"cuenta_pago_id" integer,
	"usuario_id" integer,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"insumo_product_id" integer NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"rinde_cantidad" numeric(12, 3) NOT NULL,
	"unidad_rinde" "unidad" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" text,
	"descripcion" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"turno" "turno" NOT NULL,
	"vendedor_id" integer,
	"total_efectivo" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_transferencia" numeric(14, 2) DEFAULT '0' NOT NULL,
	"observaciones" text,
	"estado" "turno_estado" DEFAULT 'abierto' NOT NULL,
	"cerrado_por" integer,
	"cerrado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_count_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"conteo_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"cantidad_contada" numeric(12, 3),
	"cantidad_teorica" numeric(12, 3),
	"diferencia" numeric(12, 3),
	"valorizacion_costo" numeric(14, 2),
	"valorizacion_venta" numeric(14, 2),
	"motivo" "conteo_item_motivo",
	"estado_linea" "conteo_item_estado" DEFAULT 'pendiente' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_counts" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"tipo" "conteo_tipo" NOT NULL,
	"a_ciegas" boolean DEFAULT true NOT NULL,
	"estado" "conteo_estado" DEFAULT 'en_progreso' NOT NULL,
	"usuario_id" integer,
	"cerrado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_exits" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"cantidad" numeric(12, 3) NOT NULL,
	"motivo" "salida_motivo" NOT NULL,
	"lot_id" integer,
	"costo_unitario" numeric(14, 2),
	"conteo_id" integer,
	"usuario_id" integer,
	"nota" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"branch_id" integer NOT NULL,
	"origen" "lote_origen" NOT NULL,
	"purchase_item_id" integer,
	"production_order_id" integer,
	"fecha_ingreso" date NOT NULL,
	"cantidad_inicial" numeric(12, 3) NOT NULL,
	"cantidad_restante" numeric(12, 3) NOT NULL,
	"costo_unitario" numeric(14, 2) NOT NULL,
	"vencimiento" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"contacto" text,
	"activo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"rol" "rol" DEFAULT 'vendedor' NOT NULL,
	"pin_hash" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_account_id_money_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_cuenta_id_money_accounts_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_cuenta_destino_id_money_accounts_id_fk" FOREIGN KEY ("cuenta_destino_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_movements" ADD CONSTRAINT "money_movements_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_categoria_id_product_categories_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_items" ADD CONSTRAINT "promotion_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_proveedor_id_suppliers_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_cuenta_pago_id_money_accounts_id_fk" FOREIGN KEY ("cuenta_pago_id") REFERENCES "public"."money_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_insumo_product_id_products_id_fk" FOREIGN KEY ("insumo_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_vendedor_id_users_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_cerrado_por_users_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_conteo_id_stock_counts_id_fk" FOREIGN KEY ("conteo_id") REFERENCES "public"."stock_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_exits" ADD CONSTRAINT "stock_exits_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_exits" ADD CONSTRAINT "stock_exits_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_exits" ADD CONSTRAINT "stock_exits_lot_id_stock_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."stock_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_exits" ADD CONSTRAINT "stock_exits_conteo_id_stock_counts_id_fk" FOREIGN KEY ("conteo_id") REFERENCES "public"."stock_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_exits" ADD CONSTRAINT "stock_exits_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_purchase_item_id_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_branch_fecha_turno" ON "shifts" USING btree ("branch_id","fecha","turno");