import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokens.js';

describe('tokens JWT', () => {
  it('assina e valida access token com papel e subject', () => {
    const claims = verifyAccessToken(signAccessToken({ id: 42, role: Role.seller }));
    expect(claims).toMatchObject({ sub: '42', role: Role.seller, type: 'access' });
    expect(claims.exp).toBeTypeOf('number');
  });

  it('assina e valida refresh token com família e id', () => {
    const claims = verifyRefreshToken(signRefreshToken(7, 'token-id', 'family-id'));
    expect(claims).toMatchObject({
      sub: '7',
      jti: 'token-id',
      familyId: 'family-id',
      type: 'refresh',
    });
  });

  it('não aceita tipo ou assinatura incorreta', () => {
    const access = signAccessToken({ id: 1, role: Role.customer });
    expect(() => verifyRefreshToken(access)).toThrow();
    expect(() => verifyAccessToken(`${access}tampered`)).toThrow();
  });
});
