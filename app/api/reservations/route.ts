import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/reservations';
import { findIdempotentResponse, hashRequestBody, storeIdempotentResponse } from '@/lib/idempotency';
import { reserveSchema } from '@/lib/validation';

export async function POST(request: Request) {
  await releaseExpiredReservations();

  const body = await request.json().catch(() => null);
  const parse = reserveSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ message: 'Invalid reservation payload' }, { status: 400 });
  }

  const { productId, warehouseId, quantity } = parse.data;
  const idempotencyKey = request.headers.get('Idempotency-Key');
  const requestHash = hashRequestBody(body);
  if (idempotencyKey) {
    const recorded = await findIdempotentResponse(idempotencyKey);
    if (recorded) {
      if (recorded.requestHash !== requestHash) {
        return NextResponse.json({ message: 'Conflicting idempotency key' }, { status: 400 });
      }
      return new Response(recorded.responseBody, { status: recorded.responseStatus, headers: { 'Content-Type': 'application/json' } });
    }
  }

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const inventoryUpdate = await tx.$queryRawUnsafe(
        'UPDATE "Inventory" SET "reservedUnits" = "reservedUnits" + $1 WHERE "productId" = $2 AND "warehouseId" = $3 AND ("totalUnits" - "reservedUnits") >= $1 RETURNING "id";',
        quantity,
        productId,
        warehouseId
      );

      if (!Array.isArray(inventoryUpdate) || inventoryUpdate.length === 0) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }
      });
    });

    const payload = {
      id: reservation.id,
      productId: reservation.productId,
      warehouseId: reservation.warehouseId,
      quantity: reservation.quantity,
      status: reservation.status,
      expiresAt: reservation.expiresAt.toISOString()
    };

    if (idempotencyKey) {
      await storeIdempotentResponse(idempotencyKey, 'POST', '/api/reservations', requestHash, 201, payload);
    }

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ message: 'Not enough available stock' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Unable to reserve stock' }, { status: 500 });
  }
}
