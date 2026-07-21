import { randomUUID } from 'node:crypto';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';
import { sha256 } from '../lib/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './tokens.js';

type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'active'>;

export type SessionResult = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

const expirationFromClaims = (exp?: number): Date => {
  if (!exp) throw unauthorized();
  return new Date(exp * 1_000);
};

export async function createSession(
  user: SessionUser,
  familyId = randomUUID(),
): Promise<SessionResult> {
  const tokenId = randomUUID();
  const refreshToken = signRefreshToken(user.id, tokenId, familyId);
  const claims = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: expirationFromClaims(claims.exp),
    },
  });

  return { user, accessToken: signAccessToken(user), refreshToken };
}

export async function rotateSession(rawToken: string): Promise<SessionResult> {
  const claims = verifyRefreshToken(rawToken);
  const current = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { user: true },
  });

  if (!current || current.id !== claims.jti || current.userId !== Number(claims.sub)) {
    throw unauthorized();
  }

  if (current.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized('REFRESH_TOKEN_REUSE', 'Reutilização de sessão detectada. Entre novamente.');
  }

  if (!current.user.active || current.expiresAt <= new Date()) throw unauthorized();

  const nextId = randomUUID();
  const nextToken = signRefreshToken(current.userId, nextId, current.familyId);
  const nextClaims = verifyRefreshToken(nextToken);

  await prisma.$transaction(async (transaction) => {
    const revoked = await transaction.refreshToken.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date(), replacedById: nextId },
    });
    if (revoked.count !== 1) throw unauthorized();

    await transaction.refreshToken.create({
      data: {
        id: nextId,
        userId: current.userId,
        familyId: current.familyId,
        tokenHash: sha256(nextToken),
        expiresAt: expirationFromClaims(nextClaims.exp),
      },
    });
  });

  const user: SessionUser = {
    id: current.user.id,
    name: current.user.name,
    email: current.user.email,
    role: current.user.role,
    active: current.user.active,
  };
  return { user, accessToken: signAccessToken(user), refreshToken: nextToken };
}

export async function revokeSession(rawToken?: string): Promise<void> {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
