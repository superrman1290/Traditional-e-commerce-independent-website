# Stage 7: Analytics And Launch Readiness

## Scope

- Sales revenue dashboard
- Order count dashboard
- Conversion rate dashboard
- Product sales ranking
- Traffic source analysis
- Storefront behavior event tracking
- Database backup script
- Privacy policy page
- User agreement page
- Security checklist
- Deployment guide

## API

- `POST /analytics/events`
- `GET /admin/analytics`

## New Data Table

- `behavior_events`

## Rules

- Storefront analytics events do not contain payment card data.
- Anonymous visitors are identified with a local browser identifier.
- Logged-in users can be linked through the existing session token.
- Sales metrics use paid, shipped and completed orders only.
- Product rankings use order item snapshots so historical product edits do not change past analytics.
- Backup output is written to `backups/`, which is ignored by Git.

## Git Tag

```text
v1.0.0
```
