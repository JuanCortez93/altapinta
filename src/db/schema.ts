/**
 * Esquema de base de datos — Alta Pinta
 *
 * Sistema de control y conciliación para la pollería. NO es un punto de venta:
 * no se registran ventas ítem por ítem. Se declara el total vendido por turno
 * (efectivo / transferencia) y el control real llega desde los conteos de stock.
 *
 * Convenciones:
 *  - Montos de dinero: numeric(14,2).
 *  - Cantidades de mercadería: numeric(12,3) (permite kg con 3 decimales).
 *  - Campos calculados (total de turno, diferencias, saldos teóricos) NO viven acá:
 *    se derivan en queries / reportes.
 *  - Todo lleva branch_id: hoy hay una sucursal, el modelo ya es multisucursal.
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  numeric,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

export const rolEnum = pgEnum("rol", ["dueno", "encargado", "vendedor"]);

export const productoTipoEnum = pgEnum("producto_tipo", ["reventa", "elaborado"]);
export const unidadEnum = pgEnum("unidad", ["kg", "unidad", "cajon"]);
export const zonaEnum = pgEnum("zona", [
  "heladera",
  "freezer",
  "mostrador",
  "deposito",
]);

export const loteOrigenEnum = pgEnum("lote_origen", [
  "compra",
  "produccion",
  "ajuste",
]);
export const salidaMotivoEnum = pgEnum("salida_motivo", [
  "merma",
  "ajuste_inventario",
  "consumo_produccion",
  "autoconsumo",
  "cortesia",
]);

/** Origen de un registro: cargado en la app, o importado del histórico viejo. */
export const origenEnum = pgEnum("origen", ["app", "importado"]);

/** Turno del cierre. `domingo` = cierre único del domingo. */
export const turnoEnum = pgEnum("turno", ["manana", "tarde", "domingo"]);
// Legacy: sin uso, se deja declarado para no confundir a drizzle-kit.
export const turnoEstadoEnum = pgEnum("turno_estado", ["abierto", "cerrado"]);

export const cuentaTipoEnum = pgEnum("cuenta_tipo", ["efectivo", "digital"]);
export const movimientoTipoEnum = pgEnum("movimiento_tipo", [
  "ingreso",
  "egreso",
  "transferencia",
]);
export const movimientoCategoriaEnum = pgEnum("movimiento_categoria", [
  "venta_efectivo",
  "venta_transferencia",
  "gasto",
  "compra",
  "retiro",
  "sueldo",
  "deposito_tesoro",
  "ajuste_arqueo",
  "ajuste_reserva",
  "fondo_inicial",
]);

/** Subcategoría de un movimiento con categoria = "gasto". */
export const gastoCategoriaEnum = pgEnum("gasto_categoria", [
  "envios",
  "uber",
  "otros",
]);

export const arqueoMomentoEnum = pgEnum("arqueo_momento", [
  "cierre_dia",
  "semanal",
]);

export const conteoTipoEnum = pgEnum("conteo_tipo", ["diario", "completo"]);
export const conteoEstadoEnum = pgEnum("conteo_estado", [
  "en_progreso",
  "cerrado",
]);
export const conteoItemMotivoEnum = pgEnum("conteo_item_motivo", [
  "merma",
  "error_carga",
  "autoconsumo",
  "ajuste",
  "sin_explicar",
]);
export const conteoItemEstadoEnum = pgEnum("conteo_item_estado", [
  "pendiente",
  "contado",
]);

export const promoTipoEnum = pgEnum("promo_tipo", ["producto", "combo"]);

/* ------------------------------------------------------------------ */
/* Base / configuración                                              */
/* ------------------------------------------------------------------ */

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  rol: rolEnum("rol").notNull().default("vendedor"),
  pinHash: text("pin_hash"),
  activo: boolean("activo").notNull().default(true),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/** Parámetros del sistema (clave/valor). Ej: fondo_fijo_caja_chica, conteo_a_ciegas. */
