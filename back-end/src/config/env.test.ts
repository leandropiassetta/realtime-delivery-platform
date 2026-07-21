import { describe, expect, test } from 'vitest';
import { parseEnvironment } from './env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  APP_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'mysql://test:test@localhost:3306/test',
  JWT_ACCESS_SECRET: 'access-secret-with-more-than-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-with-more-than-32-characters',
  JWT_ISSUER: 'test-issuer',
  JWT_AUDIENCE: 'test-audience',
};

describe('configuração segura do ambiente', () => {
  test('exige segredos diferentes para os dois tipos de token', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        JWT_REFRESH_SECRET: validEnvironment.JWT_ACCESS_SECRET,
      }),
    ).toThrow(/JWT_REFRESH_SECRET/);
  });

  test('rejeita cookie inseguro em produção', () => {
    expect(() =>
      parseEnvironment({ ...validEnvironment, NODE_ENV: 'production', COOKIE_SECURE: 'false' }),
    ).toThrow(/COOKIE_SECURE/);
  });

  test('exige origem HTTPS em produção', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
      }),
    ).toThrow(/APP_ORIGIN/);
  });

  test('rejeita segredos locais de demonstração em produção', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        JWT_ACCESS_SECRET: 'local-access-secret-change-before-production-2026',
        JWT_REFRESH_SECRET: 'local-refresh-secret-change-before-production-2026',
      }),
    ).toThrow(/JWT_ACCESS_SECRET, JWT_REFRESH_SECRET/);
  });

  test('aceita produção com HTTPS e segredos próprios', () => {
    const configuration = parseEnvironment({
      ...validEnvironment,
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://delivery.example.com',
      COOKIE_SECURE: 'true',
    });

    expect(configuration.COOKIE_SECURE).toBe(true);
  });
});
