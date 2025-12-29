import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      id: 'demo-user-1',
      externalId: 'demo-external-1',
      email: 'demo@example.com',
      name: 'Demo User',
    },
  });
  console.log('Created user:', user.email);

  // Create a demo farm
  const farm = await prisma.farm.upsert({
    where: { id: 'demo-farm-1' },
    update: {},
    create: {
      id: 'demo-farm-1',
      name: 'Green Valley Farm',
      slug: 'green-valley',
      timezone: 'America/New_York',
      currency: 'USD',
      users: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });
  console.log('Created farm:', farm.name);

  // Create farm layout
  await prisma.farmLayout.upsert({
    where: { farmId: farm.id },
    update: {},
    create: {
      farmId: farm.id,
      canvasData: {
        width: 1200,
        height: 800,
        backgroundColor: '#f5f5f5',
        gridSize: 20,
      },
    },
  });

  // Create some zones
  const zones = [
    { name: 'North Field', type: 'FIELD', color: '#4CAF50', x: 50, y: 50, width: 300, height: 200 },
    { name: 'Greenhouse A', type: 'GREENHOUSE', color: '#8BC34A', x: 400, y: 50, width: 200, height: 150 },
    { name: 'Equipment Shed', type: 'EQUIPMENT', color: '#795548', x: 50, y: 300, width: 150, height: 100 },
    { name: 'Storage Barn', type: 'STORAGE', color: '#FF9800', x: 250, y: 300, width: 180, height: 120 },
    { name: 'Processing Area', type: 'PROCESSING', color: '#607D8B', x: 480, y: 250, width: 200, height: 150 },
  ];

  for (const zone of zones) {
    await prisma.zone.create({
      data: {
        farmId: farm.id,
        name: zone.name,
        type: zone.type as any,
        color: zone.color,
        positionX: zone.x,
        positionY: zone.y,
        width: zone.width,
        height: zone.height,
        area: zone.width * zone.height / 100, // Mock area in m²
      },
    });
  }
  console.log('Created', zones.length, 'zones');

  // Create some products
  const products = [
    { name: 'Tomato Seeds', sku: 'SEED-TOM-001', seedWeight: 0.003, unitCost: 0.05 },
    { name: 'Lettuce Seeds', sku: 'SEED-LET-001', seedWeight: 0.001, unitCost: 0.02 },
    { name: 'Carrot Seeds', sku: 'SEED-CAR-001', seedWeight: 0.002, unitCost: 0.03 },
    { name: 'Fertilizer 10-10-10', sku: 'FERT-101010', unitCost: 25.00 },
    { name: 'Organic Compost', sku: 'COMP-ORG-001', unitCost: 15.00 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        farmId: farm.id,
        ...product,
      },
    });
  }
  console.log('Created', products.length, 'products');

  // Create some employees
  const employees = [
    { firstName: 'John', lastName: 'Smith', position: 'Farm Manager', hourlyRate: 25 },
    { firstName: 'Maria', lastName: 'Garcia', position: 'Field Worker', hourlyRate: 18 },
    { firstName: 'David', lastName: 'Johnson', position: 'Equipment Operator', hourlyRate: 22 },
  ];

  for (const emp of employees) {
    await prisma.employee.create({
      data: {
        farmId: farm.id,
        ...emp,
        status: 'ACTIVE',
        hireDate: new Date('2024-01-15'),
      },
    });
  }
  console.log('Created', employees.length, 'employees');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
