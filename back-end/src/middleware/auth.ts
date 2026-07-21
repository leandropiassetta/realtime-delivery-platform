import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken } from '../auth/tokens.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.get('authorization');
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!match?.[1]) return next(unauthorized());

  try {
    const claims = verifyAccessToken(match[1]);
    const user = await prisma.user.findFirst({
      where: { id: Number(claims.sub), active: true },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user || user.role !== claims.role) return next(unauthorized());
    request.auth = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export const requireRoles =
  (...roles: Role[]): RequestHandler =>
  (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) return next(forbidden());
    return next();
  };