export const settings = pgTable("settings", {
  clave: text("clave").primaryKey(),
  valor: text("valor"),
  descripcion: text("descripcion"),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Catálogo                                                          */
/* ------------------------------------------------------------------ */

export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  categoriaId: integer("categoria_id").references(() => productCategories.id),
  tipo: productoTipoEnum("tipo").notNull().default("reventa"),
  /** Presentación por defecto. */
  unidad: unidadEnum("unidad").notNull().default("kg"),
  /**
   * Presentaciones permitidas en una compra. Si tiene más de una, el
   * formulario muestra el selector de cajón / kilo / unidad. Si es null o
   * de una sola, no pregunta.
   */
  presentaciones: unidadEnum("presentaciones").array(),
  zona: zonaEnum("zona").notNull().default("mostrador"),
  /** Entra en el checklist de conteo diario (set clave). */
  controlDiario: boolean("control_diario").notNull().default(false),
  precioVentaActual: numeric("precio_venta_actual", { precision: 14, scale: 2 }),
  activo: boolean("activo").notNull().default(true),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  precioVenta: numeric("precio_venta", { precision: 14, scale: 2 }).notNull(),
  vigenteDesde: date("vigente_desde").notNull(),
  usuarioId: integer("usuario_id").references(() => users.id),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Compras y stock                                                   */
/* ------------------------------------------------------------------ */

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  contacto: text("contacto"),
  activo: boolean("activo").notNull().default(true),
});

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  proveedorId: integer("proveedor_id").references(() => suppliers.id),
  /** Proveedor escrito a mano cuando no está en la lista. */
  proveedorTexto: text("proveedor_texto"),
  fechaCompra: date("fecha_compra").notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  /** Cuenta de la que salió la plata (Caja chica = efectivo, Reserva = transferencia). */
  cuentaPagoId: integer("cuenta_pago_id").references(() => moneyAccounts.id),
  usuarioId: integer("usuario_id").references(() => users.id),
  notas: text("notas"),
  origen: origenEnum("origen").notNull().default("app"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: serial("id").primaryKey(),
  purchaseId: integer("purchase_id")
    .notNull()
    .references(() => purchases.id),
  /** Nulo cuando el ítem es "otros" (texto libre). */
  productId: integer("product_id").references(() => products.id),
  /** Nombre del ítem cuando no viene del catálogo. */
  descripcion: text("descripcion"),
  cantidad: numeric("cantidad", { precision: 12, scale: 3 }).notNull(),
  /** Presentación de esta compra: kg / unidad / cajon. */
  presentacion: unidadEnum("presentacion"),
  costoUnitario: numeric("costo_unitario", { precision: 14, scale: 2 }),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
});

/**
 * Lote de mercadería. Cada ingreso (compra / producción / ajuste) crea un lote
 * con su fecha y su costo real. Las salidas consumen el lote más antiguo primero
 * (FEFO) — de ahí sale el reporte de antigüedad de stock.
 */
export const stockLots = pgTable("stock_lots", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  origen: loteOrigenEnum("origen").notNull(),
  purchaseItemId: integer("purchase_item_id").references(() => purchaseItems.id),
  productionOrderId: integer("production_order_id").references(
    () => productionOrders.id,
  ),
  fechaIngreso: date("fecha_ingreso").notNull(),
  /** Presentación del lote: kg / unidad / cajon. */
  presentacion: unidadEnum("presentacion"),
  cantidadInicial: numeric("cantidad_inicial", {
    precision: 12,
    scale: 3,
  }).notNull(),
  cantidadRestante: numeric("cantidad_restante", {
    precision: 12,
    scale: 3,
  }).notNull(),
  costoUnitario: numeric("costo_unitario", { precision: 14, scale: 2 }).notNull(),
  vencimiento: date("vencimiento"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Salidas de stock REGISTRADAS (merma, autoconsumo, ajuste de inventario,
 * consumo de producción, cortesía). Las ventas NO se registran acá: el vendido
 * se infiere en la conciliación venta-vs-stock.
 */
export const stockExits = pgTable("stock_exits", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  fecha: date("fecha").notNull(),
  cantidad: numeric("cantidad", { precision: 12, scale: 3 }).notNull(),
  motivo: salidaMotivoEnum("motivo").notNull(),
  lotId: integer("lot_id").references(() => stockLots.id),
  costoUnitario: numeric("costo_unitario", { precision: 14, scale: 2 }),
  conteoId: integer("conteo_id").references(() => stockCounts.id),
  usuarioId: integer("usuario_id").references(() => users.id),
  nota: text("nota"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Producción (hamburguesas / albóndigas de pollo)                   */
/* ------------------------------------------------------------------ */

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  rindeCantidad: numeric("rinde_cantidad", {
    precision: 12,
    scale: 3,
  }).notNull(),
  unidadRinde: unidadEnum("unidad_rinde").notNull(),
  activo: boolean("activo").notNull().default(true),
});

export const recipeItems = pgTable("recipe_items", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id),
  insumoProductId: integer("insumo_product_id")
    .notNull()
    .references(() => products.id),
  cantidad: numeric("cantidad", { precision: 12, scale: 3 }).notNull(),
});

