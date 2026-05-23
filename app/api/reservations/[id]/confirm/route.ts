import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/reservations';
import { findIdempotentResponse, hashRequestBody, storeIdempotentResponse } from '@/lib/idempotency';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  await releaseExpiredReservations();

  const idempotencyKey = request.headers.get('Idempotency-Key');
  const requestHash = hashRequestBody({ id: params.id });

  if (idempotencyKey) {
    const recorded = await findIdempotentResponse(idempotencyKey);
    if (recorded) {
      if (recorded.requestHash !== requestHash) {
        return NextResponse.json({ message: 'Conflicting idempotency key' }, { status: 400 });
      }
      return new Response(recorded.responseBody, { status: recorded.responseStatus, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      quantity: true,
      status: true,
      expiresAt: true
    }
  });
  if (!reservation) {
    return NextResponse.json({ message: 'Reservation not found' }, { status: 404 });
  }

  if (reservation.status !== 'PENDING') {
    return NextResponse.json({ message: 'Reservation not pending' }, { status: 400 });
  }

  if (reservation.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ message: 'Reservation has expired' }, { status: 410 });
  }

  let confirmedReservation;
  try {
    confirmedReservation = await prisma.$transaction(async (tx) => {
    const updateCount = await tx.reservation.updateMany({
      where: { id: params.id, status: 'PENDING' },
      data: { status: 'CONFIRMED' }
    });

    if (updateCount.count === 0) {
      throw new Error('NOT_PENDING');
    }

    const updated = await tx.reservation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        quantity: true,
        status: true,
        expiresAt: true
      }
    });

    await tx.inventory.updateMany({
      where: { productId: updated.productId, warehouseId: updated.warehouseId },
      data: {
        reservedUnits: { decrement: updated.quantity },
        totalUnits: { decrement: updated.quantity }
      }
    });

    return updated;
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_PENDING') {
      return NextResponse.json({ message: 'Reservation is no longer pending' }, { status: 400 });
    }
    throw error;
  }

  const payload = {
    id: confirmedReservation.id,
    productId: confirmedReservation.productId,
    warehouseId: confirmedReservation.warehouseId,
    quantity: confirmedReservation.quantity,
    status: confirmedReservation.status,
    expiresAt: confirmedReservation.expiresAt.toISOString()
  };

  if (idempotencyKey) {
    await storeIdempotentResponse(idempotencyKey, 'POST', `/api/reservations/${params.id}/confirm`, requestHash, 200, payload);
  }

  return NextResponse.json(payload);
}
