import { randomUUID } from 'node:crypto';
import { Role, type User } from '@prisma/client';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from '../lib/errors.js';

type BaseClaims = JwtPayload & {
  sub: string;
  jti: string;
  exp: number;
};

type AccessClaims = BaseClaims & {
  type: 'access';
  role: Role;
};

type RefreshClaims = BaseClaims & {
  type: 'refresh';
  familyId: string;
};

const commonVerifyOptions: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

export function signAccessToken(user: Pick<User, 'id' | 'role'>): string {
  return jwt.sign({ type: 'access', role: user.role }, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    subject: String(user.id),
    jwtid: randomUUID(),
    expiresIn: Math.floor(env.ACCESS_TOKEN_TTL_MS / 1_000),
  });
}

export function signRefreshToken(userId: number, tokenId: string, familyId: string): string {
  return jwt.sign({ type: 'refresh', familyId }, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    subject: String(userId),
    jwtid: tokenId,
    expiresIn: Math.floor(env.REFRESH_TOKEN_TTL_MS / 1_000),
  });
}

function parseClaims<T extends JwtPayload>(token: string, secret: string, type: string): T {
  try {
    const claims = jwt.verify(token, secret, commonVerifyOptions) as JwtPayload;
    if (
      typeof claims === 'string' ||
      claims.type !== type ||
      !claims.sub ||
      !claims.jti ||
      !Number.isInteger(claims.exp)
    ) {
      throw unauthorized();
    }
    return claims as T;
  } catch {
    throw unauthorized();
  }
}

export const verifyAccessToken = (token: string): AccessClaims => {
  const claims = parseClaims<AccessClaims>(token, env.JWT_ACCESS_SECRET, 'access');
  if (!Object.values(Role).includes(claims.role)) throw unauthorized();
  return claims;
};

export const verifyRefreshToken = (token: string): RefreshClaims => {
  const claims = parseClaims<RefreshClaims>(token, env.JWT_REFRESH_SECRET, 'refresh');
  if (!claims.familyId) throw unauthorized();
  return claims;
};
