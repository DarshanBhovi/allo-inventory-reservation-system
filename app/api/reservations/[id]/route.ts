import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/reservations';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  await releaseExpiredReservations();

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      quantity: true,
      status: true,
      expiresAt: true,
      product: { select: { name: true } },
      warehouse: { select: { name: true } }
    }
  });

  if (!reservation) {
    return NextResponse.json({ message: 'Reservation not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: reservation.id,
    productName: reservation.product.name,
    sku: reservation.product.name,
    warehouseName: reservation.warehouse.name,
    location: reservation.warehouse.name,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString()
  });
}
