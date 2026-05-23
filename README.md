# Allo Reservations Demo

A focused Next.js application demonstrating inventory holds and reservation confirmation for a multi-warehouse checkout flow.

## What it includes

- Inventory model with `totalUnits`, `reservedUnits`, and `availableUnits`
- Reservations with statuses: `PENDING`, `CONFIRMED`, `RELEASED`
- API endpoints for listing products, warehouses, creating reservations, confirming, and releasing
- Frontend pages for product listing and reservation checkout
- Automatic expiry cleanup on API reads
- Optional idempotency handling using `IdempotencyRecord`

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the example:

```bash
copy .env.example .env
```

3. Run Prisma migration and seed the database:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

4. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`

## Database setup

This project is configured to use PostgreSQL in the provided environment.

For local development, you can still use a `file:./dev.db` SQLite URL, but the current `.env` is set to the provided hosted Postgres instance.

## Expiry mechanism

Expired reservations are released lazily on API reads. Before each relevant route resolves, the server checks for `PENDING` reservations whose `expiresAt` has passed and releases them so stock returns to available inventory.

This approach is simple, safe, and avoids extra infrastructure. For production, a background worker or scheduled cron job would be a better fit.

## Concurrency correctness

The reservation endpoint uses a single database transaction with an atomic inventory update conditional on `availableUnits >= quantity`.

That means when two requests race for the same last unit, only one will succeed and the other will receive a `409` response.

## Idempotency

The reserve and confirm endpoints accept an `Idempotency-Key` header.

If the same key is used again with the same request payload, the server returns the original response instead of repeating the side effect.

## Notes and trade-offs

- I used SQLite locally for speed and portability. The data access patterns are designed to work with Postgres too.
- The project keeps the expiry mechanism simple by cleaning up expired holds on API reads; a production deployment should add a scheduled task or worker.
- UI is intentionally minimal and functional, with clear error handling for `409` and `410` outcomes.

## Files to inspect

- `prisma/schema.prisma` — data model
- `app/api/reservations/route.ts` — reserve endpoint logic
- `app/api/reservations/[id]/confirm/route.ts` — confirm endpoint
- `app/api/reservations/[id]/release/route.ts` — release endpoint
- `app/page.tsx` — product listing
- `app/reservations/[id]/page.tsx` — reservation checkout page
