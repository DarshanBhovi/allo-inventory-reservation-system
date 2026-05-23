# Allo Reservations Guide

## Purpose

This guide describes how the sample reservation system works for the Allo take-home exercise.

## Key concepts

- **Product**: A catalog item sold by the platform.
- **Warehouse**: A fulfillment location with inventory for products.
- **Inventory**: Per-product stock at a warehouse, including reserved units and available units.
- **Reservation**: A temporary hold created when a shopper proceeds to checkout.

## Data model

- `Inventory` includes:
  - `totalUnits` — current total stock held by the warehouse
  - `reservedUnits` — number of units currently held for pending reservations
  - `availableUnits` — units that can still be reserved
- `Reservation` includes:
  - `status` — `PENDING`, `CONFIRMED`, or `RELEASED`
  - `expiresAt` — timestamp when the manual hold expires

## How reservations work

1. When a user reserves stock, the server atomically updates inventory and creates a `PENDING` reservation.
2. If there is not enough available inventory, the API returns `409`.
3. If payment succeeds, the frontend calls confirm.
4. Confirming marks the reservation `CONFIRMED`, decrements `totalUnits`, and decrements `reservedUnits`.
5. If the reservation is cancelled or expires, it becomes `RELEASED` and the held units return to available stock.

## Expiry cleanup

The server performs a lazy expiry release before API reads. This means any route that can be affected by expired holds first scans for expired reservations and releases them.

It is a lightweight approach that avoids adding a background worker for this demo.

## Frontend flow

- Main page lists products, warehouses, and available stock.
- Each warehouse row has a Reserve button for one unit.
- After reservation, the app navigates to a checkout-style page.
- The checkout page shows a live countdown and buttons to confirm or cancel.
- `409` and `410` errors are surfaced clearly to the user.

## Running the app

- Install: `npm install`
- Migrate: `npx prisma migrate dev --name init`
- Seed: `npx prisma db seed`
- Run: `npm run dev`

## Where to look in code

- `app/api/reservations/route.ts`
- `app/api/reservations/[id]/confirm/route.ts`
- `app/api/reservations/[id]/release/route.ts`
- `app/page.tsx`
- `app/reservations/[id]/page.tsx`
