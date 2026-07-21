import { prisma } from '../lib/prisma.js';

export type ProductDto = {
  id: number;
  name: string;
  price: string;
  imagePath: string;
};

export async function listProducts(): Promise<ProductDto[]> {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price.toFixed(2),
    imagePath: product.imagePath,
  }));
}
