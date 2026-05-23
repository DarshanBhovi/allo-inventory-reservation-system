import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  const [warehouseA, warehouseB] = await Promise.all([
    prisma.warehouse.create({ data: { name: 'Los Angeles DC' } }),
    prisma.warehouse.create({ data: { name: 'Chicago Hub' } })
  ]);

  const [productA, productB] = await Promise.all([
    prisma.product.create({ data: { name: 'Allo Everyday Sneakers' } }),
    prisma.product.create({ data: { name: 'Allo Performance Hoodie' } })
  ]);

  await Promise.all([
    prisma.inventory.create({ data: { productId: productA.id, warehouseId: warehouseA.id, totalUnits: 12, reservedUnits: 0 } }),
    prisma.inventory.create({ data: { productId: productA.id, warehouseId: warehouseB.id, totalUnits: 6, reservedUnits: 0 } }),
    prisma.inventory.create({ data: { productId: productB.id, warehouseId: warehouseA.id, totalUnits: 8, reservedUnits: 0 } }),
    prisma.inventory.create({ data: { productId: productB.id, warehouseId: warehouseB.id, totalUnits: 10, reservedUnits: 0 } })
  ]);

  console.log('Seed finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
