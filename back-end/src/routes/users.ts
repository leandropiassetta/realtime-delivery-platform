import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  createManagedUser,
  deactivateUser,
  listActiveSellers,
  listUsers,
} from '../services/users.js';

const createUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    role: z.enum([Role.customer, Role.seller]),
  })
  .strict();

const idSchema = z.coerce.number().int().positive();

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  '/sellers',
  requireRoles(Role.customer),
  asyncHandler(async (_request, response) => {
    const sellers = await listActiveSellers();
    response.json({ data: sellers, meta: { count: sellers.length } });
  }),
);

usersRouter.get(
  '/',
  requireRoles(Role.administrator),
  asyncHandler(async (_request, response) => {
    const users = await listUsers();
    response.json({ data: users, meta: { count: users.length } });
  }),
);

usersRouter.post(
  '/',
  requireRoles(Role.administrator),
  asyncHandler(async (request, response) => {
    const user = await createManagedUser(createUserSchema.parse(request.body));
    response.status(201).json({ data: user });
  }),
);

usersRouter.delete(
  '/:id',
  requireRoles(Role.administrator),
  asyncHandler(async (request, response) => {
    await deactivateUser(idSchema.parse(request.params.id));
    response.status(204).end();
  }),
);
