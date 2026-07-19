CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'MERGED', 'ABANDONED');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(180) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "phone" VARCHAR(40),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_addresses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "recipient_name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(40) NOT NULL,
  "country" VARCHAR(80) NOT NULL DEFAULT 'CN',
  "province" VARCHAR(120) NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "district" VARCHAR(120),
  "line_1" VARCHAR(240) NOT NULL,
  "postal_code" VARCHAR(40),
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "guest_session_id" UUID,
  "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cart_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cart_id" UUID NOT NULL,
  "sku_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_snapshot" DECIMAL(12,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");
CREATE INDEX "guest_sessions_expires_at_idx" ON "guest_sessions"("expires_at");
CREATE INDEX "user_addresses_user_id_idx" ON "user_addresses"("user_id");
CREATE INDEX "carts_user_id_status_idx" ON "carts"("user_id", "status");
CREATE INDEX "carts_guest_session_id_status_idx" ON "carts"("guest_session_id", "status");
CREATE UNIQUE INDEX "cart_items_cart_id_sku_id_key" ON "cart_items"("cart_id", "sku_id");
CREATE INDEX "cart_items_sku_id_idx" ON "cart_items"("sku_id");

ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_sku_id_fkey" FOREIGN KEY ("sku_id") REFERENCES "product_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

