import { Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { listProducts } from '../services/products.js';

export const productsRouter = Router();

productsRouter.get(
  '/',
  authenticate,
  requireRoles(Role.customer),
  asyncHandler(async (_request, response) => {
    const products = await listProducts();
    response.json({ data: products, meta: { count: products.length } });
  }),
);
