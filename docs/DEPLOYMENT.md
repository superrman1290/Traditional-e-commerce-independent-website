# Deployment Guide

## Required Environment Variables

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`
- `MINIO_BUCKET`
- `STOREFRONT_URL`
- `ADMIN_URL`
- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STOREFRONT_URL`
- `API_PORT`
- `TEST_PAYMENT_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CHECKOUT_BASE_URL`

## Production Build

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:deploy
npm.cmd run build --workspaces --if-present
```

## Start Services

Run the API and both Next.js applications behind a reverse proxy with HTTPS enabled.

```powershell
cd apps\api
npm.cmd run start

cd ..\storefront
npm.cmd run start

cd ..\admin
npm.cmd run start
```

## HTTPS And Routing

- Public storefront traffic should terminate HTTPS before the Next.js storefront.
- Admin traffic should use a separate hostname or protected path.
- API traffic should only allow trusted storefront and admin origins.
- Payment callbacks must use HTTPS URLs configured in the payment provider console.

## Database Migration And Backup

Apply migrations before releasing new application code:

```powershell
npm.cmd run prisma:deploy
```

Create a backup before each release:

```powershell
npm.cmd run db:backup
```

Backup files are written to `backups/` and must not be committed to Git. Production backups should be copied to encrypted object storage and periodically restored in a test environment.

## Security Checklist

- Use strong database, Redis and object storage passwords.
- Keep payment secrets outside Git and rotate them after exposure.
- Disable debug logging in production.
- Serve storefront, admin and API over HTTPS.
- Restrict admin access with network controls or authentication before real operations.
- Verify payment callback signatures and amounts.
- Keep `.env`, database dumps and user exports out of Git.
- Review privacy policy and user agreement before public launch.
