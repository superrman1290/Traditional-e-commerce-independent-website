CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "InventoryChangeType" AS ENUM ('INITIAL', 'ADJUSTMENT', 'RESTOCK', 'STOCK_OUT');

CREATE TABLE "categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "category_id" UUID,
  "name" VARCHAR(180) NOT NULL,
  "slug" VARCHAR(220) NOT NULL,
  "summary" TEXT,
  "description" TEXT NOT NULL,
  "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_images" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "alt_text" VARCHAR(180),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_options" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "product_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_option_values" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "option_id" UUID NOT NULL,
  "value" VARCHAR(120) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "product_option_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_skus" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "sku_code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "option_signature" JSONB NOT NULL,
  "cost_price" DECIMAL(12,2),
  "price" DECIMAL(12,2) NOT NULL,
  "compare_at_price" DECIMAL(12,2),
  "weight_grams" INTEGER,
  "stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "locked_stock_quantity" INTEGER NOT NULL DEFAULT 0,
  "low_stock_threshold" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "product_skus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sku_id" UUID NOT NULL,
  "type" "InventoryChangeType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "before_stock" INTEGER NOT NULL,
  "after_stock" INTEGER NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "inventory_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_category_id_idx" ON "products"("category_id");
CREATE INDEX "products_status_idx" ON "products"("status");
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");
CREATE UNIQUE INDEX "product_options_product_id_name_key" ON "product_options"("product_id", "name");
CREATE INDEX "product_options_product_id_idx" ON "product_options"("product_id");
CREATE UNIQUE INDEX "product_option_values_option_id_value_key" ON "product_option_values"("option_id", "value");
CREATE INDEX "product_option_values_option_id_idx" ON "product_option_values"("option_id");
CREATE UNIQUE INDEX "product_skus_sku_code_key" ON "product_skus"("sku_code");
CREATE INDEX "product_skus_product_id_idx" ON "product_skus"("product_id");
CREATE INDEX "inventory_records_sku_id_idx" ON "inventory_records"("sku_id");
CREATE INDEX "inventory_records_created_at_idx" ON "inventory_records"("created_at");

ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "product_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_skus" ADD CONSTRAINT "product_skus_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
