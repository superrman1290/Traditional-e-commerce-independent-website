ALTER TYPE "OrderStatus" ADD VALUE 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETED';

ALTER TABLE "orders"
  ADD COLUMN "shipped_at" TIMESTAMP(3),
  ADD COLUMN "completed_at" TIMESTAMP(3);

CREATE TABLE "shipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "carrier_name" VARCHAR(120) NOT NULL,
  "carrier_code" VARCHAR(80),
  "tracking_number" VARCHAR(120) NOT NULL,
  "tracking_url" TEXT,
  "shipped_at" TIMESTAMP(3) NOT NULL,
  "auto_confirm_at" TIMESTAMP(3) NOT NULL,
  "confirmed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");
CREATE INDEX "shipments_auto_confirm_at_idx" ON "shipments"("auto_confirm_at");

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
