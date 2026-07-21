import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

const durationPattern = /^\d+(s|m|h|d)$/;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  APP_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  ACCESS_TOKEN_TTL: z.string().regex(durationPattern).default('10m'),
  REFRESH_TOKEN_TTL: z.string().regex(durationPattern).default('7d'),
  COOKIE_SECURE: booleanFromString.default('false'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Configuração inválida. Verifique as variáveis: ${missing}`);
}

function durationToMilliseconds(value: string): number {
  const amount = Number(value.slice(0, -1));
  const unit = value.at(-1);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit ?? ''] ?? 0);
}

export const env = {
  ...parsed.data,
  ACCESS_TOKEN_TTL_MS: durationToMilliseconds(parsed.data.ACCESS_TOKEN_TTL),
  REFRESH_TOKEN_TTL_MS: durationToMilliseconds(parsed.data.REFRESH_TOKEN_TTL),
};
