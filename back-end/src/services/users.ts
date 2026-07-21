import { Role, type Prisma, type User } from '@prisma/client';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { createSession, type SessionResult } from '../auth/session-service.js';
import { domainEvents } from '../events.js';
import { AppError, notFound, unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  deactivatedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicSelect }>;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<User> {
  return prisma.user.create({
    data: {
      name: data.name.trim(),
      email: normalizeEmail(data.email),
      passwordHash: await hashPassword(data.password),
      role: data.role,
    },
  });
}

export async function registerCustomer(data: {
  name: string;
  email: string;
  password: string;
}): Promise<SessionResult> {
  const user = await createUser({ ...data, role: Role.customer });
  return createSession(user);
}

export async function login(email: string, password: string): Promise<SessionResult> {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !user.active || !(await verifyPassword(user.passwordHash, password))) {
    throw unauthorized('INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
  }
  return createSession(user);
}

export const listUsers = (): Promise<PublicUser[]> =>
  prisma.user.findMany({ select: publicSelect, orderBy: [{ role: 'asc' }, { name: 'asc' }] });

export const listActiveSellers = (): Promise<Array<Pick<User, 'id' | 'name'>>> =>
  prisma.user.findMany({
    where: { role: Role.seller, active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

export async function createManagedUser(data: {
  name: string;
  email: string;
  password: string;
  role: typeof Role.customer | typeof Role.seller;
}): Promise<PublicUser> {
  const user = await createUser(data);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    deactivatedAt: user.deactivatedAt,
    createdAt: user.createdAt,
  };
}

export async function deactivateUser(id: number): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('Usuário');
  if (user.role === Role.administrator) {
    throw new AppError(
      409,
      'ADMIN_DEACTIVATION_BLOCKED',
      'Administradores não podem ser desativados.',
    );
  }
  if (!user.active) return;

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { active: false, deactivatedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  domainEvents.emit('user.deactivated', id);
}
