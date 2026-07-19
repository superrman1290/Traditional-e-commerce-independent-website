ALTER TYPE "CartStatus" ADD VALUE 'ORDERED';

CREATE TYPE "DiscountType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'CLOSED');

CREATE TABLE "shipping_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(120) NOT NULL,
  "province" VARCHAR(120),
  "base_fee" DECIMAL(12,2) NOT NULL,
  "free_shipping_threshold" DECIMAL(12,2),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "shipping_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "coupons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "type" "DiscountType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "min_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "usage_limit" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_no" VARCHAR(40) NOT NULL,
  "user_id" UUID NOT NULL,
  "cart_id" UUID NOT NULL,
  "coupon_id" UUID,
  "coupon_code" VARCHAR(40),
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "idempotency_key" VARCHAR(120) NOT NULL,
  "address_snapshot" JSONB NOT NULL,
  "subtotal_amount" DECIMAL(12,2) NOT NULL,
  "shipping_fee" DECIMAL(12,2) NOT NULL,
  "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_name" VARCHAR(180) NOT NULL,
  "product_slug" VARCHAR(220) NOT NULL,
  "sku_code" VARCHAR(80) NOT NULL,
  "sku_name" VARCHAR(180) NOT NULL,
  "option_signature" JSONB NOT NULL,
  "image_url" TEXT,
  "quantity" INTEGER NOT NULL,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "line_total" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shipping_templates_province_is_active_idx" ON "shipping_templates"("province", "is_active");
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_is_active_idx" ON "coupons"("is_active");
CREATE UNIQUE INDEX "orders_order_no_key" ON "orders"("order_no");
CREATE UNIQUE INDEX "orders_cart_id_key" ON "orders"("cart_id");
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");
CREATE INDEX "orders_user_id_status_idx" ON "orders"("user_id", "status");
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_sku_id_idx" ON "order_items"("sku_id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
