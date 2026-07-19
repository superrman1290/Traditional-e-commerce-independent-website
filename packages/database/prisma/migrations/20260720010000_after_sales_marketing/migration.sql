CREATE TYPE "AfterSaleType" AS ENUM ('REFUND', 'RETURN_REFUND');
CREATE TYPE "AfterSaleStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'READ', 'REPLIED');
CREATE TYPE "CartReminderStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED');

CREATE TABLE "favorites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "after_sale_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "payment_id" UUID,
  "refund_id" UUID,
  "type" "AfterSaleType" NOT NULL,
  "status" "AfterSaleStatus" NOT NULL DEFAULT 'REQUESTED',
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "return_tracking_number" VARCHAR(120),
  "admin_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "reviewed_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "after_sale_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "newsletter_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(180) NOT NULL,
  "source" VARCHAR(80),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "newsletter_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contact_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(180) NOT NULL,
  "subject" VARCHAR(180) NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "faq_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "question" VARCHAR(240) NOT NULL,
  "answer" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "faq_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "abandoned_cart_reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "cart_id" UUID NOT NULL,
  "email" VARCHAR(180),
  "status" "CartReminderStatus" NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "abandoned_cart_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorites_user_id_product_id_key" ON "favorites"("user_id", "product_id");
CREATE INDEX "favorites_product_id_idx" ON "favorites"("product_id");

CREATE UNIQUE INDEX "after_sale_requests_refund_id_key" ON "after_sale_requests"("refund_id");
CREATE INDEX "after_sale_requests_user_id_status_idx" ON "after_sale_requests"("user_id", "status");
CREATE INDEX "after_sale_requests_order_id_idx" ON "after_sale_requests"("order_id");
CREATE INDEX "after_sale_requests_status_created_at_idx" ON "after_sale_requests"("status", "created_at");

CREATE UNIQUE INDEX "newsletter_subscriptions_email_key" ON "newsletter_subscriptions"("email");
CREATE INDEX "newsletter_subscriptions_is_active_idx" ON "newsletter_subscriptions"("is_active");

CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");
CREATE INDEX "faq_entries_is_active_sort_order_idx" ON "faq_entries"("is_active", "sort_order");
CREATE INDEX "abandoned_cart_reminders_status_scheduled_at_idx" ON "abandoned_cart_reminders"("status", "scheduled_at");
CREATE INDEX "abandoned_cart_reminders_cart_id_idx" ON "abandoned_cart_reminders"("cart_id");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "after_sale_requests" ADD CONSTRAINT "after_sale_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "after_sale_requests" ADD CONSTRAINT "after_sale_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "after_sale_requests" ADD CONSTRAINT "after_sale_requests_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "after_sale_requests" ADD CONSTRAINT "after_sale_requests_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "abandoned_cart_reminders" ADD CONSTRAINT "abandoned_cart_reminders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
