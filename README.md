# Traditional Ecommerce Independent Website

Single-merchant B2C physical goods ecommerce site. Current milestone: **Stage 7: Analytics and launch readiness**.

## Current Features

- Storefront: product catalog, product detail, account menu, login/register modal, cart, checkout, payment, order lookup, after-sales, favorites, support, privacy policy and user agreement.
- Admin: product, SKU, inventory, order, payment, shipping, after-sales, marketing, analytics and launch readiness views.
- API: NestJS + TypeScript with product, auth, cart, address, checkout, order, payment, shipping, after-sales, marketing and analytics modules.
- Database: PostgreSQL + Prisma migrations.
- Local infrastructure: Redis and MinIO reserved by Docker Compose.
- Tests: Vitest workspaces and Playwright.
- CI: GitHub Actions.

## Project Structure

```text
apps/
  storefront/        Customer shopping frontend
  admin/             Merchant operations dashboard
  api/               Backend API
packages/
  database/          Prisma schema, migrations and seed
  shared/            Shared types and utilities
  ui/                Shared UI package placeholder
  config/            Shared configuration package
docs/
  PRD.md
  STAGE_0.md ... STAGE_7.md
  DEPLOYMENT.md
scripts/
  run-dev.mjs
  backup-database.ps1
```

## Windows Local Startup

1. Install Node.js 20.11 or newer, Docker Desktop and Git.

2. Copy environment variables:

```powershell
Copy-Item .env.example .env
```

3. Start infrastructure:

```powershell
docker compose up -d
```

4. Install dependencies:

```powershell
npm.cmd install
```

5. Generate Prisma Client, apply migrations and seed data:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:deploy
npm.cmd run db:seed
```

6. Start all apps:

```powershell
npm.cmd run dev
```

Default URLs:

- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API health: http://localhost:4000/health
- PostgreSQL: localhost:5433
- Redis: localhost:6380
- MinIO console: http://localhost:9001

If port `3000` is already used, run the storefront manually on another port:

```powershell
cd apps\storefront
node ..\..\node_modules\next\dist\bin\next dev -p 3002
```

## API Surface

Public and customer APIs:

- `GET /health`
- `GET /categories`
- `GET /products`
- `GET /products/:slug`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /guest-sessions`
- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`
- `POST /cart/merge`
- `GET /addresses`
- `POST /addresses`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`
- `GET /checkout/summary`
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/confirm-receipt`
- `GET /orders/:id/payments`
- `POST /orders/expire`
- `POST /payments`
- `GET /payments/:id`
- `POST /payments/test/simulate`
- `POST /payments/test/callback`
- `POST /payments/stripe/callback`
- `GET /marketing`
- `POST /newsletter-subscriptions`
- `POST /contact-messages`
- `GET /favorites`
- `POST /favorites`
- `DELETE /favorites/:productId`
- `POST /cart/reminders`
- `POST /after-sales`
- `GET /after-sales`
- `POST /analytics/events`

Admin APIs:

- `GET /admin/products`
- `POST /admin/products`
- `PATCH /admin/products/:id/status`
- `POST /admin/inventory/adjustments`
- `GET /admin/inventory/records`
- `GET /admin/orders`
- `POST /admin/orders/:id/shipment`
- `POST /admin/orders/expire`
- `GET /admin/payments`
- `POST /admin/payments/:id/refunds`
- `GET /admin/marketing`
- `PATCH /admin/contact-messages/:id/status`
- `GET /admin/after-sales`
- `PATCH /admin/after-sales/:id`
- `GET /admin/analytics`

Cart APIs prefer `Authorization: Bearer <token>`. Guest carts use `X-Guest-Session-Id`. Checkout, order and payment creation require login.

## Database

Core business tables include users, sessions, products, SKUs, inventory records, carts, addresses, orders, order item snapshots, payments, callbacks, refunds, shipments, after-sale requests, favorites, subscriptions, contact messages, FAQ entries, abandoned cart reminders and behavior events.

Common commands:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:deploy
npm.cmd run db:seed
npm.cmd run db:backup
```

Backup files are written to `backups/`, which is ignored by Git.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
```

## Deployment

See `docs/DEPLOYMENT.md` for production environment variables, HTTPS guidance, backup steps and security checks.

## Known Issues

- `npm run dev` is a long-running command and must be stopped with `Ctrl+C`.
- The current admin UI is a local operations dashboard. Add real admin authentication and role permissions before production use.
- Stripe support is an adapter skeleton. Configure real secrets and provider SDK calls before collecting production payments.
- Product images currently use remote demo URLs. Production should use MinIO, S3 or another object storage provider.
- On Windows, running Next dev while building can leave `.next` cache artifacts. Restart the dev server and clear the affected app cache if needed.