export const productionOrders = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id),
  fecha: date("fecha").notNull(),
  cantidadProducida: numeric("cantidad_producida", {
    precision: 12,
    scale: 3,
  }).notNull(),
  costoTotal: numeric("costo_total", { precision: 14, scale: 2 }),
  usuarioId: integer("usuario_id").references(() => users.id),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Dinero                                                            */
/* ------------------------------------------------------------------ */

/**
 * Cuentas de plata. Sólo tres: Tesoro (efectivo, la caja del lugar),
 * Caja chica (efectivo operativo del día) y Reserva (adonde van las
 * transferencias del día).
 */
export const moneyAccounts = pgTable("money_accounts", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: cuentaTipoEnum("tipo").notNull(),
  /** Caja fuerte / efectivo global. */
  esTesoro: boolean("es_tesoro").notNull().default(false),
  /** Efectivo operativo del día. */
  esCajaChica: boolean("es_caja_chica").notNull().default(false),
  /** Adonde caen las transferencias del día. */
  esReserva: boolean("es_reserva").notNull().default(false),
  saldoInicial: numeric("saldo_inicial", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  activo: boolean("activo").notNull().default(true),
});

/**
 * Cierre del día. Un registro por fecha. Se cargan las ventas brutas
 * (efectivo y transferencia) y el conteo de la caja; los gastos del día ya
 * están cargados como movimientos y se enganchan a este cierre.
 */
