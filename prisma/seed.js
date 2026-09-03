const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const electronics = await prisma.category.create({ data: { name: 'Electronics' } });
  const clothing = await prisma.category.create({ data: { name: 'Clothing' } });

  await prisma.product.createMany({
    data: [
      {
        categoryId: electronics.id,
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        price: 299.99,
        stockQuantity: 50,
      },
      {
        categoryId: electronics.id,
        name: 'USB-C Hub',
        description: '7-in-1 USB-C hub',
        price: 449.5,
        stockQuantity: 30,
      },
      {
        categoryId: clothing.id,
        name: 'Cotton T-Shirt',
        description: 'Plain cotton t-shirt',
        price: 149.0,
        stockQuantity: 100,
      },
    ],
  });

  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 12);
  const customerPasswordHash = await bcrypt.hash('CustomerPass123!', 12);

  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  const customer = await prisma.user.create({
    data: {
      fullName: 'Test Customer',
      email: 'customer@example.com',
      passwordHash: customerPasswordHash,
      role: 'customer',
    },
  });

  await prisma.cart.create({ data: { userId: customer.id } });

  console.log('Seed complete:', { admin: admin.email, customer: customer.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });