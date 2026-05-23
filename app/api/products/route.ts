import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseExpiredReservations } from '@/lib/reservations';

export async function GET() {
  await releaseExpiredReservations();

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      inventories: {
        orderBy: { warehouse: { name: 'asc' } },
        select: {
          totalUnits: true,
          reservedUnits: true,
          warehouse: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  const payload = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.id,
    description: product.name,
    inventories: product.inventories.map((inventory) => {
      const reservedUnits = Math.max(0, inventory.reservedUnits);
      const availableUnits = Math.max(0, inventory.totalUnits - reservedUnits);
      return {
        warehouseId: inventory.warehouse.id,
        warehouseName: inventory.warehouse.name,
        location: inventory.warehouse.name,
        totalUnits: inventory.totalUnits,
        reservedUnits,
        availableUnits
      };
    })
  }));

  return NextResponse.json(payload);
}
