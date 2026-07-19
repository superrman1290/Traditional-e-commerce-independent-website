CREATE TYPE "AnalyticsEventType" AS ENUM (
  'PAGE_VIEW',
  'PRODUCT_VIEW',
  'ADD_TO_CART',
  'CHECKOUT_STARTED',
  'ORDER_CREATED',
  'PAYMENT_SUCCEEDED',
  'FAVORITE_ADDED',
  'NEWSLETTER_SUBSCRIBED',
  'CONTACT_SUBMITTED'
);

CREATE TABLE "behavior_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "guest_session_id" UUID,
  "product_id" UUID,
  "anonymous_id" VARCHAR(120),
  "event_type" "AnalyticsEventType" NOT NULL,
  "path" VARCHAR(500) NOT NULL,
  "source" VARCHAR(120),
  "medium" VARCHAR(120),
  "campaign" VARCHAR(160),
  "referrer" TEXT,
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "behavior_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "behavior_events_event_type_occurred_at_idx" ON "behavior_events"("event_type", "occurred_at");
CREATE INDEX "behavior_events_user_id_occurred_at_idx" ON "behavior_events"("user_id", "occurred_at");
CREATE INDEX "behavior_events_guest_session_id_occurred_at_idx" ON "behavior_events"("guest_session_id", "occurred_at");
CREATE INDEX "behavior_events_product_id_occurred_at_idx" ON "behavior_events"("product_id", "occurred_at");
CREATE INDEX "behavior_events_source_occurred_at_idx" ON "behavior_events"("source", "occurred_at");

ALTER TABLE "behavior_events"
  ADD CONSTRAINT "behavior_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "behavior_events"
  ADD CONSTRAINT "behavior_events_guest_session_id_fkey"
  FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "behavior_events"
  ADD CONSTRAINT "behavior_events_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
