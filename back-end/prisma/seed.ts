import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';

const prisma = new PrismaClient();

function localPassword(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error(`${name} é obrigatória em produção.`);
  return fallback;
}

async function main() {
  const users = [
    {
      name: 'Administrador Demo',
      email: 'admin@delivery.local',
      role: Role.administrator,
      password: localPassword('SEED_ADMIN_PASSWORD', 'LocalDemoAdmin2026!'),
    },
    {
      name: 'Vendedora Demo',
      email: 'seller@delivery.local',
      role: Role.seller,
      password: localPassword('SEED_SELLER_PASSWORD', 'LocalDemoSeller2026!'),
    },
    {
      name: 'Cliente Demo',
      email: 'customer@delivery.local',
      role: Role.customer,
      password: localPassword('SEED_CUSTOMER_PASSWORD', 'LocalDemoCustomer2026!'),
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, active: true, deactivatedAt: null },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        passwordHash: await hashPassword(user.password),
      },
    });
  }

  const products = [
    ['Skol Lata 350ml', '2.20', 'skol_lata_350ml.jpg'],
    ['Heineken 600ml', '7.50', 'heineken_600ml.jpg'],
    ['Antarctica Pilsen 300ml', '2.49', 'antarctica_pilsen_300ml.jpg'],
    ['Brahma 600ml', '7.50', 'brahma_600ml.jpg'],
    ['Skol 269ml', '2.19', 'skol_269ml.jpg'],
    ['Skol Beats Senses 313ml', '4.49', 'skol_beats_senses_313ml.jpg'],
    ['Becks 330ml', '4.99', 'becks_330ml.jpg'],
    ['Brahma Duplo Malte 350ml', '2.79', 'brahma_duplo_malte_350ml.jpg'],
    ['Becks 600ml', '8.89', 'becks_600ml.jpg'],
    ['Skol Beats Senses 269ml', '3.57', 'skol_beats_senses_269ml.jpg'],
    ['Stella Artois 275ml', '3.49', 'stella_artois_275ml.jpg'],
  ] as const;

  for (const [name, price, image] of products) {
    await prisma.product.upsert({
      where: { name },
      update: { price, imagePath: `/images/${image}`, active: true },
      create: { name, price, imagePath: `/images/${image}` },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
