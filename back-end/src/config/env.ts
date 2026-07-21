import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

const durationPattern = /^\d+(s|m|h|d)$/;

const localOnlySecrets = new Set([
  'local-access-secret-change-before-production-2026',
  'local-refresh-secret-change-before-production-2026',
]);

const schema = z
  .object({
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
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .superRefine((configuration, context) => {
    if (configuration.JWT_ACCESS_SECRET === configuration.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'Use segredos diferentes para access e refresh tokens.',
      });
    }

    if (configuration.NODE_ENV !== 'production') return;

    if (!configuration.COOKIE_SECURE) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE deve ser true em produção.',
      });
    }

    if (new URL(configuration.APP_ORIGIN).protocol !== 'https:') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['APP_ORIGIN'],
        message: 'APP_ORIGIN deve usar HTTPS em produção.',
      });
    }

    for (const field of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (localOnlySecrets.has(configuration[field])) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'O segredo local de demonstração não pode ser usado em produção.',
        });
      }
    }
  });

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

export function parseEnvironment(input: NodeJS.ProcessEnv) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const invalid = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Configuração inválida. Verifique as variáveis: ${invalid}`);
  }

  return {
    ...parsed.data,
    ACCESS_TOKEN_TTL_MS: durationToMilliseconds(parsed.data.ACCESS_TOKEN_TTL),
    REFRESH_TOKEN_TTL_MS: durationToMilliseconds(parsed.data.REFRESH_TOKEN_TTL),
  };
}

export const env = parseEnvironment(process.env);
