import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/reservations';

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  await releaseExpiredReservations();

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      quantity: true,
      status: true
    }
  });
  if (!reservation) {
    return NextResponse.json({ message: 'Reservation not found' }, { status: 404 });
  }

  if (reservation.status !== 'PENDING') {
    return NextResponse.json({ message: 'Reservation cannot be cancelled' }, { status: 400 });
  }

  const releasedReservationCount = await prisma.$transaction(async (tx) => {
    const updateCount = await tx.reservation.updateMany({
      where: { id: params.id, status: 'PENDING' },
      data: { status: 'RELEASED' }
    });

    if (updateCount.count === 0) {
      return updateCount;
    }

    await tx.inventory.updateMany({
      where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
      data: { reservedUnits: { decrement: reservation.quantity } }
    });

    await tx.$executeRawUnsafe('UPDATE "Inventory" SET "reservedUnits" = 0 WHERE "reservedUnits" < 0');
    return updateCount;
  });

  if (releasedReservationCount.count === 0) {
    return NextResponse.json({ message: 'Reservation cannot be cancelled' }, { status: 400 });
  }

  const updatedReservation = await prisma.reservation.findUnique({
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

  return NextResponse.json(updatedReservation);
}
