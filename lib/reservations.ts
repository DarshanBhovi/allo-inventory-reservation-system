import { prisma } from './prisma';

export async function releaseExpiredReservations() {
  const now = new Date();

  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now }
    },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      quantity: true
    }
  });

  if (expiredReservations.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const reservation of expiredReservations) {
      const updateCount = await tx.reservation.updateMany({
        where: { id: reservation.id, status: 'PENDING' },
        data: { status: 'RELEASED' }
      });

      if (updateCount.count > 0) {
        await tx.inventory.updateMany({
          where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
          data: {
            reservedUnits: { decrement: reservation.quantity }
          }
        });
      }
    }

    await tx.$executeRawUnsafe('UPDATE "Inventory" SET "reservedUnits" = 0 WHERE "reservedUnits" < 0');
  });
}
