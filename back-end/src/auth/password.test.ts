import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('gera Argon2id e valida somente a senha correta', async () => {
    const hash = await hashPassword('SecureLocalPassword!');
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'SecureLocalPassword!')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('usa salt aleatório', async () => {
    const first = await hashPassword('SecureLocalPassword!');
    const second = await hashPassword('SecureLocalPassword!');
    expect(first).not.toBe(second);
  });
});