export const dailyCloses = pgTable(
  "daily_closes",
  {
    id: serial("id").primaryKey(),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id),
    fecha: date("fecha").notNull(),
    /** Turno al que corresponde este cierre. */
    turno: turnoEnum("turno").notNull(),
    /** Venta bruta del turno, antes de gastos. */
    ventaEfectivo: numeric("venta_efectivo", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    ventaTransferencia: numeric("venta_transferencia", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    /** Arqueo: efectivo físico contado en Caja chica al cierre. */
    efectivoContado: numeric("efectivo_contado", { precision: 14, scale: 2 }),
    /** Diferencia contado − teórico (guardada al cerrar). */
    diferenciaEfectivo: numeric("diferencia_efectivo", {
      precision: 14,
      scale: 2,
    }),
    /** Efectivo que pasa de Caja chica al Tesoro. */
    efectivoATesoro: numeric("efectivo_a_tesoro", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    /** Saldo declarado de la Reserva (homebanking / app), opcional. */
    saldoReservaApp: numeric("saldo_reserva_app", { precision: 14, scale: 2 }),
    observaciones: text("observaciones"),
    cerradoPor: integer("cerrado_por").references(() => users.id),
    cerradoEn: timestamp("cerrado_en", { withTimezone: true }),
    origen: origenEnum("origen").notNull().default("app"),
    creadoEn: timestamp("creado_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_closes_branch_fecha_turno").on(
      t.branchId,
      t.fecha,
      t.turno,
    ),
  ],
);

/**
 * Todo movimiento de plata. El saldo de una cuenta se calcula como
 * saldo_inicial + Σ ingresos − Σ egresos ± transferencias.
 * Los gastos se cargan durante el día con cierre_id nulo; al cerrar el día
 * se les asigna el cierre.
 */
export const moneyMovements = pgTable("money_movements", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  fecha: date("fecha").notNull(),
  tipo: movimientoTipoEnum("tipo").notNull(),
  categoria: movimientoCategoriaEnum("categoria").notNull(),
  /** Subcategoría, sólo cuando categoria = "gasto". */
  gastoCategoria: gastoCategoriaEnum("gasto_categoria"),
  cuentaId: integer("cuenta_id")
    .notNull()
    .references(() => moneyAccounts.id),
  /** Sólo para tipo = transferencia. */
  cuentaDestinoId: integer("cuenta_destino_id").references(
    () => moneyAccounts.id,
  ),
  monto: numeric("monto", { precision: 14, scale: 2 }).notNull(),
  cierreId: integer("cierre_id").references(() => dailyCloses.id),
  purchaseId: integer("purchase_id").references(() => purchases.id),
  descripcion: text("descripcion"),
  usuarioId: integer("usuario_id").references(() => users.id),
  origen: origenEnum("origen").notNull().default("app"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/** Arqueo: saldo contado vs saldo teórico de una cuenta en un momento dado. */
export const cashCounts = pgTable("cash_counts", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => moneyAccounts.id),
  fecha: date("fecha").notNull(),
  momento: arqueoMomentoEnum("momento").notNull(),
  cierreId: integer("cierre_id").references(() => dailyCloses.id),
  saldoTeorico: numeric("saldo_teorico", { precision: 14, scale: 2 }).notNull(),
  saldoContado: numeric("saldo_contado", { precision: 14, scale: 2 }).notNull(),
  diferencia: numeric("diferencia", { precision: 14, scale: 2 }).notNull(),
  nota: text("nota"),
  usuarioId: integer("usuario_id").references(() => users.id),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Conteos de stock                                                  */
/* ------------------------------------------------------------------ */

export const stockCounts = pgTable("stock_counts", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id")
    .notNull()
    .references(() => branches.id),
  fecha: date("fecha").notNull(),
  tipo: conteoTipoEnum("tipo").notNull(),
  /** Conteo a ciegas: no se muestra el teórico hasta cargar lo contado. */
  aCiegas: boolean("a_ciegas").notNull().default(true),
  estado: conteoEstadoEnum("estado").notNull().default("en_progreso"),
  usuarioId: integer("usuario_id").references(() => users.id),
  cerradoEn: timestamp("cerrado_en", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const stockCountItems = pgTable("stock_count_items", {
  id: serial("id").primaryKey(),
  conteoId: integer("conteo_id")
    .notNull()
    .references(() => stockCounts.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  cantidadContada: numeric("cantidad_contada", { precision: 12, scale: 3 }),
  cantidadTeorica: numeric("cantidad_teorica", { precision: 12, scale: 3 }),
  diferencia: numeric("diferencia", { precision: 12, scale: 3 }),
  valorizacionCosto: numeric("valorizacion_costo", { precision: 14, scale: 2 }),
  valorizacionVenta: numeric("valorizacion_venta", { precision: 14, scale: 2 }),
  motivo: conteoItemMotivoEnum("motivo"),
  estadoLinea: conteoItemEstadoEnum("estado_linea")
    .notNull()
    .default("pendiente"),
});

/* ------------------------------------------------------------------ */
/* Promociones                                                       */
/* ------------------------------------------------------------------ */

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  tipo: promoTipoEnum("tipo").notNull(),
  precioPromo: numeric("precio_promo", { precision: 14, scale: 2 }).notNull(),
  vigenteDesde: date("vigente_desde"),
  vigenteHasta: date("vigente_hasta"),
  activa: boolean("activa").notNull().default(true),
  notas: text("notas"),
});

export const promotionItems = pgTable("promotion_items", {
  id: serial("id").primaryKey(),
  promotionId: integer("promotion_id")
    .notNull()
    .references(() => promotions.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  cantidad: numeric("cantidad", { precision: 12, scale: 3 }).notNull(),
});
