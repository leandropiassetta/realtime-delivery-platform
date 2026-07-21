import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { AppError } from '../lib/errors.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  createOrder,
  createOrderSchema,
  getOrder,
  listOrders,
  updateOrderStatus,
  updateStatusSchema,
} from '../services/orders.js';

const idSchema = z.coerce.number().int().positive();
const idempotencySchema = z.string().uuid();

export const ordersRouter = Router();
ordersRouter.use(authenticate, requireRoles(Role.customer, Role.seller));

ordersRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const orders = await listOrders(request.auth!);
    response.json({ data: orders, meta: { count: orders.length } });
  }),
);

ordersRouter.get(
  '/:id',
  asyncHandler(async (request, response) => {
    response.json({ data: await getOrder(idSchema.parse(request.params.id), request.auth!) });
  }),
);

ordersRouter.post(
  '/',
  requireRoles(Role.customer),
  asyncHandler(async (request, response) => {
    const key = request.get('idempotency-key');
    if (!key) {
      throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Envie o cabeçalho Idempotency-Key.');
    }
    const result = await createOrder(
      request.auth!.id,
      createOrderSchema.parse(request.body),
      idempotencySchema.parse(key),
    );
    if (result.replayed) response.setHeader('Idempotency-Replayed', 'true');
    response.status(201).json({ data: result.order });
  }),
);

ordersRouter.patch(
  '/:id/status',
  asyncHandler(async (request, response) => {
    const body = updateStatusSchema.parse(request.body);
    const order = await updateOrderStatus(
      idSchema.parse(request.params.id),
      body.status,
      request.auth!,
    );
    response.json({ data: order });
  }),
);
