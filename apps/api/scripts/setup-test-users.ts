/**
 * Setup Test Users for 5311 Western Farm
 *
 * This script creates test users in the database that can be linked to Clerk accounts.
 *
 * Usage:
 * 1. Sign up in the app with each test email (creates Clerk account)
 * 2. Run this script to assign roles: pnpm --filter @farm/api exec tsx scripts/setup-test-users.ts
 *
 * Test Accounts for 5311 Western:
 * - eric@rootedrobotics.com - OWNER (already exists)
 * - admin@rootedtest.com - ADMIN
 * - manager@rootedtest.com - FARM_MANAGER
 * - sales@rootedtest.com - SALESPERSON
 * - operator@rootedtest.com - FARM_OPERATOR
 */

import { PrismaClient, FarmRole } from '@prisma/client';

const prisma = new PrismaClient();

const FARM_ID = 'cmjrwtwi60000it8riop23rbl'; // 5311 Western

const TEST_USERS = [
  { email: 'admin@rootedtest.com', name: 'Admin User', role: 'ADMIN' as FarmRole },
  { email: 'manager@rootedtest.com', name: 'Manager User', role: 'FARM_MANAGER' as FarmRole },
  { email: 'sales@rootedtest.com', name: 'Sales User', role: 'SALESPERSON' as FarmRole },
  { email: 'operator@rootedtest.com', name: 'Operator User', role: 'FARM_OPERATOR' as FarmRole },
];

async function main() {
  console.log('Setting up test users for 5311 Western farm...\n');

  // Check if farm exists
  const farm = await prisma.farm.findUnique({
    where: { id: FARM_ID },
  });

  if (!farm) {
    console.error('Farm not found! ID:', FARM_ID);
    process.exit(1);
  }

  console.log(`Farm: ${farm.name}\n`);

  // First, find all users that match our test emails
  const existingUsers = await prisma.user.findMany({
    where: {
      email: { in: TEST_USERS.map(u => u.email) },
    },
  });

  console.log('Found existing users:', existingUsers.map(u => u.email).join(', ') || 'none');

  for (const testUser of TEST_USERS) {
    console.log(`\nProcessing: ${testUser.email}`);

    // Check if user exists
    let user = existingUsers.find(u => u.email === testUser.email);

    if (!user) {
      // User doesn't exist - create placeholder (will be updated when they sign up via Clerk)
      console.log(`  Creating placeholder user for ${testUser.email}`);
      user = await prisma.user.create({
        data: {
          externalId: `test-${testUser.role.toLowerCase()}-${Date.now()}`,
          email: testUser.email,
          name: testUser.name,
        },
      });
      console.log(`  Created user: ${user.id}`);
    } else {
      console.log(`  User already exists: ${user.id}`);
    }

    // Check if FarmUser relationship exists
    const existingFarmUser = await prisma.farmUser.findFirst({
      where: {
        userId: user.id,
        farmId: FARM_ID,
      },
    });

    if (existingFarmUser) {
      // Update role if different
      if (existingFarmUser.role !== testUser.role) {
        await prisma.farmUser.update({
          where: { id: existingFarmUser.id },
          data: { role: testUser.role },
        });
        console.log(`  Updated role: ${existingFarmUser.role} -> ${testUser.role}`);
      } else {
        console.log(`  Role already set: ${testUser.role}`);
      }
    } else {
      // Create FarmUser relationship
      await prisma.farmUser.create({
        data: {
          userId: user.id,
          farmId: FARM_ID,
          role: testUser.role,
        },
      });
      console.log(`  Created FarmUser with role: ${testUser.role}`);
    }

    // Also create corresponding Employee record if needed
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        farmId: FARM_ID,
        email: testUser.email,
      },
    });

    if (!existingEmployee) {
      const [firstName, lastName] = testUser.name.split(' ');
      const positionMap: Record<string, 'FARM_MANAGER' | 'SALESPERSON' | 'FARM_OPERATOR'> = {
        FARM_MANAGER: 'FARM_MANAGER',
        SALESPERSON: 'SALESPERSON',
        FARM_OPERATOR: 'FARM_OPERATOR',
      };

      const position = positionMap[testUser.role];
      if (position) {
        await prisma.employee.create({
          data: {
            farmId: FARM_ID,
            firstName,
            lastName: lastName || '',
            email: testUser.email,
            position,
            status: 'ACTIVE',
          },
        });
        console.log(`  Created Employee record`);
      }
    }
  }

  console.log('\n✅ Test users setup complete!\n');
  console.log('To use these accounts:');
  console.log('1. Go to http://localhost:5173');
  console.log('2. Sign up with each email (e.g., admin@rootedtest.com)');
  console.log('3. After sign-up, run this command to link Clerk IDs:\n');
  console.log('   pnpm --filter @farm/api exec tsx scripts/link-clerk-users.ts\n');
  console.log('Test accounts:');
  console.log('  - admin@rootedtest.com (ADMIN)');
  console.log('  - manager@rootedtest.com (FARM_MANAGER)');
  console.log('  - sales@rootedtest.com (SALESPERSON)');
  console.log('  - operator@rootedtest.com (FARM_OPERATOR)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
