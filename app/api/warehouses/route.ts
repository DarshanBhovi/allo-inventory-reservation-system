import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/reservations';

export async function GET() {
  await releaseExpiredReservations();

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true
    }
  });

  return NextResponse.json(
    warehouses.map((warehouse) => ({
      id: warehouse.id,
      name: warehouse.name,
      location: warehouse.name
    }))
  );
}
