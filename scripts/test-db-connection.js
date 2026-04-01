// Quick script to verify database connection
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.$connect();
    const count = await prisma.product.count();
    console.log('✅ Database connected successfully!');
    console.log(`   Products in DB: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
