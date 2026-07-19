ALTER TYPE "OrderStatus" ADD VALUE 'PAID';

CREATE TYPE "PaymentProvider" AS ENUM ('TEST', 'STRIPE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CLOSED');
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "orders"
  ADD COLUMN "paid_amount" DECIMAL(12,2),
  ADD COLUMN "paid_currency" VARCHAR(12),
  ADD COLUMN "paid_at" TIMESTAMP(3);

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'CNY',
  "idempotency_key" VARCHAR(120) NOT NULL,
  "provider_payment_id" VARCHAR(120) NOT NULL,
  "checkout_url" TEXT,
  "failure_reason" TEXT,
  "raw_request" JSONB,
  "paid_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_callbacks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID,
  "provider" "PaymentProvider" NOT NULL,
  "provider_event_id" VARCHAR(160) NOT NULL,
  "provider_payment_id" VARCHAR(120) NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "signature" VARCHAR(240),
  "is_verified" BOOLEAN NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP(3),
  "processing_result" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_callbacks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refunds" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" VARCHAR(12) NOT NULL DEFAULT 'CNY',
  "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT,
  "provider_refund_id" VARCHAR(120),
  "raw_response" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");
CREATE UNIQUE INDEX "payments_order_id_idempotency_key_key" ON "payments"("order_id", "idempotency_key");
CREATE UNIQUE INDEX "payments_one_success_per_order_idx" ON "payments"("order_id") WHERE "status" = 'SUCCEEDED';
CREATE INDEX "payments_order_id_status_idx" ON "payments"("order_id", "status");
CREATE INDEX "payments_provider_status_idx" ON "payments"("provider", "status");

CREATE UNIQUE INDEX "payment_callbacks_provider_provider_event_id_key" ON "payment_callbacks"("provider", "provider_event_id");
CREATE INDEX "payment_callbacks_payment_id_idx" ON "payment_callbacks"("payment_id");
CREATE INDEX "payment_callbacks_provider_payment_id_idx" ON "payment_callbacks"("provider_payment_id");

CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");
CREATE INDEX "refunds_payment_id_status_idx" ON "refunds"("payment_id", "status");

ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_callbacks" ADD CONSTRAINT "payment_callbacks_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
